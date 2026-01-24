import { useState } from 'react';
import { 
  Users, 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { toast } from 'sonner';
import type { User } from '@/types';

const roleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-destructive text-destructive-foreground' },
  qa_lead: { label: 'QA Lead', color: 'bg-primary text-primary-foreground' },
  tester: { label: 'Tester', color: 'bg-secondary text-secondary-foreground' },
  viewer: { label: 'Viewer', color: 'bg-muted text-muted-foreground' },
};

interface UserWithStatus extends User {
  isActive: boolean;
}

const initialUsers: UserWithStatus[] = [
  { id: '1', email: 'john@testflow.io', name: 'John Doe', role: 'admin', organizationId: '1', isActive: true },
  { id: '2', email: 'jane@testflow.io', name: 'Jane Smith', role: 'qa_lead', organizationId: '1', isActive: true },
  { id: '3', email: 'bob@testflow.io', name: 'Bob Wilson', role: 'tester', organizationId: '1', isActive: true },
  { id: '4', email: 'alice@testflow.io', name: 'Alice Brown', role: 'tester', organizationId: '1', isActive: false },
];

export const UserManagement = () => {
  const [users, setUsers] = useState<UserWithStatus[]>(initialUsers);
  const [userDialog, setUserDialog] = useState<{ open: boolean; user: UserWithStatus | null }>({
    open: false,
    user: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserWithStatus | null }>({
    open: false,
    user: null,
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'tester' as User['role'],
    isActive: true,
  });

  const openAddDialog = () => {
    setFormData({ name: '', email: '', role: 'tester', isActive: true });
    setUserDialog({ open: true, user: null });
  };

  const openEditDialog = (user: UserWithStatus) => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setUserDialog({ open: true, user });
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (userDialog.user) {
      // Edit existing user
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userDialog.user!.id
            ? { ...u, name: formData.name, email: formData.email, role: formData.role, isActive: formData.isActive }
            : u
        )
      );
      toast.success('User updated successfully');
    } else {
      // Add new user
      const newUser: UserWithStatus = {
        id: String(Date.now()),
        name: formData.name,
        email: formData.email,
        role: formData.role,
        organizationId: '1',
        isActive: formData.isActive,
      };
      setUsers((prev) => [...prev, newUser]);
      toast.success('User added successfully');
    }

    setUserDialog({ open: false, user: null });
  };

  const handleDelete = () => {
    if (deleteDialog.user) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.user!.id));
      toast.success('User removed');
    }
    setDeleteDialog({ open: false, user: null });
  };

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !u.isActive } : u))
    );
    toast.success('User status updated');
  };

  const activeUsers = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
        <Button className="gap-2" onClick={openAddDialog}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length - activeUsers}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.role === 'admin').length}
                </p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {!user.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={roleLabels[user.role].color}>
                    {roleLabels[user.role].label}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleUserStatus(user.id)}>
                        {user.isActive ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteDialog({ open: true, user })}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={userDialog.open} onOpenChange={(open) => setUserDialog({ ...userDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {userDialog.user ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {userDialog.user
                ? 'Update user details and role'
                : 'Invite a new team member'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as User['role'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="qa_lead">QA Lead</SelectItem>
                  <SelectItem value="tester">Tester</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.role === 'admin' && 'Full access to all features and settings'}
                {formData.role === 'qa_lead' && 'Can manage test cases, suites, and runs'}
                {formData.role === 'tester' && 'Can execute tests and report results'}
                {formData.role === 'viewer' && 'Read-only access to reports'}
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive users cannot access the system
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUserDialog({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {userDialog.user ? 'Save Changes' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Remove User"
        description={`Are you sure you want to remove ${deleteDialog.user?.name}? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
};
