export type RubyMarshalValue =
  | null
  | boolean
  | number
  | string
  | RubyMarshalBytes
  | RubySymbol
  | RubyMarshalArray
  | RubyMarshalHash
  | RubyMarshalObject;

export interface RubyMarshalBytes {
  type: 'bytes';
  bytes: Uint8Array;
  ivars: Map<string, RubyMarshalValue>;
}

export interface RubySymbol {
  type: 'symbol';
  name: string;
}

export interface RubyMarshalArray {
  type: 'array';
  items: RubyMarshalValue[];
}

export interface RubyMarshalHash {
  type: 'hash';
  entries: RubyMarshalHashEntry[];
}

export interface RubyMarshalHashEntry {
  key: RubyMarshalValue;
  value: RubyMarshalValue;
}

export interface RubyMarshalObject {
  type: 'object';
  className: string;
  ivars: Map<string, RubyMarshalValue>;
  marshalData?: Uint8Array;
}

export class RubyMarshalError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(`${message} at offset ${offset}`);
    this.name = 'RubyMarshalError';
  }
}

const MARSHAL_MAJOR_VERSION = 4;
const MARSHAL_MINOR_VERSION = 8;
const textDecoder = new TextDecoder();

export interface ParseRubyMarshalOptions {
  stringMode?: 'text' | 'bytes';
}

export const parseRubyMarshal = (data: Uint8Array, options: ParseRubyMarshalOptions = {}): RubyMarshalValue => {
  const reader = new RubyMarshalReader(data, options);
  const value = reader.readDocument();
  reader.assertEnd();
  return value;
};

export const isRubyObject = (value: unknown): value is RubyMarshalObject => {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'object';
};

export const isRubyArray = (value: unknown): value is RubyMarshalArray => {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'array';
};

export const isRubyHash = (value: unknown): value is RubyMarshalHash => {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'hash';
};

export const isRubySymbol = (value: unknown): value is RubySymbol => {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'symbol';
};

export const isRubyBytes = (value: unknown): value is RubyMarshalBytes => {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'bytes';
};

export const getRubyIvar = (object: RubyMarshalObject, name: string) => {
  return object.ivars.get(name);
};

class RubyMarshalReader {
  private offset = 0;
  private readonly symbols: string[] = [];
  private readonly objects: RubyMarshalValue[] = [];

  constructor(
    private readonly data: Uint8Array,
    private readonly options: ParseRubyMarshalOptions,
  ) {}

  readDocument() {
    const major = this.readByte();
    const minor = this.readByte();

    if (major !== MARSHAL_MAJOR_VERSION || minor !== MARSHAL_MINOR_VERSION) {
      this.fail(`unsupported Ruby Marshal version ${major}.${minor}`);
    }

    return this.readValue();
  }

  assertEnd() {
    if (this.offset !== this.data.length) {
      this.fail(`unexpected trailing data (${this.data.length - this.offset} bytes)`);
    }
  }

  private readValue(): RubyMarshalValue {
    const tag = this.readByte();

    switch (tag) {
      case 0x30:
        return null;
      case 0x54:
        return true;
      case 0x46:
        return false;
      case 0x69:
        return this.readInteger();
      case 0x66:
        return this.readFloat();
      case 0x22:
        return this.readString();
      case 0x49:
        return this.readIvarWrappedValue();
      case 0x3a:
        return this.readSymbol();
      case 0x3b:
        return this.readSymbolLink();
      case 0x5b:
        return this.readArray();
      case 0x7b:
        return this.readHash();
      case 0x6f:
        return this.readObject();
      case 0x75:
        return this.readUserDefinedObject();
      case 0x40:
        return this.readObjectLink();
      default:
        this.fail(`unsupported Ruby Marshal tag ${formatTag(tag)}`);
    }
  }

  private readInteger() {
    return this.readLong();
  }

  private readFloat() {
    const value = this.readRawString();
    const parsed =
      value === 'nan'
        ? Number.NaN
        : value === 'inf'
          ? Number.POSITIVE_INFINITY
          : value === '-inf'
            ? Number.NEGATIVE_INFINITY
            : Number.parseFloat(value);
    this.objects.push(parsed);
    return parsed;
  }

  private readString() {
    const bytes = this.readRawBytes();
    if (this.options.stringMode === 'bytes') {
      const value: RubyMarshalBytes = {
        type: 'bytes',
        bytes,
        ivars: new Map(),
      };
      this.objects.push(value);
      return value;
    }

    const value = textDecoder.decode(bytes);
    this.objects.push(value);
    return value;
  }

