declare module "ssh2" {
  import type { EventEmitter } from "node:events";
  import type { Readable, Writable } from "node:stream";

  export type ConnectConfig = {
    host: string;
    port?: number;
    username: string;
    privateKey: string | Buffer;
    readyTimeout?: number;
    hostHash?: "sha1" | "sha256" | "md5";
    hostVerifier?: (hashedKey: string) => boolean;
    tryKeyboard?: boolean;
    agent?: never;
    password?: never;
  };

  export type ClientChannel = EventEmitter &
    Readable &
    Writable & {
      stderr: Readable;
      close(): void;
    };

  export class Client extends EventEmitter {
    connect(config: ConnectConfig): this;
    exec(
      command: string,
      options: { pty?: false; x11?: false; env?: Record<string, never> },
      callback: (err: Error | undefined, channel: ClientChannel) => void
    ): void;
    end(): void;
    destroy(): void;
  }
}
