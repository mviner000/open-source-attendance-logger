import React from 'react';
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { AttendanceApi } from '@/lib/attendance';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

const AttendanceExport = () => {
  const [date, setDate] = React.useState<Date>();
  const [courses, setCourses] = React.useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fetchedCourses = await AttendanceApi.getAllCourses();
        setCourses(fetchedCourses);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch courses"
        });
      }
    };
    
    fetchCourses();
  }, []);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      // Add one day to the selected date
      let exportDate: Date | undefined;
      if (date) {
        exportDate = new Date(date);
        exportDate.setDate(exportDate.getDate() + 1);
      }
  
      const courseToExport = selectedCourse === "all" ? undefined : selectedCourse;
      const filePath = await AttendanceApi.exportAttendancesToCsv(
        courseToExport, 
        exportDate
      );
      toast({
        title: "Success",
        description: `Exported to ${filePath}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white/5 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Export Attendance Records</h2>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-200">Course</label>
          <Select onValueChange={setSelectedCourse} value={selectedCourse}>
            <SelectTrigger className="w-full max-w-xs bg-white/10 text-white border-white/20">
              <SelectValue placeholder="Select course" />
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
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-200">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full max-w-xs justify-start text-left font-normal bg-white/10 text-white border-white/20",
                  !date && "text-gray-400"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? "Exporting..." : "Export to CSV"}
        </Button>
      </div>
    </div>
  );
};

export default AttendanceExport;