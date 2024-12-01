// types/attendance.ts

export interface Attendance {
  id: string;
  school_id: string;
  full_name: string;
  time_in_date: string;  // Keep as string since it's serialized from DateTime
  classification: string;
  purpose_label: string | null;  // Change to match backend Optional type
}

export interface CreateAttendanceRequest {
  school_id: string;
  full_name: string;
  classification?: string;
  purpose_label?: string | null;
}