declare module "openssl-browser" {
  interface FileResult {
    uint8?: Uint8Array;
    error?: string;
  }

  interface WriteResult {
    ok?: boolean;
    error?: string;
  }

  interface OpenSSLInstance {
    run(...args: string[]): Promise<unknown>;

    writefile: {
      uint8(
        name: string,
        value: Uint8Array
      ): Promise<WriteResult>;
    };

    readfile: {
      uint8(name: string): FileResult;
    };
  }

  interface OpenSSLModule {
    (params?: {
      echo?: boolean;
      df?: boolean;
    }): OpenSSLInstance;
  }

  export const opensslmod: OpenSSLModule;
}