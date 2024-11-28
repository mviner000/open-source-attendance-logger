// src/SchoolAccounts.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { SchoolAccountsApi, SchoolAccount } from '@/lib/school_accounts';
import { SemesterApi, Semester } from '@/lib/semester';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CsvImportComponent from './CsvImportComponent';
import { SemesterModal } from './semester-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { SearchModal } from './search-modal';

const SchoolAccountsPage: React.FC = () => {
  const [schoolAccounts, setSchoolAccounts] = useState<SchoolAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [inactiveCount, setInactiveCount] = useState<number>(0);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  
  // Filters
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [yearLevelFilter, setYearLevelFilter] = useState<string>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  
  // Dropdown options
  const [courses, setCourses] = useState<string[]>([]);
  const [yearLevels, setYearLevels] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  const fetchSchoolAccountsAndSemesters = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch semesters first
      const allSemesters = await SemesterApi.getAllSemesters();
      setSemesters(allSemesters);

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
      setError('Failed to fetch school accounts and semesters');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchoolAccountsAndSemesters();
  }, [fetchSchoolAccountsAndSemesters]);

  const handleImportSuccess = () => {
    fetchSchoolAccountsAndSemesters();
  };

  const handleSemesterUpdate = () => {
    fetchSchoolAccountsAndSemesters();
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
    
    const isSemesterFilter = 
      semesterFilter === 'all' || 
      (account.last_updated_semester?.id === semesterFilter);
    
    return isActiveFilter && isCourseFilter && isYearLevelFilter && isSemesterFilter;
  });

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-background">
      <div className="w-full max-w-6xl p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center items-center">
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading accounts...
            </Button>
          </div>
        ) : error ? (
          <div className="p-4 text-red-500">
            <p>{error}</p>
            <Button onClick={fetchSchoolAccountsAndSemesters} className="mt-4">
              Retry Fetching
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <CsvImportComponent onImportSuccess={handleImportSuccess} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Manage Semesters</CardTitle>
                </CardHeader>
                <CardContent>
                  <SemesterModal onUpdate={handleSemesterUpdate} />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Active Accounts</p>
                    <p className="text-2xl font-bold">{activeCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Inactive Accounts</p>
                    <p className="text-2xl font-bold">{inactiveCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Filter Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select value={filter} onValueChange={(value: 'all' | 'active' | 'inactive') => setFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Course" />
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
                  <Select value={yearLevelFilter} onValueChange={setYearLevelFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Year Level" />
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
                  <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters</SelectItem>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={semester.id}>
                          {semester.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
            <CardHeader>
              <div className="flex justify-between items-center w-full">
                <CardTitle>School Accounts</CardTitle>
                <Button onClick={() => setIsSearchModalOpen(true)}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
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
                            <td className="p-2 border">
                              <span className='flex items-center'>
                                <span
                                  className={`inline-block w-3 h-3 rounded-full mr-2 ${
                                    account.is_active ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                ></span>
                                {account.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <SearchModal
              isOpen={isSearchModalOpen}
              onClose={() => setIsSearchModalOpen(false)}
              schoolAccounts={schoolAccounts}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default SchoolAccountsPage;

