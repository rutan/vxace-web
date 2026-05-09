declare module '@ruby/4.0-wasm-wasi' {
  export class RubyVM {
    initialize(args?: string[]): void;
    setInstance(instance: WebAssembly.Instance): Promise<void>;
    addToImports(imports: WebAssembly.Imports): void;
    printVersion(): void;
    eval(code: string): RbValue;
    evalAsync(code: string): Promise<RbValue>;
    wrap(value: any): RbValue;
  }

  export class RbValue {
    call(callee: string, ...args: RbValue[]): RbValue;
    toString(): string;
    toJS(): any;
  }
}

declare module '@ruby/4.0-wasm-wasi/dist/browser' {
  import type { RubyVM } from '@ruby/4.0-wasm-wasi';

  export function DefaultRubyVM(
    rubyModule: WebAssembly.Module,
    options?: {
      consolePrint?: boolean;
      env?: Record<string, string>;
    },
  ): Promise<{
    vm: RubyVM;
    wasi: unknown;
    instance: WebAssembly.Instance;
  }>;
}
