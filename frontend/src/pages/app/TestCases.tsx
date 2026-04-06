import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Link2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { TestCaseDialog } from '@/components/testcases/TestCaseDialog';
import { QuickEditStatus, QuickEditPriority } from '@/components/testcases/QuickEditPopover';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { ImportExportDialog } from '@/components/testcases/ImportExportDialog';
import { JiraLinkDialog } from '@/components/testcases/JiraLinkDialog';
import { GenerateFromJiraDialog } from '@/components/testcases/GenerateFromJiraDialog';
import { useTestCases, useCreateTestCase, useUpdateTestCase, useDeleteTestCase } from '@/hooks/useTestCases';
import { useTestSuites } from '@/hooks/useTestSuites';
import { useProjectStore } from '@/stores/projectStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import type { TestCase, TestStatus, Priority } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { CanShow } from '@/components/auth/PermissionGuard';

export const TestCases = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { currentProject } = useProjectStore();
  const projectId = currentProject?.id;
  const { data: testCases = [], isLoading } = useTestCases(projectId);
  const { data: suites = [] } = useTestSuites(projectId ?? '');
  const { data: appSettings } = useQuery({ queryKey: ['settings'], queryFn: () => api.settings.getAll() });
  const isAiConfigured = appSettings?.configuredProviders?.some((cp) => cp.configured) ?? false;
  const createTestCase = useCreateTestCase();
  const updateTestCase = useUpdateTestCase();
  const deleteTestCase = useDeleteTestCase();
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null);
  const [jiraLinkOpen, setJiraLinkOpen] = useState(false);
  const [jiraLinkTarget, setJiraLinkTarget] = useState<TestCase | null>(null);
  const [generateFromJiraOpen, setGenerateFromJiraOpen] = useState(false);

  const handleCreate = () => { setEditingTestCase(null); setDialogOpen(true); };
  const handleEdit = (tc: TestCase) => { setEditingTestCase(tc); setDialogOpen(true); };
  const handleView = (tc: TestCase) => { navigate(`/app/test-cases/${tc.id}`); };
  const handleDelete = (tc: TestCase) => { setDeletingTestCase(tc); setDeleteDialogOpen(true); };

  const handleLinkJira = (tc: TestCase) => { setJiraLinkTarget(tc); setJiraLinkOpen(true); };

  const confirmDelete = () => {
    if (deletingTestCase) {
      deleteTestCase.mutate(deletingTestCase.id, { onSuccess: () => toast.success('Test case deleted') });
    }
    setDeleteDialogOpen(false);
    setDeletingTestCase(null);
  };

  const handleSave = (data: Partial<TestCase>) => {
    if (editingTestCase) {
      updateTestCase.mutate({ id: editingTestCase.id, data }, { onSuccess: () => toast.success('Test case updated') });
    } else {
      createTestCase.mutate({ ...data, projectId }, { onSuccess: () => toast.success('Test case created') });
    }
  };

  const handleQuickStatusChange = (tc: TestCase, status: TestStatus) => {
    updateTestCase.mutate({ id: tc.id, data: { status } }, { onSuccess: () => toast.success('Status updated') });
  };

  const handleQuickPriorityChange = (tc: TestCase, priority: Priority) => {
    updateTestCase.mutate({ id: tc.id, data: { priority } }, { onSuccess: () => toast.success('Priority updated') });
  };

  const handleBulkImport = async (cases: Partial<TestCase>[]) => {
    for (const d of cases) await createTestCase.mutateAsync(d);
  };

  const handleJiraLinkSave = (data: any) => {
    if (jiraLinkTarget) {
      updateTestCase.mutate({ id: jiraLinkTarget.id, data }, { onSuccess: () => toast.success('Jira ticket linked') });
    }
  };

  const handleJiraUnlink = () => {
    if (jiraLinkTarget) {
      updateTestCase.mutate({
        id: jiraLinkTarget.id,
        data: { jiraTicketId: undefined, jiraTicketUrl: undefined, jiraSubtaskId: undefined, jiraSubtaskUrl: undefined, jiraSyncStatus: 'not_linked' },
      }, { onSuccess: () => toast.success('Jira ticket unlinked') });
    }
    setJiraLinkOpen(false);
  };

  const handleAcceptGenerated = async (cases: Partial<TestCase>[]) => {
    for (const d of cases) await createTestCase.mutateAsync({ ...d, projectId });
    toast.success(`${cases.length} test cases created from Jira`);
  };

  const columns = useMemo<ColumnDef<TestCase>[]>(
    () => [
      {
        accessorKey: 'tcId',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.getValue('tcId')}</span>
        ),
        size: 90,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="-ml-4">
            Title <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="max-w-[250px] cursor-pointer hover:text-primary" onClick={() => handleView(row.original)}>
            <p className="font-medium truncate">{row.getValue('title')}</p>
            <p className="text-xs text-muted-foreground truncate">{row.original.description}</p>
          </div>
        ),
      },
      {
        accessorKey: 'jiraTicketId',
        header: 'Jira',
        cell: ({ row }) => {
          const ticketId = row.original.jiraTicketId;
          if (!ticketId) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <a
              href={row.original.jiraTicketUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              🔷 {ticketId}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <QuickEditStatus currentValue={row.getValue('status')} onSelect={(s) => handleQuickStatusChange(row.original, s)}>
            <button className="cursor-pointer hover:opacity-80"><StatusBadge status={row.getValue('status')} /></button>
          </QuickEditStatus>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <QuickEditPriority currentValue={row.getValue('priority')} onSelect={(p) => handleQuickPriorityChange(row.original, p)}>
            <button className="cursor-pointer hover:opacity-80"><PriorityBadge priority={row.getValue('priority')} /></button>
          </QuickEditPriority>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.getValue('type')}</Badge>,
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.getValue('tags') as string[];
          return (
            <div className="flex gap-1 flex-wrap max-w-[120px]">
              {tags.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              {tags.length > 2 && <Badge variant="secondary" className="text-xs">+{tags.length - 2}</Badge>}
            </div>
          );
        },
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.getValue('updatedAt')), { addSuffix: true })}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleView(row.original)}>
                <Eye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              {can('test_cases:update') && (
                <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {can('test_cases:update') && (
                <DropdownMenuItem onClick={() => handleLinkJira(row.original)}>
                  <Link2 className="mr-2 h-4 w-4" /> {row.original.jiraTicketId ? 'Update Jira Link' : 'Link to Jira'}
                </DropdownMenuItem>
              )}
              {can('test_cases:delete') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [updateTestCase]
  );

  const table = useReactTable({
    data: testCases,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground">Manage and organize your test cases</p>
        </div>
        <div className="flex gap-2">
          <CanShow permission="test_cases:create">
            <Button variant="outline" className="gap-2" onClick={() => setGenerateFromJiraOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Generate from Jira
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setImportExportOpen(true)}>
              <Download className="h-4 w-4" />
              Import/Export
            </Button>
            <Button className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              New Test Case
            </Button>
          </CanShow>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search test cases..." value={globalFilter ?? ''} onChange={(e) => setGlobalFilter(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Select onValueChange={(v) => table.getColumn('status')?.setFilterValue(v === 'all' ? undefined : [v])}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="not_run">Not Run</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => table.getColumn('priority')?.setFilterValue(v === 'all' ? undefined : [v])}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No test cases found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}{' '}
              of {table.getFilteredRowModel().rows.length} results
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TestCaseDialog open={dialogOpen} onOpenChange={setDialogOpen} testCase={editingTestCase} suites={suites.map(s => ({ id: s.id, name: s.name }))} onSave={handleSave} />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} title="Delete Test Case" description={`Are you sure you want to delete "${deletingTestCase?.title}"? This action cannot be undone.`} onConfirm={confirmDelete} />
      <ImportExportDialog open={importExportOpen} onOpenChange={setImportExportOpen} testCases={testCases} suites={suites.map(s => ({ id: s.id, name: s.name }))} projectId={projectId} onImport={handleBulkImport} />
      <JiraLinkDialog open={jiraLinkOpen} onOpenChange={setJiraLinkOpen} testCase={jiraLinkTarget} linkedJiraProjectKey={currentProject?.settings?.jiraProjectKey} onSave={handleJiraLinkSave} onUnlink={handleJiraUnlink} />
      <GenerateFromJiraDialog open={generateFromJiraOpen} onOpenChange={setGenerateFromJiraOpen} onAccept={handleAcceptGenerated} projectId={projectId} suites={suites.map(s => ({ id: s.id, name: s.name }))} isAiConfigured={isAiConfigured} linkedJiraProjectKey={currentProject?.settings?.jiraProjectKey} />
    </div>
  );
};
