import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Role } from '../backend';
import { toast } from 'sonner';
import { clearChunkCache, clearFileMetadataCache } from '../utils/chunkCache';

// ── Auth ──────────────────────────────────────────────────────────────────────

export function useLogin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.login(username, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });
}

export function useLogout() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.logout(token);
    },
    onSuccess: () => {
      // Clear all caches on logout
      clearChunkCache();
      clearFileMetadataCache();
      queryClient.clear();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Logout failed');
    },
  });
}

export function useRegisterUser() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.registerUser(username, password);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed');
    },
  });
}

export function useGetMe(token: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['me', token],
    queryFn: async () => {
      if (!actor || !token) throw new Error('Not available');
      return actor.getMe(token);
    },
    enabled: !!actor && !isFetching && !!token,
    retry: false,
    staleTime: 60_000, // 1 minute
  });
}

export function useValidateSession(token: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['session', token],
    queryFn: async () => {
      if (!actor || !token) throw new Error('Not available');
      return actor.validateSession(token);
    },
    enabled: !!actor && !isFetching && !!token,
    retry: false,
    staleTime: 120_000, // 2 minutes — session validation rarely changes
  });
}

// ── Files ─────────────────────────────────────────────────────────────────────

export function useListFiles(token: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['files', token],
    queryFn: async () => {
      if (!actor || !token) return [];
      return actor.listFiles(token);
    },
    enabled: !!actor && !isFetching && !!token,
    staleTime: 60_000,       // serve from cache for 60 s; revalidate silently in background
    gcTime: 5 * 60_000,      // keep in memory for 5 minutes after last use
    refetchOnWindowFocus: true,
  });
}

export function useDeleteFile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, fileId }: { token: string; fileId: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteFile(token, fileId);
    },
    onSuccess: (_, { token, fileId }) => {
      // Evict cached download blob for this file
      clearChunkCache();
      queryClient.invalidateQueries({ queryKey: ['files', token] });
      queryClient.invalidateQueries({ queryKey: ['me', token] });
      queryClient.invalidateQueries({ queryKey: ['myStorageStats', token] });
      toast.success('File deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete file');
    },
  });
}

export function useGenerateShareLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, fileId }: { token: string; fileId: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.generateShareLink(token, fileId);
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ['files', token] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate share link');
    },
  });
}

export function useDownloadFile() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      token,
      fileId,
      shareToken,
    }: {
      token?: string;
      fileId: number;
      shareToken?: string;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.downloadFile(fileId, token ?? null, shareToken ?? null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to download file');
    },
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export function useListUsers(token: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['users', token],
    queryFn: async () => {
      if (!actor || !token) return [];
      return actor.listUsers(token);
    },
    enabled: !!actor && !isFetching && !!token,
    staleTime: 60_000,
  });
}

export function useCreateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      username,
      password,
      role,
    }: {
      token: string;
      username: string;
      password: string;
      role: Role;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createUser(token, username, password, role);
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ['users', token] });
      toast.success('User created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });
}

export function useDeleteUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, userId }: { token: string; userId: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteUser(token, userId);
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ['users', token] });
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });
}

export function useUpdateUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      userId,
      role,
    }: {
      token: string;
      userId: number;
      role: Role;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateUserRole(token, userId, role);
    },
    onSuccess: (_, { token }) => {
      queryClient.invalidateQueries({ queryKey: ['users', token] });
      toast.success('User role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user role');
    },
  });
}

export function useUpdateUserGbLimit() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      userId,
      gbLimit,
    }: {
      token: string;
      userId: number;
      gbLimit: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateUserGbLimit(token, userId, gbLimit);
    },
    onSuccess: (_, { token, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['users', token] });
      queryClient.invalidateQueries({ queryKey: ['userStorageStats', token, userId] });
      toast.success('Storage limit updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update storage limit');
    },
  });
}

export function useGetUserStorageStats(token: string | null, userId: number | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['userStorageStats', token, userId],
    queryFn: async () => {
      if (!actor || !token || userId === null) throw new Error('Not available');
      return actor.getUserStorageStats(token, userId);
    },
    enabled: !!actor && !isFetching && !!token && userId !== null,
    staleTime: 60_000,
  });
}

export function useGetMyStorageStats(token: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['myStorageStats', token],
    queryFn: async () => {
      if (!actor || !token) throw new Error('Not available');
      return actor.getMyStorageStats(token);
    },
    enabled: !!actor && !isFetching && !!token,
    staleTime: 30_000, // refresh storage stats every 30 s
  });
}
