// src/components/FilteredAttendanceTable.tsx

import React, { useState, useEffect } from 'react';
import { AttendanceApi, AttendanceWithDates } from '@/lib/attendance';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { invoke } from '@tauri-apps/api/core';
import { SchoolAccountsApi } from '@/lib/school_accounts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FilteredAttendanceTableProps {
  initialCourse?: string;
  initialDate?: Date;
}

export const FilteredAttendanceTable: React.FC<FilteredAttendanceTableProps> = ({
  initialCourse = '',
  initialDate
}) => {
  const [attendances, setAttendances] = useState<AttendanceWithDates[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [course, setCourse] = useState<string>(initialCourse);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  
  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const { toast } = useToast();

  const handleRefresh = async () => {
    toast({
      title: "Refreshing",
      description: "Loading latest attendance records...",
    });
    await fetchFilteredAttendances();
  };

  // Fetch unique courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const courses = await invoke<string[]>('get_all_courses');
        const uniqueCourses = courses.length > 0 
          ? courses 
          : await (async () => {
              try {
                const accounts = await SchoolAccountsApi.getAllSchoolAccounts();
                return SchoolAccountsApi.extractUniqueCourses(accounts);
              } catch (fallbackError) {
                console.error('Fallback course fetching failed', fallbackError);
                return [];
              }
            })();
  
        setAvailableCourses(uniqueCourses);
        // Updated course initialization logic
        const initial = initialCourse === "ALL" || (initialCourse && uniqueCourses.includes(initialCourse))
          ? initialCourse
          : (uniqueCourses.length > 0 ? uniqueCourses[0] : "ALL");
        setCourse(initial);
      } catch (err) {
        console.error('Failed to fetch courses', err);
        setError('Failed to load courses');
      }
    };
  
    fetchCourses();
  }, [initialCourse]);

  const fetchFilteredAttendances = async () => {
    try {
      setLoading(true);
      setError(null);
      const filteredResults = await AttendanceApi.getFilteredAttendances(
        course === "ALL" ? undefined : course, 
        date
      );
      setAttendances(filteredResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredAttendances();
  }, [course, date]);

  const handleDeleteClick = (id: string) => {
    setSelectedAttendanceId(id);
    setIsDeleteDialogOpen(true);
    setPin('');
  };

  const handleDeleteConfirm = async () => {
    if (pin !== '1022') {
      toast({
        title: "Incorrect PIN",
        description: "The PIN you entered is incorrect. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedAttendanceId) return;

    try {
      const credentials = await AttendanceApi.getCredentials();
      await AttendanceApi.deleteAttendance(
        selectedAttendanceId,
        credentials.username,
        credentials.password
      );
      
      toast({
        title: "Success",
        description: "Attendance record deleted successfully",
      });
      
      // Refresh the table
      fetchFilteredAttendances();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete attendance record",
        variant: "destructive"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedAttendanceId(null);
      setPin('');
    }
  };

  const handleCourseChange = (selectedCourse: string) => {
    setCourse(selectedCourse);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value ? new Date(e.target.value) : undefined);
  };

  const handleClearFilters = () => {
    setCourse(availableCourses.length > 0 ? availableCourses[0] : "ALL");
    setDate(undefined);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className='text-center w-full'>
            <img 
              src='/attendance_records_header.png' 
              alt='Attendance Records Header' 
              className='mb-4' 
            />
            <p className=''>
              Updated Daily Record of Library Users SY: 2024-2025
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex space-x-4 mb-4">
            <div className="w-1/2">
              <Label htmlFor="course">Course</Label>
              <Select 
                value={course} 
                onValueChange={handleCourseChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Courses</SelectItem>
                  {availableCourses.map((courseName) => (
                    <SelectItem key={courseName} value={courseName}>
                      {courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date ? date.toISOString().split('T')[0] : ''}
                onChange={handleDateChange}
              />
            </div>
          </div>
          <div className="mb-4 flex space-x-2">
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Loading and Error States */}
          {loading && <p>Loading attendances...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}

          {/* Attendance Table */}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>School ID</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No attendances found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendances.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>{attendance.full_name}</TableCell>
                      <TableCell>{attendance.school_id}</TableCell>
                      <TableCell>
                        {attendance.time_in_date.toLocaleString()}
                      </TableCell>
                      <TableCell>{attendance.classification}</TableCell>
                      <TableCell>{attendance.purpose_label || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(attendance.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Please enter PIN to confirm deletion of this attendance record.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setPin('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FilteredAttendanceTable;