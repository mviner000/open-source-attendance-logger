import React, { useState, useEffect, useCallback } from 'react';
import { SchoolAccountsApi, SchoolAccount } from '@/lib/school_accounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CsvImportComponent from './CsvImportComponent';
import { SemesterModal } from './semester-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const SchoolAccountsPage: React.FC = () => {
  const [schoolAccounts, setSchoolAccounts] = useState<SchoolAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [inactiveCount, setInactiveCount] = useState<number>(0);
  
  // Filters
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [yearLevelFilter, setYearLevelFilter] = useState<string>('all');
  
  // Dropdown options
  const [courses, setCourses] = useState<string[]>([]);
  const [yearLevels, setYearLevels] = useState<string[]>([]);

  const fetchSchoolAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const allAccounts = await SchoolAccountsApi.getAllSchoolAccounts();
      
      // Fetch semester details for each account
      const accountsWithSemester = await Promise.all(
        allAccounts.map(async (account) => {
          if (account.last_updated_semester_id) {
            try {
              return await SchoolAccountsApi.getSchoolAccountWithSemester(account.id);
            } catch (err) {
              console.error(`Failed to fetch semester for account ${account.id}:`, err);
              return account;
            }
          }
          return account;
        })
      );

      // Calculate active and inactive counts
      const activeAccounts = accountsWithSemester.filter(account => account.is_active);
      const inactiveAccounts = accountsWithSemester.filter(account => !account.is_active);

      setActiveCount(activeAccounts.length);
      setInactiveCount(inactiveAccounts.length);

      setSchoolAccounts(accountsWithSemester);
      
      // Extract unique courses and year levels
      const uniqueCourses = SchoolAccountsApi.extractUniqueCourses(accountsWithSemester);
      setCourses(uniqueCourses);

      const uniqueYearLevels = Array.from(
        new Set(
          accountsWithSemester
            .map(account => account.year_level)
            .filter((yearLevel): yearLevel is string => yearLevel !== null && yearLevel.trim() !== '')
        )
      ).sort();
      setYearLevels(uniqueYearLevels);

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch school accounts');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchoolAccounts();
  }, [fetchSchoolAccounts]);

  const handleImportSuccess = () => {
    fetchSchoolAccounts();
  };

  // Filter accounts based on the selected filters
  const filteredAccounts = schoolAccounts.filter(account => {
    const isActiveFilter = 
      filter === 'all' || 
      (filter === 'active' && account.is_active) || 
      (filter === 'inactive' && !account.is_active);
    
    const isCourseFilter = 
      courseFilter === 'all' || 
      (account.course !== null && account.course === courseFilter);
    
    const isYearLevelFilter = 
      yearLevelFilter === 'all' || 
      (account.year_level !== null && account.year_level === yearLevelFilter);
    
    return isActiveFilter && isCourseFilter && isYearLevelFilter;
  });

  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Button disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading accounts...
        </Button>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 text-red-500">
        <p>{error}</p>
        <Button onClick={fetchSchoolAccounts} className="mt-4">
          Retry Fetching
        </Button>
      </div>
    );
  }

  return (
    <div className='pb-10'>
      <CsvImportComponent onImportSuccess={handleImportSuccess} />
      <div className="mt-8 w-full max-w-6xl mx-auto">
        <SemesterModal />
      </div>
      <Card className="mt-8 w-full max-w-6xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>School Accounts</CardTitle>
          <div className="flex items-center space-x-4">
            {/* Status Filter Dropdown */}
            <Select 
              value={filter} 
              onValueChange={(value) => setFilter(value as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Course Filter Dropdown */}
            <Select 
              value={courseFilter} 
              onValueChange={(value) => setCourseFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course} value={course}>
                    {course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Level Filter Dropdown */}
            <Select 
              value={yearLevelFilter} 
              onValueChange={(value) => setYearLevelFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Year Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Year Levels</SelectItem>
                {yearLevels.map((yearLevel) => (
                  <SelectItem key={yearLevel} value={yearLevel}>
                    {yearLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Counts */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span>Active: {activeCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span >Inactive: {inactiveCount}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <p className="text-center text-gray-500">
              No school accounts found matching the current filters
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border text-left">School ID</th>
                    <th className="p-2 border text-left">Name</th>
                    <th className="p-2 border text-left">Course</th>
                    <th className="p-2 border text-left">Year Level</th>
                    <th className="p-2 border text-left">Last Updated On</th>
                    <th className="p-2 border text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{account.school_id}</td>
                      <td className="p-2 border">
                        {`${account.first_name || ''} ${account.middle_name || ''} ${account.last_name || ''}`}
                      </td>
                      <td className="p-2 border">{account.course}</td>
                      <td className="p-2 border">{account.year_level}</td>
                      <td className="p-2 border">{account.last_updated_semester?.label || 'N/A'}</td>
                      <td className="p-2 border">{account.is_active ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolAccountsPage;