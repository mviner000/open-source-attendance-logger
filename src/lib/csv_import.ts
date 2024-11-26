// lib/csv_import.ts

import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';

// Interfaces matching the Rust structs
export interface ValidationErrorDetails {
  row_number: number;
  field: string | null;
  error_type: string;
  error_message: string;
}

export interface CsvValidationResult {
  is_valid: boolean;
  total_rows: number;
  validated_rows: number;
  validation_errors: ValidationErrorDetails[];
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
          
          try {
              const result = await invoke('validate_csv_file', { filePath });
              console.log('Raw validation result:', result);
              logger.log('CSV validation completed', 'success');
              return result as CsvValidationResult;
          } catch (invokeError) {
              // Log the full error details
              console.error('Invoke error during CSV validation:', invokeError);
              
              // If it's an array of validation errors, handle it
              if (Array.isArray(invokeError)) {
                  console.log('Validation errors array:', invokeError);
                  return {
                      is_valid: false,
                      total_rows: 0,
                      validated_rows: 0,
                      validation_errors: invokeError.map(err => ({
                          row_number: err.row_number || 0,
                          field: err.field || null,
                          error_type: err.error_type || 'Unknown',
                          error_message: err.error_message || 'Validation failed'
                      }))
                  };
              }
              
              // If it's a different type of error
              throw new Error(`Validation failed: ${JSON.stringify(invokeError)}`);
          }
      } catch (error) {
          // Catch any unexpected errors
          console.error('Unexpected error in validateCsvFile:', error);
          
          // More detailed error handling
          if (error instanceof Error) {
              logger.log(`CSV validation failed: ${error.message}`, 'error');
              throw new Error(`Validation failed: ${error.message}`);
          }
          
          logger.log(`CSV validation failed: ${JSON.stringify(error)}`, 'error');
          throw new Error(`Validation failed: ${JSON.stringify(error)}`);
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