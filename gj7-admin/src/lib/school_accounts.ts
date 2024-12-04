// lib/school_accounts.ts

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

// Interface for Semester
export interface Semester {
  id: string; // UUID as string
  label: string;
}

// Updated SchoolAccount interface with proper semester relationship
export interface SchoolAccount {
  id: string; // UUID as string
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
  last_updated_semester_id: string | null; // UUID of related semester
  last_updated_semester?: Semester | null; // Optional joined semester data
}

// New interface for pagination request
export interface PaginationRequest {
  page?: number;
  page_size?: number;
  semester_id?: string;
}

// New interface for paginated school accounts
export interface PaginatedSchoolAccounts {
  accounts: SchoolAccount[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
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

  async getSchoolAccountWithSemester(id: string): Promise<SchoolAccount> {
    try {
      logger.log(`Fetching school account with ID: ${id}`, 'info');
      const account = await invoke('get_school_account_with_semester', { id });
      logger.log('Successfully fetched school account with semester data', 'success');
      return account as SchoolAccount;
    } catch (error) {
      logger.log(`Failed to fetch school account: ${error}`, 'error');
      throw error;
    }
  },

  async updateSchoolAccountSemester(id: string, semesterId: string): Promise<SchoolAccount> {
    try {
      logger.log(`Updating school account ${id} with semester ${semesterId}`, 'info');
      const account = await invoke('update_school_account_semester', {
        id,
        semesterId
      });
      logger.log('Successfully updated school account semester', 'success');
      return account as SchoolAccount;
    } catch (error) {
      logger.log(`Failed to update school account semester: ${error}`, 'error');
      throw error;
    }
  },

  // New method for paginated school accounts retrieval
  async getPaginatedSchoolAccounts(request: PaginationRequest = {}): Promise<PaginatedSchoolAccounts> {
    try {
      logger.log('Fetching paginated school accounts', 'info');
      
      // Set default values if not provided
      const paginationRequest = {
        page: request.page ?? 1,
        page_size: request.page_size ?? 30,
        semester_id: request.semester_id ?? null
      };

      const result = await invoke('get_paginated_school_accounts', { 
        request: {
          page: request.page ?? 1,
          page_size: request.page_size ?? 30,
          semester_id: request.semester_id ?? null
        }
      });
      
      logger.log(
        `Successfully fetched paginated school accounts: page ${paginationRequest.page}, ` +
        `page size ${paginationRequest.page_size}, ` +
        `total accounts ${(result as PaginatedSchoolAccounts).total_count}`, 
        'success'
      );
      
      return result as PaginatedSchoolAccounts;
    } catch (error) {
      logger.log(`Failed to fetch paginated school accounts: ${error}`, 'error');
      throw error;
    }
  },

  // Existing method to extract unique courses
  extractUniqueCourses(accounts: SchoolAccount[]): string[] {
    return Array.from(
      new Set(
        accounts
          .map(account => account.course)
          .filter((course): course is string => course !== null && course.trim() !== '')
      )
    ).sort();
  }
};