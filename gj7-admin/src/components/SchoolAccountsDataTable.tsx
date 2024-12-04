import React, { useState, useEffect } from 'react';
import { 
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { SchoolAccountsApi, SchoolAccount, PaginatedSchoolAccounts } from '../lib/school_accounts';
import { SemesterApi, Semester } from '../lib/semester';

export function SchoolAccountsDataTable() {
  const [data, setData] = useState<SchoolAccount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  // Fetch all data and semesters
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch semesters
        const fetchedSemesters = await SemesterApi.getAllSemesters();
        setSemesters(fetchedSemesters);

        // Set active semester as default
        const activeSemester = fetchedSemesters.find(s => s.is_active);
        if (activeSemester) {
          setSelectedSemester(activeSemester.id);
        }

        // Fetch paginated accounts
        const result = await SchoolAccountsApi.getPaginatedSchoolAccounts({ 
          page: pagination.pageIndex + 1, 
          page_size: pagination.pageSize,
          semester_id: activeSemester?.id
        });

        setData(result.accounts);
        setTotalCount(result.total_count);
        setTotalPages(result.total_pages);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch accounts when page or semester changes
  useEffect(() => {
    const fetchPaginatedAccounts = async () => {
      if (!selectedSemester) return;

      try {
        const result = await SchoolAccountsApi.getPaginatedSchoolAccounts({ 
          page: pagination.pageIndex + 1, 
          page_size: pagination.pageSize,
          semester_id: selectedSemester
        });

        setData(result.accounts);
        setTotalCount(result.total_count);
        setTotalPages(result.total_pages);
      } catch (error) {
        console.error("Failed to fetch paginated accounts", error);
      }
    };

    fetchPaginatedAccounts();
  }, [pagination.pageIndex, selectedSemester]);

  const columns: ColumnDef<SchoolAccount>[] = [
    {
      accessorKey: "school_id",
      header: "School ID",
      cell: ({ row }) => row.getValue("school_id")
    },
    {
      accessorKey: "name",
      header: () => (
        <div className="text-center">
          Name
        </div>
      ),
      cell: ({ row }) => {
        const account = row.original;
        const names = [
          account.first_name,
          account.middle_name,
          account.last_name
        ].filter(Boolean).join(' ');
        
        return (
          <div className="text-center">
            {names || 'N/A'}
          </div>
        );
      },
    },
    {
      accessorKey: "course",
      header: () => (
        <div className="text-center" style={{ width: "300px" }}>
          Course
        </div>
      ),
      cell: ({ row }) => (
        <div
          className="text-center truncate"
          style={{ width: "300px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {row.getValue("course") || 'Faculty'}
        </div>
      ),
    },
    {
      accessorKey: "year_level",
      header: () => <div className="text-center" style={{ width: "150px" }}>Year Level</div>,
      cell: ({ row }) => (
        <div
          className="text-center truncate"
          style={{ width: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {row.getValue("year_level") || ''}
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <span className={`
          px-2 py-1 rounded text-xs
          ${row.getValue("is_active") ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
        `}>
          {row.getValue("is_active") ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination
    },
    manualPagination: true,
    pageCount: totalPages
  });

  return (
    <div className='max-w-screen-xl mx-auto mt-5 mb-5'>
     

      {/* Filtering */}
      <div className="flex items-center py-4">
         {/* Semester Selector */}
      <div className="">
        <Select 
          value={selectedSemester || ''} 
          onValueChange={(value) => {
            setSelectedSemester(value);
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select Semester" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map(semester => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.label} {semester.is_active ? '(Active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
        
        {/* Column Visibility Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outlineAmber3d" className="ml-auto font-normal -mt-2" size="sm">
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex-1 text-sm text-muted-foreground">
          Total {totalCount} accounts
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}