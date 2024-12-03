// types/school-account.ts
export type Gender = 'Male' | 'Female' | 'Other';

export interface SchoolAccount {
  id: string;
  school_id: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: Gender;
  course?: string;
  department?: string;
  position?: string;
  major?: string;
  year_level?: string;
  is_active: boolean;
  last_updated_semester_id?: string;
}
