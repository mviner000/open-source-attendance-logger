// lib/school_accounts.ts

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

export interface SchoolAccount {
  id: string;  // UUID as string
  school_id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  course: string | null;
  department: string | null;
  position: string | null;
  major: string | null;
  year_level: string | null;
  is_active: boolean;
  last_updated: 'FirstSem2024_2025' | 'SecondSem2024_2025' | 'FirstSem2025_2026' | 'SecondSem2025_2026' | 'None' | null;
}

export const SchoolAccountsApi = {
  async getAllSchoolAccounts(): Promise<SchoolAccount[]> {
    try {
      logger.log('Fetching all school accounts', 'info');
      const accounts = await invoke('get_all_school_accounts');
      logger.log(`Successfully fetched ${(accounts as SchoolAccount[]).length} school accounts`, 'success');
      return accounts as SchoolAccount[];
    } catch (error) {
      logger.log(`Failed to fetch school accounts: ${error}`, 'error');
      throw error;
    }
  },
};
