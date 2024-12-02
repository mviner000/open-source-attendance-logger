// types/attendance.ts

export interface Attendance {
  id: string;
  school_id: string;
  full_name: string;
  time_in_date: string;  // Keep as string since it's serialized from DateTime
  classification: string;
  purpose_label?: string;  // Change to match backend Optional type
}

// In your websocket utility types (probably in websocket.ts)
export interface CreateAttendanceRequest {
  school_id: string;
  full_name: string;
  classification?: string;
  purpose_label?: string; // Remove null option
}