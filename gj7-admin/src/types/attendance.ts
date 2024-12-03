// types/attendance.ts

export interface Attendance {
    id: string;
    school_id: string;
    full_name: string;
    time_in_date: string; // ISO string from backend
    classification: string;
    purpose_label?: string;
  }

  
export interface AttendanceWithDates {
    id: string;
    school_id: string;
    full_name: string;
    time_in_date: Date;
    classification: string;
    purpose_label?: string;  // Changed from purpose_id
}
  

export const convertToAttendanceWithDates = (attendance: Attendance): AttendanceWithDates => {
    return {
      ...attendance,
      time_in_date: new Date(attendance.time_in_date)
    };
  };
  

// Helper function to format dates consistently
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    });
  };
  
  // Type guard to check if a date string is valid
  export const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };
  