import { invoke } from '@tauri-apps/api/core';
import { logger } from './logger';
import { Uuid } from '@/types/uuid';
import { SchoolAccount } from './school_accounts';

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

export interface UpdateFieldSummary {
  field_name: string;
  update_count: number;
  sample_values: {
    old_value: string;
    new_value: string;
  }[];
}

export interface ExistingAccountInfo {
  existing_accounts: SchoolAccount[];
  existing_accounts_preview: SchoolAccount[];  // First 5 accounts for preview
  new_accounts_count: number;
  existing_accounts_count: number;
  update_field_summary: UpdateFieldSummary[];
}

export interface ImportSummary {
  updated_accounts: {
    school_id: string;
    old_data: Partial<SchoolAccount>;
    new_data: SchoolAccount;
    updated_fields: string[];
  }[];
  new_accounts: SchoolAccount[];
  update_timestamp: string;
  processing_duration_ms: number;
}

export interface CsvImportResponse {
  validation_result: CsvValidationResult;
  total_processed: number;
  successful_imports: number;
  failed_imports: number;
  error_details: string[];
  existing_account_info?: ExistingAccountInfo;
  import_summary?: ImportSummary;
}

export interface CsvImportRequest {
  file_path: string;
  semester_id: Uuid;
  force_update?: boolean;
  preview_only?: boolean;  // For checking changes without committing
}

export const CsvImportApi = {
  async validateCsvFile(filePath: string): Promise<CsvValidationResult> {
    try {
      logger.log(`Validating CSV file: ${filePath}`, 'info');
      
      try {
        const result = await invoke('validate_csv_file', { filePath });
        logger.log('CSV validation completed', 'success');
        return result as CsvValidationResult;
      } catch (invokeError) {
        if (Array.isArray(invokeError)) {
          // Filter out DataIntegrity errors related to existing accounts
          const filteredErrors = invokeError.filter(err => 
            !(err.error_type === 'DataIntegrity' && 
              err.error_message.includes('School Account already exists'))
          );
  
          return {
            is_valid: filteredErrors.length === 0,
            total_rows: 0,
            validated_rows: 0,
            validation_errors: filteredErrors.map(err => ({
              row_number: err.row_number || 0,
              field: err.field || null,
              error_type: err.error_type || 'Unknown',
              error_message: err.error_message || 'Validation failed'
            }))
          };
        }
        throw new Error(`Validation failed: ${JSON.stringify(invokeError)}`);
      }
    } catch (error) {
      logger.log(`CSV validation failed: ${error}`, 'error');
      throw error;
    }
  },

  async checkExistingAccounts(filePath: string): Promise<ExistingAccountInfo> {
    try {
      logger.log(`Checking existing accounts in CSV: ${filePath}`, 'info');
      const result = await invoke('check_existing_accounts', { filePath });
      
      // Add additional logging for field updates
      const accountInfo = result as ExistingAccountInfo;
      if (accountInfo.update_field_summary?.length > 0) {
        logger.log('Field update summary:', 'info');
        accountInfo.update_field_summary.forEach(summary => {
          logger.log(
            `Field "${summary.field_name}": ${summary.update_count} updates pending`,
            'info'
          );
        });
      }

      return accountInfo;
    } catch (error) {
      logger.log(`Failed to check existing accounts: ${error}`, 'error');
      throw error;
    }
  },

  async previewChanges(request: CsvImportRequest): Promise<CsvImportResponse> {
    try {
      logger.log(`Previewing changes for CSV file: ${request.file_path}`, 'info');
      const result = await this.importCsvFile({
        ...request,
        preview_only: true
      });
      
      logger.log('Preview generated successfully', 'success');
      return result;
    } catch (error) {
      logger.log(`Failed to generate preview: ${error}`, 'error');
      throw error;
    }
  },

  async importCsvFile(request: CsvImportRequest): Promise<CsvImportResponse> {
    try {
      const startTime = Date.now();
      logger.log(`Importing CSV file: ${request.file_path}`, 'info');
      
      const result = await invoke('import_csv_file', { 
        filePath: request.file_path,
        semesterId: request.semester_id,
        forceUpdate: request.force_update || false,
        previewOnly: request.preview_only || false
      });
      
      const importResponse = result as CsvImportResponse;
      const duration = Date.now() - startTime;
      
      // Enhanced logging with detailed information
      logger.log(`CSV import ${request.preview_only ? 'preview' : 'operation'} completed in ${duration}ms`, 'info');
      logger.log(`Total Processed: ${importResponse.total_processed}`, 'info');
      logger.log(`Successful: ${importResponse.successful_imports}`, 'info');
      logger.log(`Failed: ${importResponse.failed_imports}`, 'info');

      if (importResponse.import_summary) {
        const summary = importResponse.import_summary;
        logger.log(`New accounts created: ${summary.new_accounts.length}`, 'info');
        logger.log(`Accounts updated: ${summary.updated_accounts.length}`, 'info');
        
        // Log details about updated fields
        summary.updated_accounts.forEach(update => {
          logger.log(
            `Updated account ${update.school_id}: ${update.updated_fields.join(', ')}`,
            'info'
          );
        });
      }

      if (importResponse.failed_imports > 0) {
        logger.log(`Import completed with errors: ${importResponse.error_details.length} errors found`, 'warn');
        importResponse.error_details.forEach(error => {
          logger.log(`Import error: ${error}`, 'error');
        });
      } else {
        logger.log('Import completed successfully with no errors', 'success');
      }

      if (importResponse.existing_account_info) {
        const info = importResponse.existing_account_info;
        logger.log(`Existing accounts to be processed: ${info.existing_accounts_count}`, 'info');
        logger.log(`New accounts to be created: ${info.new_accounts_count}`, 'info');
        
        // Log field update summary
        info.update_field_summary?.forEach(summary => {
          logger.log(
            `Field "${summary.field_name}" will be updated in ${summary.update_count} records`,
            'info'
          );
        });
      }

      return importResponse;
    } catch (error) {
      logger.log(`CSV import failed: ${error}`, 'error');
      throw error;
    }
  }
};