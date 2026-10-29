export interface UserDocument {
  _id: string; name: string; mimeType: string; size: number; tags: string[]; uploadedAt: string;
}
export interface DocumentsData { documents: UserDocument[] }
export interface AvatarData { avatar: string | null }
