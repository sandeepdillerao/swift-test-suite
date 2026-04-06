import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Users, Plus, Pencil, Trash2, UserCheck, UserX, Mail, Shield,
  Search, ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal,
  Loader2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { toast } from 'sonner';
import {
  useUsers, useInviteUser, useActivateUser, useDeactivateUser,
  useUpdateUserRole, useDeleteUser,
} from '@/hooks/useUsers';
import type { User } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDistanceToNow } from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin:   { label: 'Admin',   variant: 'destructive' },
  qa_lead: { label: 'QA Lead', variant: 'default' },
  tester:  { label: 'Tester',  variant: 'secondary' },
  viewer:  { label: 'Viewer',  variant: 'outline' },
};

const ROLE_OPTIONS: { value: User['role']; label: string; description: string }[] = [
  { value: 'admin',   label: 'Admin',   description: 'Full access to all features and settings' },
  { value: 'qa_lead', label: 'QA Lead', description: 'Can manage test cases, suites, and runs' },
  { value: 'tester',  label: 'Tester',  description: 'Can execute tests and report results' },
  { value: 'viewer',  label: 'Viewer',  description: 'Read-only access to reports' },
];

interface InviteFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: User['role'];
}

const EMPTY_INVITE: InviteFormData = { firstName: '', lastName: '', email: '', role: 'tester' };

