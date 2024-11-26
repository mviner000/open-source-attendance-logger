// components/CsvImportComponent.tsx

import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { CsvImportApi } from '../lib/csv_import';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

export const CsvImportComponent: React.FC = () => {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);


// Correct type definition for the open method
const handleFileSelect = async () => {
  try {
    const selected = await open({
      filters: [{
        name: 'CSV',
        extensions: ['csv']
      }],
      multiple: false,
      directory: false
    });

    if (selected) {
      setFilePath(selected);
      setError(null);
      setValidationResult(null);
      setImportResult(null);
    }
  } catch (err) {
    setError('Failed to select file');
    console.error(err);
  }
};

  const validateFile = async () => {
    if (!filePath) {
      setError('Please select a file first');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await CsvImportApi.validateCsvFile(filePath);
      setValidationResult(result);
      setIsValidating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setIsValidating(false);
    }
  };

  const importFile = async () => {
    if (!filePath) {
      setError('Please select a file first');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const result = await CsvImportApi.importCsvFile(filePath);
      setImportResult(result);
      setIsImporting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileSpreadsheet className="mr-2" /> 
          CSV Import
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Selection */}
          <div className="flex space-x-4">
            <Button 
              onClick={handleFileSelect} 
              variant="outline" 
              className="flex-grow"
            >
              {filePath ? `Selected: ${filePath.split('\\').pop()}` : 'Select CSV File'}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button 
              onClick={validateFile} 
              disabled={!filePath || isValidating}
              variant="secondary"
              className="flex-grow"
            >
              {isValidating ? 'Validating...' : 'Validate File'}
            </Button>
            <Button 
              onClick={importFile} 
              disabled={!filePath || isImporting || !validationResult?.is_valid}
              variant="default"
              className="flex-grow"
            >
              {isImporting ? 'Importing...' : 'Import File'}
            </Button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <Alert variant={validationResult.is_valid ? 'default' : 'destructive'}>
              {validationResult.is_valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {validationResult.is_valid ? 'Validation Successful' : 'Validation Failed'}
              </AlertTitle>
              <AlertDescription>
                Total Rows: {validationResult.total_rows}
                <br />
                Validated Rows: {validationResult.validated_rows}
                {!validationResult.is_valid && (
                  <>
                    <br />
                    Validation Errors:
                    <ul className="list-disc list-inside">
                      {validationResult.validation_errors.map((err: string, index: number) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert variant={importResult.failed_imports === 0 ? 'default' : 'destructive'}>
              {importResult.failed_imports === 0 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {importResult.failed_imports === 0 
                  ? 'Import Successful' 
                  : `Import Partially Failed (${importResult.failed_imports} errors)`}
              </AlertTitle>
              <AlertDescription>
                Total Processed: {importResult.total_processed}
                <br />
                Successful Imports: {importResult.successful_imports}
                <br />
                Failed Imports: {importResult.failed_imports}
                {importResult.failed_imports > 0 && (
                  <>
                    <br />
                    Error Details:
                    <ul className="list-disc list-inside">
                      {importResult.error_details.slice(0, 5).map((err: string, index: number) => (
                        <li key={index}>{err}</li>
                      ))}
                      {importResult.error_details.length > 5 && (
                        <li>... and {importResult.error_details.length - 5} more</li>
                      )}
                    </ul>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CsvImportComponent;