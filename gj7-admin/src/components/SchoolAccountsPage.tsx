import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink 
} from '@/components/ui/pagination';
import { SchoolAccountsApi, SchoolAccount, PaginatedSchoolAccounts } from '../lib/school_accounts';
import { SemesterApi, Semester } from '../lib/semester';

const SchoolAccountsPage: React.FC = () => {
  const [paginatedAccounts, setPaginatedAccounts] = useState<PaginatedSchoolAccounts>({
    accounts: [],
    total_count: 0,
    page: 1,
    page_size: 20,
    total_pages: 0
  });
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch semesters and initial accounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        // Fetch all semesters first
        const fetchedSemesters = await SemesterApi.getAllSemesters();
        setSemesters(fetchedSemesters);

        // Find the active semester to set as default
        const activeSemester = fetchedSemesters.find(s => s.is_active);
        if (activeSemester) {
          setSelectedSemester(activeSemester.id);
        }

        // Fetch paginated accounts
        const result = await SchoolAccountsApi.getPaginatedSchoolAccounts({ 
          page: currentPage, 
          page_size: 20,
          semester_id: activeSemester?.id
        });
        setPaginatedAccounts(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch accounts when page or semester changes
  useEffect(() => {
    const fetchPaginatedAccounts = async () => {
      if (!selectedSemester) return;

      try {
        setIsLoading(true);
        const result = await SchoolAccountsApi.getPaginatedSchoolAccounts({ 
          page: currentPage, 
          page_size: 20,
          semester_id: selectedSemester
        });
        setPaginatedAccounts(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaginatedAccounts();
  }, [currentPage, selectedSemester]);

  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemester(semesterId);
    setCurrentPage(1); // Reset to first page when changing semester
  };

  // Generate pagination range
  const getPaginationRange = () => {
    const { total_pages, page } = paginatedAccounts;
    const delta = 2;
    const left = page - delta;
    const right = page + delta + 1;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    
    // Initialize range generation
    for (let i = 1; i <= total_pages; i++) {
      if (i === 1 || i === total_pages || (i >= left && i < right)) {
        range.push(i);
      }
    }

    // Generate range with dots
    let l: number | null = null;
    for (let i of range) {
      if (l !== null) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const renderPagination = () => {
    const { total_pages, page } = paginatedAccounts;
    const paginationRange = getPaginationRange();

    return (
      <Pagination>
        <PaginationContent>
          {/* First Page Button */}
          <PaginationItem>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </PaginationItem>

          {/* Previous Page Button */}
          <PaginationItem>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </PaginationItem>

          {/* Page Number Buttons */}
          {paginationRange.map((pageNumber, index) => {
            if (pageNumber === '...') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            
            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  onClick={() => typeof pageNumber === 'number' && setCurrentPage(pageNumber)}
                  isActive={pageNumber === currentPage}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* Next Page Button */}
          <PaginationItem>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(total_pages, p + 1))}
              disabled={currentPage === total_pages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </PaginationItem>

          {/* Last Page Button */}
          <PaginationItem>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(total_pages)}
              disabled={currentPage === total_pages}
              className="h-8 w-8"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // Rest of the component remains the same as in the previous implementation
  const renderSemesterSelector = () => {
    return (
      <div className="mb-4">
        <label htmlFor="semester-select" className="block text-sm font-medium text-gray-700">
          Select Semester
        </label>
        <select
          id="semester-select"
          value={selectedSemester || ''}
          onChange={(e) => handleSemesterChange(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          {semesters.map(semester => (
            <option key={semester.id} value={semester.id}>
              {semester.label} {semester.is_active ? '(Active)' : ''}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const formatName = (account: SchoolAccount) => {
    const names = [
      account.first_name, 
      account.middle_name, 
      account.last_name
    ].filter(Boolean).join(' ');
    return names || 'N/A';
  };

  if (isLoading) return <div className="text-center py-4">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">School Accounts</h1>


      <div className="mt-4">
        {renderPagination()}
      </div>
      
      {renderSemesterSelector()}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">School ID</th>
              <th className="p-2 border text-left">Name</th>
              <th className="p-2 border text-left">Course</th>
              <th className="p-2 border text-left">Year Level</th>
              <th className="p-2 border text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAccounts.accounts.map(account => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="p-2 border">{account.school_id}</td>
                <td className="p-2 border">{formatName(account)}</td>
                <td className="p-2 border">{account.course || 'N/A'}</td>
                <td className="p-2 border">{account.year_level || 'N/A'}</td>
                <td className="p-2 border">
                  <span className={`
                    px-2 py-1 rounded text-xs
                    ${account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                  `}>
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        {renderPagination()}
      </div>

      <div className="text-center mt-4 text-gray-600">
        Showing page {paginatedAccounts.page} of {paginatedAccounts.total_pages} 
        (Total {paginatedAccounts.total_count} accounts)
      </div>
    </div>
  );
};

export default SchoolAccountsPage;