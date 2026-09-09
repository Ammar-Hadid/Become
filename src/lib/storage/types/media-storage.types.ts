export interface MediaStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