function getUserInitials(user: User) {
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.viewer;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, iconClass }: {
  icon: typeof Users;
  value: number;
  label: string;
  iconClass: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Role Select ─────────────────────────────────────────────────────────────

function RoleSelect({ value, onChange }: { value: User['role']; onChange: (v: User['role']) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as User['role'])}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((r) => (
          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const UserManagement = () => {
  const { can } = usePermissions();
  const { data: usersResponse, isLoading } = useUsers({ limit: 100 });
  const users: User[] = usersResponse?.data ?? [];

  const inviteUser = useInviteUser();
  const activateUser = useActivateUser();
  const deactivateUser = useDeactivateUser();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [inviteDialog, setInviteDialog] = useState(false);
  const [editSheet, setEditSheet] = useState<User | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [formData, setFormData] = useState<InviteFormData>(EMPTY_INVITE);

  // ── Stats ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const admins = users.filter((u) => u.role === 'admin').length;
    return { total: users.length, active, inactive: users.length - active, admins };
  }, [users]);

  // ── Table Columns ─────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: 'displayName',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          User <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback className="text-xs">{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{user.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        );
      },
      filterFn: (row, _, filterValue) => {
        const user = row.original;
        const search = filterValue.toLowerCase();
        return (
          user.displayName.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search)
        );
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Role <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <StatusDot active={row.original.isActive} />
          <span className="text-sm">{row.original.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Last Login <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.original.lastLoginAt;
        return (
          <span className="text-sm text-muted-foreground">
            {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : 'Never'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const user = row.original;
        const hasActions = can('users:activate') || can('users:delete') || can('users:update_role');
        if (!hasActions) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {can('users:update_role') && (
                <DropdownMenuItem onClick={() => setEditSheet(user)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {can('users:activate') && (
                <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                  {user.isActive ? (
                    <><UserX className="mr-2 h-4 w-4" /> Deactivate</>
                  ) : (
                    <><UserCheck className="mr-2 h-4 w-4" /> Activate</>
                  )}
                </DropdownMenuItem>
              )}
              {can('users:delete') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog({ open: true, user })}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 50,
    },
  ], [can]);

  // ── Table Instance ────────────────────────────────────────────────────

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _, filterValue) => {
      const user = row.original;
      const search = filterValue.toLowerCase();
      return (
        user.displayName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.role.toLowerCase().includes(search)
      );
    },
    initialState: { pagination: { pageSize: 15 } },
  });

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleInvite = useCallback(async () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await inviteUser.mutateAsync({
        email: formData.email,
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      toast.success(`Invitation sent to ${formData.email}`);
      setInviteDialog(false);
    } catch {
      toast.error('Failed to send invitation');
    }
  }, [formData, inviteUser]);

  const handleToggleStatus = useCallback(async (user: User) => {
    try {
      if (user.isActive) {
        await deactivateUser.mutateAsync(user.id);
        toast.success(`${user.displayName} deactivated`);
      } else {
        await activateUser.mutateAsync(user.id);
        toast.success(`${user.displayName} activated`);
      }
    } catch {
      toast.error('Failed to update user status');
    }
  }, [deactivateUser, activateUser]);

  const handleRoleChange = useCallback(async (userId: string, role: User['role']) => {
    try {
      await updateRole.mutateAsync({ id: userId, role });
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  }, [updateRole]);

  const handleDelete = useCallback(async () => {
    if (!deleteDialog.user) return;
    try {
      await deleteUser.mutateAsync(deleteDialog.user.id);
      toast.success('User removed');
      setDeleteDialog({ open: false, user: null });
    } catch {
      toast.error('Failed to remove user');
    }
  }, [deleteDialog.user, deleteUser]);

  const openInviteDialog = useCallback(() => {
    setFormData(EMPTY_INVITE);
    setInviteDialog(true);
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage team members and their roles</p>
        </div>
        {can('users:invite') && (
          <Button className="gap-2" onClick={openInviteDialog}>
            <Plus className="h-4 w-4" /> Invite User
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} value={stats.total} label="Total Users" iconClass="bg-primary/10 text-primary" />
        <StatCard icon={UserCheck} value={stats.active} label="Active" iconClass="bg-green-500/10 text-green-500" />
        <StatCard icon={UserX} value={stats.inactive} label="Inactive" iconClass="bg-muted text-muted-foreground" />
        <StatCard icon={Shield} value={stats.admins} label="Admins" iconClass="bg-destructive/10 text-destructive" />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} of {users.length} users
            </span>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                      {globalFilter ? 'No users match your search.' : 'No users found.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => can('users:update_role') && setEditSheet(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Sidebar (Sheet) */}
      <UserEditSheet
        user={editSheet}
        onClose={() => setEditSheet(null)}
        onRoleChange={handleRoleChange}
        onToggleStatus={handleToggleStatus}
        onDelete={(user) => { setEditSheet(null); setDeleteDialog({ open: true, user }); }}
        canUpdateRole={can('users:update_role')}
        canActivate={can('users:activate')}
        canDelete={can('users:delete')}
        isUpdatingRole={updateRole.isPending}
      />

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteDialog}
        onOpenChange={setInviteDialog}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleInvite}
        isPending={inviteUser.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Remove User"
        description={`Are you sure you want to remove ${deleteDialog.user?.displayName}? This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  );
};

// ─── User Edit Sheet (Sidebar Panel) ─────────────────────────────────────────

function UserEditSheet({
  user, onClose, onRoleChange, onToggleStatus, onDelete,
  canUpdateRole, canActivate, canDelete, isUpdatingRole,
}: {
  user: User | null;
  onClose: () => void;
  onRoleChange: (userId: string, role: User['role']) => void;
  onToggleStatus: (user: User) => void;
  onDelete: (user: User) => void;
  canUpdateRole: boolean;
  canActivate: boolean;
  canDelete: boolean;
  isUpdatingRole: boolean;
}) {
  if (!user) return <Sheet open={false}><SheetContent /></Sheet>;

  const roleDesc = ROLE_OPTIONS.find((r) => r.value === user.role)?.description || '';

  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>View and manage user settings</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* User Profile */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback className="text-lg">{getUserInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg truncate">{user.displayName}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" /> {user.email}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <RoleBadge role={user.role} />
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  <StatusDot active={user.isActive} />
                  <span className="ml-1.5">{user.isActive ? 'Active' : 'Inactive'}</span>
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoField label="First Name" value={user.firstName} />
              <InfoField label="Last Name" value={user.lastName} />
              <InfoField label="Email Verified" value={user.isEmailVerified ? 'Yes' : 'No'} />
              <InfoField
                label="Last Login"
                value={user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : 'Never'}
              />
              <InfoField
                label="Created"
                value={formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              />
              <InfoField
                label="Updated"
                value={formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true })}
              />
            </div>
          </div>

          <Separator />

          {/* Role Management */}
          {canUpdateRole && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Role</h4>
              <RoleSelect
                value={user.role}
                onChange={(role) => onRoleChange(user.id, role)}
              />
              <p className="text-xs text-muted-foreground">{roleDesc}</p>
            </div>
          )}

          {/* Status Toggle */}
          {canActivate && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Account Status</h4>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => onToggleStatus(user)}
                >
                  {user.isActive ? (
                    <><UserX className="h-4 w-4 text-amber-500" /> Deactivate User</>
                  ) : (
                    <><UserCheck className="h-4 w-4 text-green-500" /> Activate User</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {user.isActive
                    ? 'Deactivating will prevent the user from logging in.'
                    : 'Activating will restore the user\'s access.'}
                </p>
              </div>
            </>
          )}

          {/* Delete */}
          {canDelete && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => onDelete(user)}
                >
                  <Trash2 className="h-4 w-4" /> Remove User
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="font-medium truncate">{value}</p>
    </div>
  );
}

// ─── Invite Dialog ───────────────────────────────────────────────────────────

function InviteDialog({
  open, onOpenChange, formData, onFormChange, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: InviteFormData;
  onFormChange: (v: InviteFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const roleDesc = ROLE_OPTIONS.find((r) => r.value === formData.role)?.description || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>Send an invitation to a new team member</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="Jane"
                value={formData.firstName}
                onChange={(e) => onFormChange({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                value={formData.lastName}
                onChange={(e) => onFormChange({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <RoleSelect
              value={formData.role}
              onChange={(role) => onFormChange({ ...formData, role })}
            />
            <p className="text-xs text-muted-foreground">{roleDesc}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
