import React, { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { CsvImportApi, CsvValidationResult, CsvImportResponse } from '../lib/csv_import';
import { SemesterApi, Semester } from '../lib/semester';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CsvHeaderValidationErrors } from './CsvHeaderValidationErrors';

interface CsvImportComponentProps {
  onImportSuccess: () => void;
}

export const CsvImportComponent: React.FC<CsvImportComponentProps> = ({ onImportSuccess }) => {
  const [fullFilePath, setFullFilePath] = useState<string | null>(null);
  const [displayFileName, setDisplayFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const fetchedSemesters = await SemesterApi.getAllSemesters();
        setSemesters(fetchedSemesters);
      } catch (err) {
        setError('Failed to fetch semesters');
        console.error(err);
      }
    };

    fetchSemesters();
  }, []);

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
        setFullFilePath(selected);
        // Truncate the displayed filename to show only the last part
        const truncatedFileName = selected.split(/[\\/]/).pop() || selected;
        setDisplayFileName(truncatedFileName);
        setError(null);
        setValidationResult(null);
        setImportResult(null);
        setSelectedSemester(null);
      }
    } catch (err) {
      setError('Failed to select file');
      console.error(err);
    }
  };

  const validateFile = async () => {
    if (!fullFilePath) {
      setError('Please select a file first');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await CsvImportApi.validateCsvFile(fullFilePath);
      setValidationResult(result);
      setIsValidating(false);
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
      setIsValidating(false);
    }
  };

  const importFile = async () => {
    if (!fullFilePath) {
      setError('Please select a file first');
      return;
    }

    if (!selectedSemester) {
      setError('Please select a semester');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const importResult = await CsvImportApi.importCsvFile({
        file_path: fullFilePath, 
        semester_id: selectedSemester.id
      });
      
      setImportResult(importResult);
      
      if (importResult.failed_imports === 0) {
        onImportSuccess();
      }
      
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
          <div className="flex space-x-4">
            <Button 
              onClick={handleFileSelect} 
              variant="outline" 
              className="flex-grow"
            >
              {displayFileName ? `Selected: ${displayFileName}` : 'Select CSV File'}
            </Button>
          </div>

          <div className="flex space-x-4">
            <Button 
              onClick={validateFile} 
              disabled={!fullFilePath || isValidating}
              variant="secondary"
              className="flex-grow"
            >
              {isValidating ? 'Validating...' : 'Validate File'}
            </Button>
          </div>

          {validationResult?.is_valid && (
            <div className="space-y-2">
              <Select 
                value={selectedSemester?.id} 
                onValueChange={(selectedId) => {
                  const semester = semesters.find(s => s.id === selectedId);
                  setSelectedSemester(semester || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map(semester => (
                    <SelectItem key={semester.id} value={semester.id}>
                      {semester.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {validationResult?.is_valid && selectedSemester && (
            <Button 
              onClick={importFile} 
              disabled={isImporting}
              variant="default"
              className="w-full"
            >
              {isImporting ? 'Importing...' : 'Import File'}
            </Button>
          )}

          {validationResult && !validationResult.is_valid && (
            <CsvHeaderValidationErrors errors={validationResult.validation_errors} />
          )}

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
                {validationResult.is_valid && (
                  <>
                    Total Rows: {validationResult.total_rows}
                    <br />
                    Validated Rows: {validationResult.validated_rows}
                  </>
                )}
                
                {!validationResult.is_valid && (
                  <>
                    Validation Errors:
                    <ul className="list-disc list-inside">
                      {validationResult.validation_errors
                        .filter(err => err.row_number > 0)
                        .map((err, index) => (
                          <li key={index}>
                            {err.error_message} 
                            {err.field ? ` (Field: ${err.field})` : ''} 
                            {err.row_number > 0 ? ` at row ${err.row_number}` : ''}
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

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
                      {importResult.error_details.slice(0, 5).map((err, index) => (
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
