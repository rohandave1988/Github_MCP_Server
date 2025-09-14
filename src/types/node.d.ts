// Node.js global type declarations
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      GITHUB_TOKEN?: string;
      GITHUB_BASE_URL?: string;
      GITHUB_TIMEOUT?: string;
      GITHUB_RETRY_ATTEMPTS?: string;
      SERVER_NAME?: string;
      SERVER_VERSION?: string;
      LOG_LEVEL?: string;
      MAX_SEARCH_RESULTS?: string;
      MAX_FILES_PER_PR?: string;
      MAX_COMMITS_PER_PR?: string;
    }

    interface Process {
      env: ProcessEnv;
      exit(code?: number): never;
      on(event: string, listener: (...args: any[]) => void): this;
      uptime(): number;
      version: string;
      pid: number;
    }

    interface Global {
      process: Process;
      console: Console;
      require: NodeRequire;
      Buffer: BufferConstructor;
      __dirname: string;
      __filename: string;
      setTimeout: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timeout;
      clearTimeout: (timeoutId: NodeJS.Timeout) => void;
    }

    interface Timeout {}
  }

  interface Console {
    log(...data: any[]): void;
    error(...data: any[]): void;
    warn(...data: any[]): void;
    info(...data: any[]): void;
    debug(...data: any[]): void;
  }

  interface BufferConstructor {
    from(str: string, encoding?: BufferEncoding): Buffer;
  }

  interface Buffer {
    toString(encoding?: BufferEncoding): string;
  }

  type BufferEncoding = 'ascii' | 'utf8' | 'utf16le' | 'ucs2' | 'base64' | 'latin1' | 'binary' | 'hex';

  interface NodeRequire {
    main?: NodeModule;
  }

  interface NodeModule {
    filename: string;
  }

  const process: NodeJS.Process;
  const console: Console;
  const require: NodeRequire;
  const Buffer: BufferConstructor;
  const __dirname: string;
  const __filename: string;
  const setTimeout: (callback: (...args: any[]) => void, ms: number, ...args: any[]) => NodeJS.Timeout;
  const clearTimeout: (timeoutId: NodeJS.Timeout) => void;
}

export {};