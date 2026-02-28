import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type UserId = number;
export type Chunk = Uint8Array;
export type SessionToken = string;
export interface File {
    status: UploadStatus;
    created: bigint;
    owner: UserId;
    shareToken?: string;
    mimeType: string;
    totalSize: bigint;
    filename: string;
    fileId: FileId;
    totalChunks: bigint;
}
export type FileId = number;
export interface UserProfile {
    id: UserId;
    username: string;
    role: Role;
    quota: bigint;
    gbAllocation: bigint;
    usedBytes: bigint;
}
export enum Role {
    Staff = "Staff",
    Client = "Client",
    Master = "Master"
}
export enum UploadStatus {
    Complete = "Complete",
    Pending = "Pending"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createUser(token: SessionToken, username: string, password: string, role: Role): Promise<UserId>;
    deleteFile(token: SessionToken, fileId: FileId): Promise<void>;
    deleteUser(token: SessionToken, userId: UserId): Promise<void>;
    downloadFile(fileId: FileId, token: SessionToken | null, shareToken: string | null): Promise<{
        data: Uint8Array;
        mimeType: string;
        filename: string;
    }>;
    finalizeUpload(token: SessionToken, fileId: FileId): Promise<void>;
    generateShareLink(token: SessionToken, fileId: FileId): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMe(token: SessionToken): Promise<UserProfile>;
    getMyStorageStats(token: SessionToken): Promise<{
        quota: bigint;
        gbAllocation: bigint;
        usedBytes: bigint;
    }>;
    getUserProfile(_user: Principal): Promise<UserProfile | null>;
    getUserStorageStats(token: SessionToken, userId: UserId): Promise<{
        quota: bigint;
        gbAllocation: bigint;
        usedBytes: bigint;
    }>;
    initUpload(token: SessionToken, filename: string, mimeType: string, totalSize: bigint, totalChunks: bigint): Promise<FileId>;
    isCallerAdmin(): Promise<boolean>;
    listFiles(token: SessionToken): Promise<Array<File>>;
    listUsers(token: SessionToken): Promise<Array<UserProfile>>;
    login(username: string, password: string): Promise<SessionToken>;
    logout(token: SessionToken): Promise<void>;
    registerUser(username: string, password: string): Promise<UserId>;
    saveCallerUserProfile(_profile: UserProfile): Promise<void>;
    updateUserGbLimit(token: SessionToken, userId: UserId, gbLimit: bigint): Promise<void>;
    updateUserRole(token: SessionToken, userId: UserId, role: Role): Promise<void>;
    uploadChunk(token: SessionToken, fileId: FileId, chunkIndex: bigint, chunkData: Chunk): Promise<bigint>;
    validateSession(token: SessionToken): Promise<{
        username: string;
        role: Role;
    }>;
}
