import { describe, expect, test } from 'vitest';
import {
  RubyMarshalError,
  isRubyArray,
  isRubyBytes,
  isRubyHash,
  isRubyObject,
  isRubySymbol,
  parseRubyMarshal,
  type RubyMarshalArray,
  type RubyMarshalHash,
  type RubyMarshalObject,
  type RubyMarshalValue,
} from '../../src/internal/rubyMarshal';

describe('parseRubyMarshal', () => {
  test('reads primitive values, symbols, arrays, hashes, and VX Ace-like objects', () => {
    const root = expectRubyArray(
      parseRubyMarshal(
        fromBase64(
          'BAhbEjBURmkAaQF7ae9mCDMuNUkiCXRleHQGOgZFVDoIc3ltOwZbB0kiC2xpbmtlZAY7AFRJIgtsaW5rZWQGOwBUewZJIghrZXkGOwBUbzoPUlBHOjpBY3Rvcgc6FEBjaGFyYWN0ZXJfbmFtZUkiCUhlcm8GOwBUOg9AZmFjZV9uYW1lSSILQWN0b3IxBjsAVG86FlJQRzo6RXZlbnRDb21tYW5kBzoKQGNvZGVpajoQQHBhcmFtZXRlcnNbCUkiCUZhY2UGOwBUaQBpAGkA',
        ),
      ),
    );

    expect(root.items.slice(0, 9)).toEqual([
      null,
      true,
      false,
      0,
      123,
      -12,
      3.5,
      'text',
      { type: 'symbol', name: 'sym' },
    ]);
    expectRubySymbol(root.items[9], 'sym');

    const linkedStrings = expectRubyArray(root.items[10]);
    expect(linkedStrings.items).toEqual(['linked', 'linked']);

    const hash = expectRubyHash(root.items[11]);
    expect(hash.entries).toHaveLength(1);
    expect(hash.entries[0]?.key).toBe('key');

    const actor = expectRubyObject(hash.entries[0]?.value);
    expect(actor.className).toBe('RPG::Actor');
    expect(actor.ivars.get('@character_name')).toBe('Hero');
    expect(actor.ivars.get('@face_name')).toBe('Actor1');

    const command = expectRubyObject(root.items[12]);
    expect(command.className).toBe('RPG::EventCommand');
    expect(command.ivars.get('@code')).toBe(101);
    expect(expectRubyArray(command.ivars.get('@parameters')).items).toEqual(['Face', 0, 0, 0]);
  });

  test('preserves object links', () => {
    const root = expectRubyArray(
      parseRubyMarshal(fromBase64('BAhbB286D1JQRzo6QWN0b3IGOhRAY2hhcmFjdGVyX25hbWVJIglIZXJvBjoGRVRABg==')),
    );

    expect(root.items).toHaveLength(2);
    expect(root.items[1]).toBe(root.items[0]);
  });

  test('preserves float object links', () => {
    const root = expectRubyArray(
      parseRubyMarshal(Uint8Array.from([4, 8, 0x5b, 7, 0x66, 9, 0x30, 0x2e, 0x39, 0x35, 0x40, 6])),
    );

    expect(root.items).toEqual([0.95, 0.95]);
  });

  test('reads user-defined dumped objects such as VX Ace Table, Color, and Tone payloads', () => {
    const color = expectRubyObject(
      parseRubyMarshal(fromBase64('BAh1OgpDb2xvciUAAAAAAADwPwAAAAAAAABAAAAAAAAACEAAAAAAAAAQQA==')),
    );

    expect(color.className).toBe('Color');
    expect(color.ivars.size).toBe(0);
    expect(color.marshalData).toBeInstanceOf(Uint8Array);
    expect(color.marshalData).toHaveLength(32);
  });

  test('can preserve Ruby String payloads as raw bytes for binary rvdata2 entries', () => {
    const root = expectRubyArray(
      parseRubyMarshal(
        Uint8Array.from([4, 8, 0x5b, 7, 0x49, 0x22, 8, 0x61, 0x62, 0x63, 6, 0x3a, 6, 0x45, 0x54, 0x40, 6]),
        {
          stringMode: 'bytes',
        },
      ),
    );
    const value = root.items[0];

    expect(isRubyBytes(value)).toBe(true);
    if (!isRubyBytes(value)) return;

    expect([...value.bytes]).toEqual([0x61, 0x62, 0x63]);
    expect(value.ivars.get('E')).toBe(true);
    expect(root.items[1]).toBe(value);
  });

  test('throws a readable error for unsupported tags', () => {
    expect(() => parseRubyMarshal(Uint8Array.from([4, 8, 'x'.charCodeAt(0)]))).toThrow(RubyMarshalError);
    expect(() => parseRubyMarshal(Uint8Array.from([4, 8, 'x'.charCodeAt(0)]))).toThrow(
      "unsupported Ruby Marshal tag 0x78 'x'",
    );
  });

  test('throws a readable error for invalid links and versions', () => {
    expect(() => parseRubyMarshal(Uint8Array.from([4, 8, '@'.charCodeAt(0), 6]))).toThrow(
      'invalid Ruby Marshal object link 1',
    );
    expect(() => parseRubyMarshal(Uint8Array.from([4, 7, '0'.charCodeAt(0)]))).toThrow(
      'unsupported Ruby Marshal version 4.7',
    );
  });
});

const fromBase64 = (value: string) => {
  return Buffer.from(value, 'base64');
};

const expectRubyArray = (value: RubyMarshalValue | undefined): RubyMarshalArray => {
  expect(isRubyArray(value)).toBe(true);
  return value as RubyMarshalArray;
};

const expectRubyHash = (value: RubyMarshalValue | undefined): RubyMarshalHash => {
  expect(isRubyHash(value)).toBe(true);
  return value as RubyMarshalHash;
};

const expectRubyObject = (value: RubyMarshalValue | undefined): RubyMarshalObject => {
  expect(isRubyObject(value)).toBe(true);
  return value as RubyMarshalObject;
};

const expectRubySymbol = (value: RubyMarshalValue | undefined, name: string) => {
  expect(isRubySymbol(value)).toBe(true);
  expect(value).toEqual({
    type: 'symbol',
    name,
  });
};
