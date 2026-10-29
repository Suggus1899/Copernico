export interface SignedUrlOptions { expiresIn?: number; downloadName?: string }
export interface Storage {
 upload(key: string, body: Uint8Array, contentType: string): Promise<void>;
 createSignedUrl(key: string, options?: SignedUrlOptions): Promise<string>;
 remove(keys: string[]): Promise<void>;
}