  private readIvarWrappedValue() {
    const value = this.readValue();
    const count = this.readLong();

    for (let index = 0; index < count; index += 1) {
      const key = this.readSymbolName();
      const ivarValue = this.readValue();
      if (isRubyObject(value)) {
        value.ivars.set(key, ivarValue);
      } else if (isRubyBytes(value)) {
        value.ivars.set(key, ivarValue);
      }
    }

    return value;
  }

  private readSymbol(): RubySymbol {
    const name = this.readRawString();
    this.symbols.push(name);
    return {
      type: 'symbol',
      name,
    };
  }

  private readSymbolLink(): RubySymbol {
    const index = this.readLong();
    const name = this.symbols[index];
    if (name === undefined) {
      this.fail(`invalid Ruby Marshal symbol link ${index}`);
    }

    return {
      type: 'symbol',
      name,
    };
  }

  private readSymbolName() {
    return this.readSymbolLike().name;
  }

  private readSymbolLike() {
    const value = this.readValue();
    if (!isRubySymbol(value)) {
      this.fail('expected Ruby Marshal symbol');
    }

    return value;
  }

  private readArray(): RubyMarshalArray {
    const value: RubyMarshalArray = {
      type: 'array',
      items: [],
    };
    this.objects.push(value);

    const count = this.readLong();
    for (let index = 0; index < count; index += 1) {
      value.items.push(this.readValue());
    }

    return value;
  }

  private readHash(): RubyMarshalHash {
    const value: RubyMarshalHash = {
      type: 'hash',
      entries: [],
    };
    this.objects.push(value);

    const count = this.readLong();
    for (let index = 0; index < count; index += 1) {
      value.entries.push({
        key: this.readValue(),
        value: this.readValue(),
      });
    }

    return value;
  }

  private readObject(): RubyMarshalObject {
    const className = this.readSymbolName();
    const object: RubyMarshalObject = {
      type: 'object',
      className,
      ivars: new Map(),
    };
    this.objects.push(object);

    const count = this.readLong();
    for (let index = 0; index < count; index += 1) {
      object.ivars.set(this.readSymbolName(), this.readValue());
    }

    return object;
  }

  private readUserDefinedObject(): RubyMarshalObject {
    const className = this.readSymbolName();
    const object: RubyMarshalObject = {
      type: 'object',
      className,
      ivars: new Map(),
      marshalData: this.readRawBytes(),
    };
    this.objects.push(object);
    return object;
  }

  private readObjectLink() {
    const index = this.readLong();
    const value = this.objects[index];
    if (value === undefined) {
      this.fail(`invalid Ruby Marshal object link ${index}`);
    }

    return value;
  }

  private readRawString() {
    return textDecoder.decode(this.readRawBytes());
  }

  private readRawBytes() {
    const length = this.readLong();
    if (length < 0) {
      this.fail(`invalid negative string length ${length}`);
    }

    return this.readBytes(length).slice();
  }

  private readLong() {
    const first = this.readSignedByte();
    if (first === 0) return 0;
    if (first > 5) return first - 5;
    if (first < -4) return first + 5;

    const length = Math.abs(first);
    let value = 0;
    for (let index = 0; index < length; index += 1) {
      value |= this.readByte() << (index * 8);
    }

    if (first > 0) return value;

    for (let index = length; index < 4; index += 1) {
      value |= 0xff << (index * 8);
    }

    return value | 0;
  }

  private readBytes(length: number) {
    this.ensureAvailable(length);
    const start = this.offset;
    this.offset += length;
    return this.data.subarray(start, this.offset);
  }

  private readByte() {
    this.ensureAvailable(1);
    const value = this.data[this.offset];
    this.offset += 1;
    return value;
  }

  private readSignedByte() {
    const value = this.readByte();
    return value > 127 ? value - 256 : value;
  }

  private ensureAvailable(length: number) {
    if (this.offset + length > this.data.length) {
      this.fail(`unexpected end of Ruby Marshal data while reading ${length} bytes`);
    }
  }

  private fail(message: string): never {
    throw new RubyMarshalError(message, this.offset);
  }
}

const formatTag = (tag: number) => {
  const character = tag >= 0x20 && tag <= 0x7e ? ` '${String.fromCharCode(tag)}'` : '';
  return `0x${tag.toString(16).padStart(2, '0')}${character}`;
};
