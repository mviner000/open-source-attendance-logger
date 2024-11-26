// lib/csv_import.ts

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

// Interfaces matching the Rust structs
export interface CsvValidationResult {
  is_valid: boolean;
  total_rows: number;
  validated_rows: number;
  validation_errors: string[];
}

export interface CsvImportResponse {
  validation_result: CsvValidationResult;
  total_processed: number;
  successful_imports: number;
  failed_imports: number;
  error_details: string[];
}

export interface CsvImportRequest {
  file_path: string;
}

export const CsvImportApi = {
  async validateCsvFile(filePath: string): Promise<CsvValidationResult> {
    try {
      logger.log(`Validating CSV file: ${filePath}`, 'info');
      const result = await invoke('validate_csv_file', { filePath });
      logger.log('CSV validation completed', 'success');
      return result as CsvValidationResult;
    } catch (error) {
      logger.log(`CSV validation failed: ${error}`, 'error');
      throw error;
    }
  },

  async importCsvFile(filePath: string): Promise<CsvImportResponse> {
    try {
      logger.log(`Importing CSV file: ${filePath}`, 'info');
      const result = await invoke('import_csv_file', { filePath });
      
      const importResponse = result as CsvImportResponse;
      
      logger.log(`CSV import completed: 
        Total Processed: ${importResponse.total_processed}
        Successful Imports: ${importResponse.successful_imports}
        Failed Imports: ${importResponse.failed_imports}`, 
        importResponse.failed_imports > 0 ? 'warn' : 'success'
      );

      if (importResponse.failed_imports > 0) {
        logger.log('Import Errors:', 'error');
        importResponse.error_details.forEach(error => 
          logger.log(error, 'error')
        );
      }

      return importResponse;
    } catch (error) {
      logger.log(`CSV import failed: ${error}`, 'error');
      throw error;
    }
  }
};