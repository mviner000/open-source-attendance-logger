// types/school_accounts.ts
export interface SchoolAccount {
  id: string;
  school_id: string;  // Added to match backend response
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string;  // Added to match backend response
  position?: string | null;
  course?: string | null;
}

// types/school_accounts.ts
export interface SchoolIdLookupResponse {
  school_id: string;
  full_name: string;
  purposes: {
    [key: string]: {
      label: string;
      icon_name: string;
    }
  };
}