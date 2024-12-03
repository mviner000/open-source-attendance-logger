// types/attendance.ts

export interface Attendance {
  id: string;
  school_id: string;
  full_name: string;
  time_in_date: string;
  classification: string;
  purpose_label?: string;
}

// In your websocket utility types (probably in websocket.ts)
export interface CreateAttendanceRequest {
  school_id: string;
  full_name: string;
  classification: string;
  purpose_label?: string;
}