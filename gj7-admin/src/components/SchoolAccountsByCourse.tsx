import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SchoolAccount, SchoolAccountsApi } from '@/lib/school_accounts';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Semester, SemesterApi } from '@/lib/semester';

interface SchoolAccountsByCourseProps {
  initialCourse?: string;
}

export const SchoolAccountsByCourse: React.FC<SchoolAccountsByCourseProps> = ({ 
  initialCourse 
}) => {
  // State for courses and accounts
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | undefined>(initialCourse);
  const [accounts, setAccounts] = useState<SchoolAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);

  // Fetch unique courses when component mounts
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const allAccounts = await SchoolAccountsApi.getAllSchoolAccounts();
        const uniqueCourses = SchoolAccountsApi.extractUniqueCourses(allAccounts);
        setCourses(uniqueCourses);
      } catch (err) {
        console.error('Failed to fetch courses', err);
      }
    };

    fetchCourses();
  }, []);

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
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch accounts when course or semester changes
  useEffect(() => {
    const fetchAccountsByCourse = async () => {
      if (!selectedCourse || !selectedSemester) return;

      setIsLoading(true);
      setError(null);

      try {
        const fetchedAccounts = await SchoolAccountsApi.getSchoolAccountsByCourse({
          course: selectedCourse,
          semester_id: selectedSemester
        });

        setAccounts(fetchedAccounts);
      } catch (err) {
        setError('Failed to fetch accounts');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountsByCourse();
  }, [selectedCourse, selectedSemester]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>School Accounts by Course</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-4 mb-4">
          <Select 
            value={selectedSemester || ''} 
            onValueChange={(value) => setSelectedSemester(value)}
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

          <Select 
            value={selectedCourse || ''} 
            onValueChange={(value) => setSelectedCourse(value)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCourse && (
            <Button
              variant="outlineAmber3d"
              className='p-2 py-0 border-gray-600 hover:text-gray-800 hover:bg-gray-600 hover:border-gray-700'
              onClick={() => setSelectedCourse(undefined)}
            >
              Clear Selection
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Loading accounts...</span>
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Id</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year Level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.school_id || 'N/A'}</TableCell>
                  <TableCell>
                    {`${account.first_name || ''} ${account.middle_name || ''} ${account.last_name || ''}`.trim()}
                  </TableCell>
                  <TableCell>{account.course || 'N/A'}</TableCell>
                  <TableCell>{account.year_level || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={account.is_active ? 'default' : 'destructive'}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!isLoading && accounts.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No accounts found for the selected course.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SchoolAccountsByCourse;