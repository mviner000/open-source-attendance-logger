import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

export interface Classification {
  id: string;
  long_name: string;
  short_name: string;
  placing: number;
}

export interface ClassificationInput {
  long_name: string;
  short_name: string;
  placing: number;
}

export interface ScannedCourse {
  course: string;
  count: number;
}

export interface ClassificationScanResult {
  new_courses: number;
  updated_courses: number;
  total_courses: number;
}

// Type guard functions
function isScannedCourse(obj: unknown): obj is ScannedCourse {
  return (
    typeof obj === 'object' && 
    obj !== null && 
    'course' in obj && 
    'count' in obj
  );
}

function isClassificationScanResult(obj: unknown): obj is ClassificationScanResult {
  return (
    typeof obj === 'object' && 
    obj !== null && 
    'new_courses' in obj && 
    'updated_courses' in obj && 
    'total_courses' in obj
  );
}

function isClassification(obj: unknown): obj is Classification {
  return (
    typeof obj === 'object' && 
    obj !== null && 
    'id' in obj && 
    'long_name' in obj && 
    'short_name' in obj && 
    'placing' in obj
  );
}

export const ClassificationApi = {
  async scanDistinctCourses(): Promise<ScannedCourse[]> {
    try {
      logger.log('Scanning distinct courses', 'info');
      const courses = await invoke('scan_distinct_courses');
      
      // Validate courses
      if (!Array.isArray(courses)) {
        throw new Error('Returned data is not an array');
      }
      
      const validCourses = courses.filter(isScannedCourse);
      
      if (validCourses.length !== courses.length) {
        logger.log('Some courses did not match the expected format', 'warn');
      }
      
      logger.log(`Successfully scanned ${validCourses.length} distinct courses`, 'success');
      return validCourses;
    } catch (error) {
      logger.log(`Failed to scan distinct courses: ${error}`, 'error');
      throw error;
    }
  },

  async saveClassification(input: ClassificationInput): Promise<void> {
    try {
      logger.log(`Saving classification: ${input.long_name}`, 'info');
      await invoke('save_classification', { input });
      logger.log(`Successfully saved classification: ${input.long_name}`, 'success');
    } catch (error) {
      logger.log(`Failed to save classification: ${error}`, 'error');
      throw error;
    }
  },

  async scanAndSaveCourses(): Promise<ClassificationScanResult> {
    try {
      logger.log('Scanning and saving courses from school accounts', 'info');
      const result = await invoke('scan_and_save_courses');
      
      if (!isClassificationScanResult(result)) {
        throw new Error('Returned data does not match expected ClassificationScanResult');
      }
      
      logger.log(`Scan result - New: ${result.new_courses}, Updated: ${result.updated_courses}, Total: ${result.total_courses}`, 'success');
      return result;
    } catch (error) {
      logger.log(`Failed to scan and save courses: ${error}`, 'error');
      throw error;
    }
  },

  async getClassificationByLongName(longName: string): Promise<Classification | null> {
    try {
      logger.log(`Fetching classification for long name: ${longName}`, 'info');
      const classification = await invoke('get_classification_by_long_name', { long_name: longName });
      
      // Handle null case
      if (classification === null) {
        return null;
      }
      
      if (!isClassification(classification)) {
        throw new Error('Returned data does not match expected Classification');
      }
      
      logger.log(`Successfully fetched classification for: ${longName}`, 'success');
      return classification;
    } catch (error) {
      logger.log(`Failed to fetch classification: ${error}`, 'error');
      throw error;
    }
  }
};