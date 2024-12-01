// types/attendance.ts

export interface Attendance {
    id: string;
    school_id: string;
    full_name: string;
    time_in_date: string;
    classification: string;
    purpose_label: string;
  }
  
  export interface CreateAttendanceRequest {
    school_id: string;
    purpose_label: string;
  }