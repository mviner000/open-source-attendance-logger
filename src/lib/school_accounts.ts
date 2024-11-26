

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

// Enum for semester choices to match backend
export enum Semester {
    FirstSem2024_2025 = "FirstSem2024_2025",
    SecondSem2024_2025 = "SecondSem2024_2025", 
    FirstSem2025_2026 = "FirstSem2025_2026",
    SecondSem2025_2026 = "SecondSem2025_2026",
    None = "None"
}

// Interfaces matching Rust types
export enum Gender {
    Male = "Male",
    Female = "Female", 
    Other = "Other"
}

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
    last_updated?: Semester;
}

export interface CreateSchoolAccountRequest {
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
    is_active?: boolean;
    last_updated?: Semester;
}

export interface UpdateSchoolAccountRequest {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    gender?: Gender;
    course?: string;
    department?: string;
    position?: string;
    major?: string;
    year_level?: string;
    is_active?: boolean;
    last_updated?: Semester;
}


export const SchoolAccountsApi = {
    async createSchoolAccount(account: CreateSchoolAccountRequest): Promise<SchoolAccount> {
        try {
            logger.log(`Creating new school account: ${account.school_id}`, 'info');
            const result = await invoke('create_school_account', { account });
            logger.log(`Successfully created school account: ${account.school_id}`, 'success');
            return result as SchoolAccount;
        } catch (error) {
            logger.log(`Failed to create school account: ${error}`, 'error');
            throw error;
        }
    },

    async getSchoolAccount(id: string): Promise<SchoolAccount> {
        try {
            logger.log(`Fetching school account with id: ${id}`, 'info');
            const result = await invoke('get_school_account', { id });
            logger.log(`Successfully fetched school account: ${id}`, 'success');
            return result as SchoolAccount;
        } catch (error) {
            logger.log(`Failed to fetch school account ${id}: ${error}`, 'error');
            throw error;
        }
    },

    async getSchoolAccountBySchoolId(schoolId: string): Promise<SchoolAccount> {
        try {
            logger.log(`Fetching school account with school ID: ${schoolId}`, 'info');
            const result = await invoke('get_school_account_by_school_id', { schoolId });
            logger.log(`Successfully fetched school account: ${schoolId}`, 'success');
            return result as SchoolAccount;
        } catch (error) {
            logger.log(`Failed to fetch school account by school ID ${schoolId}: ${error}`, 'error');
            throw error;
        }
    },

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

    async updateSchoolAccount(id: string, account: UpdateSchoolAccountRequest): Promise<SchoolAccount> {
        try {
            // Fetch the current account to get existing gender
            const currentAccount = await this.getSchoolAccount(id);
            
            // Create a complete update request, preserving existing values if not specified
            const completeUpdateRequest: UpdateSchoolAccountRequest = {
                first_name: account.first_name,
                middle_name: account.middle_name,
                last_name: account.last_name,
                gender: account.gender ?? currentAccount.gender,
                course: account.course,
                department: account.department,
                position: account.position,
                major: account.major,
                year_level: account.year_level,
                is_active: account.is_active ?? currentAccount.is_active,
                last_updated: account.last_updated ?? currentAccount.last_updated
            };

            logger.log(`Updating school account ${id}`, 'info');
            const result = await invoke('update_school_account', { 
                id, 
                account: completeUpdateRequest 
            });
            logger.log(`Successfully updated school account ${id}`, 'success');
            return result as SchoolAccount;
        } catch (error) {
            logger.log(`Failed to update school account ${id}: ${error}`, 'error');
            throw error;
        }
    },

    async deleteSchoolAccount(id: string): Promise<void> {
        try {
            logger.log(`Deleting school account ${id}`, 'info');
            await invoke('delete_school_account', { id });
            logger.log(`Successfully deleted school account ${id}`, 'success');
        } catch (error) {
            logger.log(`Failed to delete school account ${id}: ${error}`, 'error');
            throw error;
        }
    },

    async searchSchoolAccounts(query: string): Promise<SchoolAccount[]> {
        try {
            logger.log(`Searching school accounts with query: ${query}`, 'info');
            const results = await invoke('search_school_accounts', { query });
            logger.log(`Successfully found ${(results as SchoolAccount[]).length} school accounts`, 'success');
            return results as SchoolAccount[];
        } catch (error) {
            logger.log(`Failed to search school accounts: ${error}`, 'error');
            throw error;
        }
    }
};