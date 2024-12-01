export type UserId = number;

export type StudentInfo = {
  // id: string;
  school_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: Gender;
  course: Course | null;
  major: null;
  year_level: string;
  image?: string | null;
  role: Role
  current_cropped_avatar_url?: string | null;
};

export enum Gender {
  FEMALE = "FEMALE",
  MALE = "MALE",
}

export enum Role {
  Teacher = "Teacher",
  Student = "Student",
}

export enum Course {
  BSIT = "BSIT",
  BSHM = "BSHM",
  BSA = "BSA",
  BSED = "BSED",
  BSBA = "BSBA",
}

export type Attendance = {
  school_id: string;
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  year_level: string;
  is_activated: boolean;
  current_cropped_avatar: string;
  purpose: string;
  status: string;
  student_id: string;
  student_name: string;
  classification: string;
  course: Course | null;
  time_in_date: string;
  date: string;
  time_out_date: string | null;
  has_already_timed_in: boolean;
  has_already_timed_out: boolean;
  random_quote: {
    text: string;
    author: string;
    posted_by: string;
    id: number;
  }
};

export type ScanInfo = (StudentInfo & Attendance) | null;

export type Announcement = {
  id: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}