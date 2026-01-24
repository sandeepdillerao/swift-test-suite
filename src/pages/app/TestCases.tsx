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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { TestCaseDialog } from '@/components/testcases/TestCaseDialog';
import { QuickEditStatus, QuickEditPriority } from '@/components/testcases/QuickEditPopover';
import { DeleteConfirmDialog } from '@/components/testcases/DeleteConfirmDialog';
import { useTestCases, useCreateTestCase, useUpdateTestCase, useDeleteTestCase } from '@/hooks/useTestCases';
import { useTestSuites } from '@/hooks/useTestSuites';
import type { TestCase, TestStatus, Priority } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export const TestCases = () => {
  const navigate = useNavigate();
  const { data: testCases = [], isLoading } = useTestCases();
  const { data: suites = [] } = useTestSuites('1');
  const createTestCase = useCreateTestCase();
  const updateTestCase = useUpdateTestCase();
  const deleteTestCase = useDeleteTestCase();
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null);

  const handleCreate = () => {
    setEditingTestCase(null);
    setDialogOpen(true);
  };

  const handleEdit = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setDialogOpen(true);
  };

  const handleView = (testCase: TestCase) => {
    navigate(`/app/test-cases/${testCase.id}`);
  };

  const handleDelete = (testCase: TestCase) => {
    setDeletingTestCase(testCase);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingTestCase) {
      deleteTestCase.mutate(deletingTestCase.id, {
        onSuccess: () => toast.success('Test case deleted'),
      });
    }
    setDeleteDialogOpen(false);
    setDeletingTestCase(null);
  };

  const handleSave = (data: Partial<TestCase>) => {
    if (editingTestCase) {
      updateTestCase.mutate(
        { id: editingTestCase.id, data },
        { onSuccess: () => toast.success('Test case updated') }
      );
    } else {
      createTestCase.mutate(data, {
        onSuccess: () => toast.success('Test case created'),
      });
    }
  };

  const handleQuickStatusChange = (testCase: TestCase, status: TestStatus) => {
    updateTestCase.mutate(
      { id: testCase.id, data: { status } },
      { onSuccess: () => toast.success('Status updated') }
    );
  };

  const handleQuickPriorityChange = (testCase: TestCase, priority: Priority) => {
    updateTestCase.mutate(
      { id: testCase.id, data: { priority } },
      { onSuccess: () => toast.success('Priority updated') }
    );
  };

  const columns = useMemo<ColumnDef<TestCase>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.getValue('id')}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div 
            className="max-w-[300px] cursor-pointer hover:text-primary"
            onClick={() => handleView(row.original)}
          >
            <p className="font-medium truncate">{row.getValue('title')}</p>
            <p className="text-xs text-muted-foreground truncate">
              {row.original.description}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <QuickEditStatus
            currentValue={row.getValue('status')}
            onSelect={(status) => handleQuickStatusChange(row.original, status)}
          >
            <button className="cursor-pointer hover:opacity-80">
              <StatusBadge status={row.getValue('status')} />
            </button>
          </QuickEditStatus>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <QuickEditPriority
            currentValue={row.getValue('priority')}
            onSelect={(priority) => handleQuickPriorityChange(row.original, priority)}
          >
            <button className="cursor-pointer hover:opacity-80">
              <PriorityBadge priority={row.getValue('priority')} />
            </button>
          </QuickEditPriority>
        ),
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.getValue('type')}
          </Badge>
        ),
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const tags = row.getValue('tags') as string[];
          return (
            <div className="flex gap-1 flex-wrap max-w-[150px]">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Updated',
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleView(row.original)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
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
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Cases</h1>
          <p className="text-muted-foreground">
            Manage and organize your test cases
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          New Test Case
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search test cases..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                onValueChange={(value) => 
                  table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : [value])
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="not_run">Not Run</SelectItem>
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) => 
                  table.getColumn('priority')?.setFilterValue(value === 'all' ? undefined : [value])
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
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
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No test cases found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <TestCaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testCase={editingTestCase}
        suites={suites.map(s => ({ id: s.id, name: s.name }))}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Test Case"
        description={`Are you sure you want to delete "${deletingTestCase?.title}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
};
