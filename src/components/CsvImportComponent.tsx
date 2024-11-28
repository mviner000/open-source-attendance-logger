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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, AlertCircle, AlertTriangle, CheckCircle, FileUp, ClipboardCheck, Upload, Check } from 'lucide-react';
import { CsvHeaderValidationErrors } from './CsvHeaderValidationErrors';
import CsvContentValidationErrors from './CsvContentValidationErrors';
import { SchoolAccount } from '@/lib/school_accounts';

interface CsvImportComponentProps {
  onImportSuccess: () => void;
}

interface ExistingAccountInfo {
  existing_accounts: SchoolAccount[];
  new_accounts_count: number;
  existing_accounts_count: number;
}

const steps = [
  { id: 'select', label: 'Select File', icon: FileUp },
  { id: 'validate', label: 'Validate', icon: ClipboardCheck },
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'finish', label: 'Finish', icon: Check },
];

export const CsvImportComponent: React.FC<CsvImportComponentProps> = ({ onImportSuccess }) => {
  const [fullFilePath, setFullFilePath] = useState<string | null>(null);
  const [displayFileName, setDisplayFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);
  const [existingAccountInfo, setExistingAccountInfo] = useState<ExistingAccountInfo | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showExistingAccountInfo, setShowExistingAccountInfo] = useState(true);
  const [showImportSection, setShowImportSection] = useState(true);

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
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        multiple: false,
        directory: false
      });

      if (selected) {
        setFullFilePath(selected);
        setDisplayFileName(selected.split(/[\\/]/).pop() || selected);
        resetState();
        setCurrentStep(1);
      }
    } catch (err) {
      setError('Failed to select file');
      console.error(err);
    }
  };

  const resetState = () => {
    setError(null);
    setValidationResult(null);
    setImportResult(null);
    setSelectedSemester(null);
    setExistingAccountInfo(null);
    setShowUpdateConfirmation(false);
    setShowStatistics(false);
    setCurrentStep(0);
    setShowExistingAccountInfo(true);
    setShowImportSection(true);
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
      
      const accountInfo = await CsvImportApi.checkExistingAccounts(fullFilePath);
      setExistingAccountInfo(accountInfo);
      setCurrentStep(2);
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const importFile = async (forceUpdate: boolean = false) => {
    if (!fullFilePath || !selectedSemester) {
      setError('Please select both a file and semester');
      return;
    }

    setIsImporting(true);
    setError(null);
    setShowUpdateConfirmation(false);

    try {
      const result = await CsvImportApi.importCsvFile({
        file_path: fullFilePath,
        semester_id: selectedSemester.id,
        force_update: forceUpdate
      });
      
      setImportResult(result);
      setShowStatistics(true);
      setCurrentStep(3);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportClick = () => {
    const existingAccountCount = existingAccountInfo?.existing_accounts_count ?? 0;
      
    if (existingAccountCount > 0) {
      setShowUpdateConfirmation(true);
    } else {
      importFile(false);
    }
  };

  const handleFinish = () => {
    onImportSuccess();
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center">
            <FileSpreadsheet className="mr-2" />
            <CardTitle>CSV Import</CardTitle>
          </div>
          <Button 
            variant="outline" 
            className="border-red-500 text-red-500 hover:bg-red-50"
            onClick={() => {
              resetState();
            }}
          >
            Cancel
          </Button>
        </div>
      </CardHeader>
      {currentStep > 0 && (
        <div className="px-6 py-2">
          <Progress value={(currentStep / steps.length) * 100} className="w-full" />
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div key={step.id} className={`flex flex-col items-center ${index < currentStep ? 'text-green-500' : 'text-gray-400'}`}>
                <step.icon className="w-6 h-6" />
                <span className="text-xs mt-1">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Button 
              onClick={handleFileSelect} 
              variant="outline" 
              className="flex-grow border-green-500 hover:bg-green-50"
            >
              <FileUp className="w-4 h-4 mr-2" />
              {displayFileName ? `Selected: ${displayFileName}` : 'Select CSV File'}
            </Button>
          </div>

          {fullFilePath && (
            <div className="flex space-x-4">
              <Button 
                onClick={validateFile} 
                disabled={!fullFilePath || isValidating}
                variant="secondary"
                className="flex-grow"
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                {isValidating ? 'Validating...' : 'Validate File'}
              </Button>
            </div>
          )}

          {existingAccountInfo && showExistingAccountInfo && (
            <Alert variant="default" className="border-green-500">
              <AlertTriangle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Account Overview</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>New accounts to be created: {existingAccountInfo.new_accounts_count}</p>
                <p>Existing accounts that will be updated: {existingAccountInfo.existing_accounts_count}</p>
                {existingAccountInfo.existing_accounts.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Accounts to be updated:</p>
                    <ul className="list-disc list-inside mt-1">
                      {existingAccountInfo.existing_accounts.slice(0, 5).map((account, index) => (
                        <li key={index}>
                          {account.school_id} - {account.first_name} {account.last_name}
                        </li>
                      ))}
                      {existingAccountInfo.existing_accounts.length > 5 && (
                        <li>... and {existingAccountInfo.existing_accounts.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {validationResult?.is_valid && showImportSection && (
            <>
              <div className="space-y-2">
                <Select 
                  value={selectedSemester?.id} 
                  onValueChange={(selectedId) => {
                    const semester = semesters.find(s => s.id === selectedId);
                    setSelectedSemester(semester || null);
                  }}
                >
                  <SelectTrigger className="bg-black text-slate-200">
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

              {selectedSemester && (
                <Button 
                  onClick={handleImportClick} 
                  disabled={isImporting}
                  variant="default"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Import File'}
                </Button>
              )}
            </>
          )}

          {validationResult && !validationResult.is_valid && (
            <>
              {validationResult.validation_errors.some(err => err.row_number === 0) && (
                <CsvHeaderValidationErrors errors={validationResult.validation_errors} />
              )}
              {validationResult.validation_errors.some(err => err.row_number > 0) && (
                <CsvContentValidationErrors errors={validationResult.validation_errors} />
              )}
            </>
          )}

          {importResult && importResult.failed_imports === 0 && (
            <Alert variant="default" className="border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Import Successful</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>Total Processed: {importResult.total_processed}</p>
                  <p>Successfully Imported: {importResult.successful_imports}</p>
                  
                  {importResult.existing_account_info && (
                    <>
                      <p>New Accounts Created: {importResult.existing_account_info.new_accounts_count}</p>
                      <p>Existing Accounts Updated: {importResult.existing_account_info.existing_accounts_count}</p>
                    </>
                  )}
                  
                </div>
              </AlertDescription>
            </Alert>
          )}

          {showStatistics && importResult && importResult.account_status_counts && (
            <Alert variant="default" className="border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Import Successful - Account Statistics</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>Total Accounts in Database: {importResult.account_status_counts.total_accounts}</p>
                  <p>Activated Accounts: {importResult.account_status_counts.activated_accounts}</p>
                  <p>Deactivated Accounts: {importResult.account_status_counts.deactivated_accounts}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {importResult && importResult.failed_imports > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Completed with Errors</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>Total Processed: {importResult.total_processed}</p>
                  <p>Successfully Imported: {importResult.successful_imports}</p>
                  <p>Failed Imports: {importResult.failed_imports}</p>
                  
                  <div>
                    <p className="font-semibold mt-2">Error Details:</p>
                    <ul className="list-disc list-inside">
                      {importResult.error_details.slice(0, 5).map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                      {importResult.error_details.length > 5 && (
                        <li>... and {importResult.error_details.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                </div>
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

          {currentStep === 3 && importResult && importResult.failed_imports === 0 && (
            <Button 
              onClick={handleFinish}
              variant="default"
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              Finish
            </Button>
          )}

          <Dialog open={showUpdateConfirmation} onOpenChange={setShowUpdateConfirmation}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Update</DialogTitle>
                <DialogDescription className="space-y-2">
                  <p>You are about to:</p>
                  <ul className="list-disc list-inside">
                    <li>Update {existingAccountInfo?.existing_accounts_count} existing accounts</li>
                    <li>Create {existingAccountInfo?.new_accounts_count} new accounts</li>
                  </ul>
                  <p className="font-semibold text-red-500">This action cannot be undone.</p>
                  <p>Do you want to continue?</p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUpdateConfirmation(false)}
                  className="border-green-500 hover:bg-green-50"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    setShowExistingAccountInfo(false);
                    setShowImportSection(false);
                    const result = await importFile(true);
                    if (result && result.failed_imports === 0) {
                      setShowStatistics(true);
                      setShowUpdateConfirmation(false);
                    }
                  }}
                >
                  Continue with Update
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default CsvImportComponent;

