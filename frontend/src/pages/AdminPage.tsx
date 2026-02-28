import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useListUsers,
  useCreateUser,
  useDeleteUser,
  useUpdateUserGbLimit,
  useUpdateUserRole,
  useGetUserStorageStats,
} from '../hooks/useQueries';
import { Role } from '../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, Trash2, Eye, ArrowLeft, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPageProps {
  token: string;
  role: string;
  username: string;
}

// Helper to format bytes
function formatBytes(bytes: bigint | number): string {
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (n === 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Client Profile View Component
function ClientProfile({
  token,
  userId,
  username,
  onBack,
}: {
  token: string;
  userId: number;
  username: string;
  onBack: () => void;
}) {
  const { data: storageStats, isLoading: statsLoading } = useGetUserStorageStats(token, userId);

  const usedBytes = storageStats ? Number(storageStats.usedBytes) : 0;
  const gbAllocation = storageStats ? Number(storageStats.gbAllocation) : 0;
  // Use actual quota bytes for accurate percentage
  const quotaBytes = storageStats ? Number(storageStats.quota) : gbAllocation * 1_000_000_000;
  const usagePercent = quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-foreground">{username}</h2>
          <p className="text-sm text-muted-foreground">Client Profile</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading storage stats...
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used</span>
                <span className="font-medium">
                  {formatBytes(usedBytes)} / {gbAllocation > 0 ? `${gbAllocation} GB` : '—'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{usagePercent.toFixed(1)}% used</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage({ token, role, username }: AdminPageProps) {
  const navigate = useNavigate();
  const { data: users, isLoading: usersLoading } = useListUsers(token);
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const updateGbLimit = useUpdateUserGbLimit();
  const updateUserRole = useUpdateUserRole();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.Client);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingGbUserId, setEditingGbUserId] = useState<number | null>(null);
  const [editingGbValue, setEditingGbValue] = useState('');
  const [viewingClientId, setViewingClientId] = useState<number | null>(null);
  const [viewingClientUsername, setViewingClientUsername] = useState('');
  const [changingRoleUserId, setChangingRoleUserId] = useState<number | null>(null);

  // Redirect Client role users to dashboard
  React.useEffect(() => {
    if (role === 'Client') {
      navigate({ to: '/dashboard' });
    }
  }, [role, navigate]);

  const isMaster = role === 'Master';

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error('Username and password are required');
      return;
    }
    await createUser.mutateAsync({ token, username: newUsername, password: newPassword, role: newRole });
    setShowCreateDialog(false);
    setNewUsername('');
    setNewPassword('');
    setNewRole(Role.Client);
  };

  const handleDeleteUser = async (userId: number) => {
    await deleteUser.mutateAsync({ token, userId });
    setDeleteConfirmId(null);
  };

  const handleSaveGbLimit = async (userId: number) => {
    const gb = parseInt(editingGbValue, 10);
    if (isNaN(gb) || gb < 1) {
      toast.error('Please enter a valid GB value (minimum 1)');
      return;
    }
    await updateGbLimit.mutateAsync({ token, userId, gbLimit: BigInt(gb) });
    setEditingGbUserId(null);
    setEditingGbValue('');
  };

  const handleChangeRole = async (userId: number, newRoleValue: Role) => {
    setChangingRoleUserId(userId);
    try {
      await updateUserRole.mutateAsync({ token, userId, role: newRoleValue });
    } finally {
      setChangingRoleUserId(null);
    }
  };

  const getRoleBadgeVariant = (userRole: Role) => {
    switch (userRole) {
      case Role.Master:
        return 'default';
      case Role.Staff:
        return 'secondary';
      case Role.Client:
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (viewingClientId !== null) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <img
              src="/assets/generated/luidfiles-logo.dim_400x120.png"
              alt="LuidFiles"
              className="h-8 object-contain"
            />
            <span className="text-sm text-muted-foreground">{username}</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">
          <ClientProfile
            token={token}
            userId={viewingClientId}
            username={viewingClientUsername}
            onBack={() => {
              setViewingClientId(null);
              setViewingClientUsername('');
            }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src="/assets/generated/luidfiles-logo.dim_400x120.png"
            alt="LuidFiles"
            className="h-8 object-contain"
          />
          <div className="flex items-center gap-3">
            <Badge variant={isMaster ? 'default' : 'secondary'}>{role}</Badge>
            <span className="text-sm text-muted-foreground">{username}</span>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/dashboard' })}>
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users and storage</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            New User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>GB Limit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {/* Master can change roles of non-Master users */}
                        {isMaster && user.role !== Role.Master ? (
                          <Select
                            value={user.role}
                            onValueChange={(v) => handleChangeRole(user.id, v as Role)}
                            disabled={changingRoleUserId === user.id}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              {changingRoleUserId === user.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={Role.Client}>Client</SelectItem>
                              <SelectItem value={Role.Staff}>Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBytes(user.usedBytes)} /{' '}
                        {Number(user.gbAllocation) > 0 ? `${user.gbAllocation} GB` : '—'}
                      </TableCell>
                      <TableCell>
                        {user.role === Role.Client &&
                          (editingGbUserId === user.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={editingGbValue}
                                onChange={(e) => setEditingGbValue(e.target.value)}
                                className="w-20 h-7 text-sm"
                                min="1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleSaveGbLimit(user.id)}
                                disabled={updateGbLimit.isPending}
                              >
                                {updateGbLimit.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Save'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => setEditingGbUserId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setEditingGbUserId(user.id);
                                setEditingGbValue(user.gbAllocation.toString());
                              }}
                            >
                              <HardDrive className="h-3 w-3" />
                              {Number(user.gbAllocation)} GB
                            </Button>
                          ))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role === Role.Client && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setViewingClientId(user.id);
                                setViewingClientUsername(user.username);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Master can delete Staff and Client; Staff can only delete Client */}
                          {user.role !== Role.Master &&
                            (isMaster || user.role === Role.Client) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            {isMaster && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Role</label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.Client}>Client</SelectItem>
                    <SelectItem value={Role.Staff}>Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={createUser.isPending}>
              {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will
              permanently remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId !== null && handleDeleteUser(deleteConfirmId)}
            >
              {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
