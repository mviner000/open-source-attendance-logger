// lib/purpose.ts

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

export interface Purpose {
  id: string;  // UUID
  label: string;
  icon_name: string;
  is_deleted: boolean;
}

export interface CreatePurposeRequest {
  label: string;
  icon_name: string;
}

export const PurposeApi = {
  async createPurpose(purpose: CreatePurposeRequest, username: string, password: string): Promise<Purpose> {
    try {
      logger.log(`Creating new purpose: ${purpose.label}`, 'info');
      const result = await invoke('create_purpose', { purpose, username, password });
      logger.log(`Successfully created purpose: ${purpose.label}`, 'success');
      return result as Purpose;
    } catch (error) {
      logger.log(`Failed to create purpose: ${error}`, 'error');
      throw error;
    }
  },

  async getAllPurposes(includeDeleted: boolean = false): Promise<Purpose[]> {
    try {
      logger.log('Fetching purposes', 'info');
      const purposes = await invoke('get_all_purposes', { includeDeleted });
      logger.log(`Successfully fetched ${(purposes as Purpose[]).length} purposes`, 'success');
      return purposes as Purpose[];
    } catch (error) {
      logger.log(`Failed to fetch purposes: ${error}`, 'error');
      throw error;
    }
  },

  async getPurpose(id: string): Promise<Purpose> {
    try {
      logger.log(`Fetching purpose with id: ${id}`, 'info');
      const result = await invoke('get_purpose', { id });
      logger.log(`Successfully fetched purpose: ${(result as Purpose).label}`, 'success');
      return result as Purpose;
    } catch (error) {
      logger.log(`Failed to fetch purpose ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async getPurposeByLabel(label: string): Promise<Purpose> {
    try {
      logger.log(`Fetching purpose with label: ${label}`, 'info');
      const result = await invoke('get_purpose_by_label', { label });
      logger.log(`Successfully fetched purpose with label: ${label}`, 'success');
      return result as Purpose;
    } catch (error) {
      logger.log(`Failed to fetch purpose with label ${label}: ${error}`, 'error');
      throw error;
    }
  },

  async updatePurpose(id: string, purpose: CreatePurposeRequest, username: string, password: string): Promise<Purpose> {
    try {
      logger.log(`Updating purpose ${id}`, 'info');
      const result = await invoke('update_purpose', { id, purpose, username, password });
      logger.log(`Successfully updated purpose ${id}`, 'success');
      return result as Purpose;
    } catch (error) {
      logger.log(`Failed to update purpose ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async softDeletePurpose(id: string, username: string, password: string): Promise<void> {
    try {
      logger.log(`Soft deleting purpose ${id}`, 'info');
      await invoke('soft_delete_purpose', { id, username, password });
      logger.log(`Successfully soft deleted purpose ${id}`, 'success');
    } catch (error) {
      logger.log(`Failed to soft delete purpose ${id}: ${error}`, 'error');
      throw error;
    }
  },

  async restorePurpose(id: string, username: string, password: string): Promise<void> {
    try {
      logger.log(`Restoring purpose ${id}`, 'info');
      await invoke('restore_purpose', { id, username, password });
      logger.log(`Successfully restored purpose ${id}`, 'success');
    } catch (error) {
      logger.log(`Failed to restore purpose ${id}: ${error}`, 'error');
      throw error;
    }
  }
};