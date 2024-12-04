// lib/semester.ts use
import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

export interface Semester {
  id: string; // UUID
  label: string;
  is_active: boolean;
  created_at: string; // ISO 8601 datetime string
  updated_at: string; // ISO 8601 datetime string
}

export interface CreateSemesterRequest {
  label: string;
  is_active?: boolean;
}

export const SemesterApi = {
  async createSemester(semester: CreateSemesterRequest, username: string, password: string): Promise<Semester> {
    try {
      logger.log(`Creating new semester: ${semester.label}`, 'info');
      const result = await invoke('create_semester', { semester, username, password });
      logger.log(`Successfully created semester: ${semester.label}`, 'success');
      return result as Semester;
    } catch (error) {
      logger.log(`Failed to create semester: ${error}`, 'error');
      throw error;
    }
  },

  async setActiveSemester(id: string, username: string, password: string): Promise<Semester> {
    try {
      logger.log(`Setting semester ${id} as active`, 'info');
      const result = await invoke('set_active_semester', { id, username, password });
      logger.log(`Successfully set semester ${id} as active`, 'success');
      return result as Semester;
    } catch (error) {
      logger.log(`Failed to set semester ${id} as active: ${error}`, 'error');
      throw error;
    }
  },

  async getAllSemesters(): Promise<Semester[]> {
    try {
      logger.log('Fetching all semesters', 'info');
      const semesters = await invoke('get_all_semesters');
      logger.log(`Successfully fetched ${(semesters as Semester[]).length} semesters`, 'success');
      return semesters as Semester[];
    } catch (error) {
      logger.log(`Failed to fetch semesters: ${error}`, 'error');
      throw error;
    }
  },

  async getSemester(id: string): Promise<Semester> {
    try {
      logger.log(`Fetching semester with id: ${id}`, 'info');
      const result = await invoke('get_semester', { id });
      logger.log(`Successfully fetched semester: ${(result as Semester).label}`, 'success');
      return result as Semester;
    } catch (error) {
      logger.log(`Failed to fetch semester ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async getSemesterByLabel(label: string): Promise<Semester> {
    try {
      logger.log(`Fetching semester with label: ${label}`, 'info');
      const result = await invoke('get_semester_by_label', { label });
      logger.log(`Successfully fetched semester with label: ${label}`, 'success');
      return result as Semester;
    } catch (error) {
      logger.log(`Failed to fetch semester with label ${label}: ${error}`, 'error');
      throw error;
    }
  },

  async updateSemester(id: string, semester: CreateSemesterRequest, username: string, password: string): Promise<Semester> {
    try {
      logger.log(`Updating semester ${id}`, 'info');
      const result = await invoke('update_semester', { id, semester, username, password });
      logger.log(`Successfully updated semester ${id}`, 'success');
      return result as Semester;
    } catch (error) {
      logger.log(`Failed to update semester ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async deleteSemester(id: string, username: string, password: string): Promise<void> {
    try {
      logger.log(`Deleting semester ${id}`, 'info');
      await invoke('delete_semester', { id, username, password });
      logger.log(`Successfully deleted semester ${id}`, 'success');
    } catch (error) {
      logger.log(`Failed to delete semester ${id}: ${error}`, 'error');
      throw error;
    }
  }
};