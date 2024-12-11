// lib/settings_styles.ts

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';
import { Credentials } from './notes';

export interface SettingsStyle {
  id?: number;
  component_name: string;
  tailwind_classes: string;
  label?: string;
  created_at: number;
  updated_at: number;
}

export interface SettingsStyleWithDates {
  id?: number;
  component_name: string;
  tailwind_classes: string;
  label?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSettingsStyleRequest {
  component_name: string;
  tailwind_classes: string;
  label?: string;
}

export interface UpdateSettingsStyleRequest {
  component_name?: string;
  tailwind_classes?: string;
  label?: string | null;
}

function convertToDateSettingsStyle(settingsStyle: SettingsStyle): SettingsStyleWithDates {
  return {
    ...settingsStyle,
    created_at: new Date(Number(settingsStyle.created_at) * 1000),
    updated_at: new Date(Number(settingsStyle.updated_at) * 1000)
  };
}

export const SettingsStylesApi = {
    async getSettingsStyleByComponentName(componentName: string): Promise<SettingsStyleWithDates> {
        try {
            logger.log(`Fetching settings style with component name: ${componentName}`, 'info');
            const result = await invoke('get_settings_style_by_component_name', { componentName });
            logger.log(`Successfully fetched settings style for component: ${componentName}`, 'success');
            return convertToDateSettingsStyle(result as SettingsStyle);
        } catch (error) {
            logger.log(`Failed to fetch settings style for component ${componentName}: ${error}`, 'error');
            throw error;
        }
    },
        
    async getCredentials(): Promise<Credentials> {
        try {
        logger.log('Fetching credentials', 'info');
        const credentials = await invoke('get_credentials');
        return credentials as Credentials;
        } catch (error) {
        logger.log(`Failed to fetch credentials: ${error}`, 'error');
        throw error;
        }
    },

    async createSettingsStyle(
        settingsStyle: CreateSettingsStyleRequest, 
        username: string, 
        password: string
    ): Promise<SettingsStyleWithDates> {
        try {
        logger.log(`Creating new settings style: ${settingsStyle.component_name}`, 'info');
        const result = await invoke('create_settings_style', { settingsStyle, username, password });
        logger.log(`Successfully created settings style: ${settingsStyle.component_name}`, 'success');
        return convertToDateSettingsStyle(result as SettingsStyle);
        } catch (error) {
        logger.log(`Failed to create settings style: ${error}`, 'error');
        throw error;
        }
    },

    async getAllSettingsStyles(): Promise<SettingsStyleWithDates[]> {
        try {
        logger.log('Fetching all settings styles', 'info');
        const settingsStyles = await invoke('get_all_settings_styles');
        logger.log(`Successfully fetched ${(settingsStyles as SettingsStyle[]).length} settings styles`, 'success');
        return (settingsStyles as SettingsStyle[]).map(convertToDateSettingsStyle);
        } catch (error) {
        logger.log(`Failed to fetch settings styles: ${error}`, 'error');
        throw error;
        }
    },

    async getSettingsStyle(id: number): Promise<SettingsStyleWithDates> {
        try {
        logger.log(`Fetching settings style with id: ${id}`, 'info');
        const result = await invoke('get_settings_style', { id });
        logger.log(`Successfully fetched settings style: ${(result as SettingsStyle).component_name}`, 'success');
        return convertToDateSettingsStyle(result as SettingsStyle);
        } catch (error) {
        logger.log(`Failed to fetch settings style ${id}: ${error}`, 'error');
        throw error;
        }
    },

    async updateSettingsStyle(
        id: number, 
        settingsStyle: UpdateSettingsStyleRequest, 
        username: string, 
        password: string
    ): Promise<SettingsStyleWithDates> {
        try {
        // logger.log(`Updating settings style ${id}`, 'info');
        const result = await invoke('update_settings_style', { id, settingsStyle, username, password });
        // logger.log(`Successfully updated settings style ${id}`, 'success');
        return convertToDateSettingsStyle(result as SettingsStyle);
        } catch (error) {
        logger.log(`Failed to update settings style ${id}: ${error}`, 'error');
        throw error;
        }
    },

    async deleteSettingsStyle(
        id: number, 
        username: string, 
        password: string
    ): Promise<void> {
        try {
        logger.log(`Deleting settings style ${id}`, 'info');
        await invoke('delete_settings_style', { id, username, password });
        logger.log(`Successfully deleted settings style ${id}`, 'success');
        } catch (error) {
        logger.log(`Failed to delete settings style ${id}: ${error}`, 'error');
        throw error;
        }
    },

    async searchSettingsStyles(query: string): Promise<SettingsStyleWithDates[]> {
        try {
        logger.log(`Searching settings styles with query: ${query}`, 'info');
        const settingsStyles = await invoke('search_settings_styles', { query });
        logger.log(`Found ${(settingsStyles as SettingsStyle[]).length} settings styles matching "${query}"`, 'success');
        return (settingsStyles as SettingsStyle[]).map(convertToDateSettingsStyle);
        } catch (error) {
        logger.log(`Failed to search settings styles: ${error}`, 'error');
        throw error;
        }
    }
};