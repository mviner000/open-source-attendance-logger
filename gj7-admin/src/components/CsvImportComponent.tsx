// CsvImportComponent.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { CsvImportApi, CsvValidationResult, CsvImportResponse, LogMessage } from '../lib/csv_import';
import { Semester } from '../lib/semester';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, AlertCircle, CheckCircle, FileUp, ClipboardCheck, Upload, Check, MoveRight } from 'lucide-react';
import { CsvHeaderValidationErrors } from './CsvHeaderValidationErrors';
import CsvContentValidationErrors from './CsvContentValidationErrors';
import { SchoolAccount } from '@/lib/school_accounts';
import ImportLoadingState from './ImportLoadingState';
import SemesterSelection from './SemesterSelection';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from "@/components/ui/switch";
import { toast } from '@/hooks/use-toast';
import PinCodeModal from './PinCodeModal';

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
  const [showCreateConfirmation, setShowCreateConfirmation] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showExistingAccountInfo, setShowExistingAccountInfo] = useState(true);
  const [showImportSection, setShowImportSection] = useState(true);
  const [isFileImported, setIsFileImported] = useState(false);
  const [isShowingImportLoadingState, setIsShowingImportLoadingState] = useState(false);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [logListener, setLogListener] = useState<UnlistenFn | null>(null);
  const [useParallelImport, setUseParallelImport] = useState(false);
  const [showPinCodeModal, setShowPinCodeModal] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(3);
  const [parallelImportLocked, setParallelImportLocked] = useState(false);
  const [remainingLockTime, setRemainingLockTime] = useState(0);


  const handleLogMessage = useCallback((message: LogMessage) => {
    setLogMessages(prevMessages => {
      const isDuplicate = prevMessages.some(
        m => m.timestamp === message.timestamp && 
              m.message === message.message && 
              m.level === message.level
      );
      
      return isDuplicate ? prevMessages : [...prevMessages, message];
    });
  }, []);

  const handleFileSelect = async () => {
    try {
      if (isFileImported || existingAccountInfo || showStatistics) {
        return;
      }

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

  useEffect(() => {
    let unlistenFn: UnlistenFn | null = null;

    const setupLogListener = async () => {
      try {
        if (logListener) {
          logListener();
        }

        unlistenFn = await listen<LogMessage>('log-message', (event) => {
          handleLogMessage(event.payload);
        });

        setLogListener(() => unlistenFn);
      } catch (error) {
        console.error('Failed to set up log listener:', error);
      }
    };

    if (isImporting || isShowingImportLoadingState) {
      setupLogListener();
    }

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [isImporting, isShowingImportLoadingState, handleLogMessage]);

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
    setIsFileImported(false);
    setLogMessages([]);

    if (logListener) {
      logListener();
      setLogListener(null);
    }
  };

  const handleSemesterSelect = (semester: Semester) => {
    setSelectedSemester(semester);
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
    setLogMessages([]);
    setIsShowingImportLoadingState(true);

    const logListener = (message: LogMessage) => {
      setLogMessages(prev => [...prev, message]);
    };
    CsvImportApi.registerLogMessageListener(logListener);

    try {
      const importMethod = useParallelImport ? CsvImportApi.importCsvFileParallel : CsvImportApi.importCsvFile;
      const result = await importMethod({
        file_path: fullFilePath,
        semester_id: selectedSemester.id,
        force_update: forceUpdate
      });
    
      setImportResult(result);
      setShowStatistics(true);
      setCurrentStep(3);
      setIsFileImported(true);

      toast({
        title: "Import Successful",
        description: `Imported ${result.successful_imports} records successfully.`,
        duration: 5000,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);

      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsImporting(false);
      setIsShowingImportLoadingState(false);
      CsvImportApi.removeLogMessageListener(logListener);
    }
  };

  const handleImportClick = () => {
    const existingAccountCount = existingAccountInfo?.existing_accounts_count ?? 0;
      
    if (existingAccountCount > 0) {
      setShowUpdateConfirmation(true);
    } else {
      setShowCreateConfirmation(true);
    }
  };

  const handleFinish = () => {
    onImportSuccess();
  };

  const shouldShowCancelButton = (fullFilePath || isFileImported || existingAccountInfo) && !showStatistics;

  const handleParallelImportToggle = () => {
    if (!useParallelImport && !parallelImportLocked) {
      setShowPinCodeModal(true);
    } else if (useParallelImport) {
      setUseParallelImport(false);
    }
  };


  const handlePinVerification = (success: boolean) => {
    if (success) {
      setUseParallelImport(true);
      setShowPinCodeModal(false);
      setPinAttempts(3);
    } else {
      setPinAttempts((prev) => {
        if (prev === 1) {
          setParallelImportLocked(true);
          setRemainingLockTime(15 * 60); // 15 minutes in seconds
          setUseParallelImport(false);
          setShowPinCodeModal(false);
          return 3;
        }
        return prev - 1;
      });
    }
  };

  useEffect(() => {
    if (parallelImportLocked) {
      const interval = setInterval(() => {
        setRemainingLockTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setParallelImportLocked(false);
            setPinAttempts(3);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [parallelImportLocked]);

  return (
    <Card className="w-full max-w-4xl">
      {isShowingImportLoadingState ? (
        <ImportLoadingState />
      ) : (
        <>
          <CardHeader>
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center">
                <FileSpreadsheet className="mr-2" />
                <CardTitle>CSV Import</CardTitle>
              </div>
              {shouldShowCancelButton && (
                <Button 
                  variant="outlineAmber3d" 
                  onClick={() => {
                    resetState();
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardHeader>
        </>
      )}

      {currentStep > 0 && !isShowingImportLoadingState && (
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
              size="lg"
              variant="outline" 
              className="flex-grow border-green-500 hover:bg-green-50"
              disabled={isFileImported || !!existingAccountInfo || showStatistics}
            >
              <FileUp className="w-4 h-4" />
              <span className='mt-1'>
                {displayFileName ? `Selected: ${displayFileName}` : 'Select CSV File'}
              </span>
            </Button>
          </div>

          {fullFilePath && !isFileImported && !existingAccountInfo && (
            <div className="flex justify-end items-center">
              <Button 
                onClick={validateFile}
                variant="amber3d"
                disabled={!fullFilePath || isValidating}
                className={`flex items-center justify-center gap-2 pl-4 ${
                  isValidating || !fullFilePath ? 'bg-amber-400 cursor-not-allowed' : 'active:scale-95'
                }`}
              >
                <MoveRight className="w-5 h-5" />
                <span className='mt-1 text-base'>
                  {isValidating ? 'Validating...' : 'Validate File'}
                </span>
              </Button>
            </div>
          )}

          <PinCodeModal
              isOpen={showPinCodeModal}
              onClose={() => setShowPinCodeModal(false)}
              onVerify={handlePinVerification}
              attemptsRemaining={pinAttempts}
              locked={parallelImportLocked}
              remainingTime={remainingLockTime}
            />

          {validationResult?.is_valid && showImportSection && !isShowingImportLoadingState && !showStatistics && !showUpdateConfirmation && !showCreateConfirmation && (
            <>
                <div className="space-y-2">
                  <SemesterSelection 
                    onSemesterSelect={handleSemesterSelect}
                  />
                </div>

                {selectedSemester && (
                <div className="flex justify-end items-center">
                  <Button 
                    onClick={handleImportClick} 
                    disabled={isImporting}
                    variant="amber3d"
                    className="flex items-center justify-center gap-2 pl-4"
                  >
                    <MoveRight className="w-4 h-4" />
                    <span className='mt-1'>
                    {isImporting ? 'Processing...' : 'Continue'}
                    </span>
                  </Button>
                </div>
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

          {isShowingImportLoadingState && (
            <Card className="mt-4 bg-black">
            <CardHeader>
              <CardTitle className="matrix-title">Import Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded-md matrix-scroll-area">
                {logMessages
                  .slice()
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((log, index) => (
                    <div 
                      key={index} 
                      className={`mb-2 p-2 rounded matrix-log-entry ${
                        log.level === 'error' 
                          ? 'matrix-log-error' 
                          : log.level === 'warn' 
                          ? 'matrix-log-warn'
                          : 'matrix-log-info'
                      } matrix-font matrix-fade-in`}
                    >
                      <div className="flex justify-between text-xs">
                        <span>{log.timestamp}</span>
                        <span className="font-bold uppercase">
                          {log.level}
                        </span>
                      </div>
                      <div className="mt-1 text-sm">{log.message}</div>
                    </div>
                  ))}
                {logMessages.length === 0 && (
                  <div className="text-center matrix-initializing matrix-font">
                    Initializing import process...
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          )}

          {showStatistics && importResult && importResult.account_status_counts && (
            <Alert variant="default" className="bg-green-50 border-green-300 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
                <AlertTitle className="text-2xl font-bold text-green-800 mt-2">Import Successful</AlertTitle>
              </div>
              <AlertDescription>
                <div className="space-y-4">
                  {importResult.existing_account_info && (
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">New Created Accounts</p>
                        <p className="text-2xl font-bold text-blue-800">{importResult.existing_account_info.new_accounts_count}</p>
                      </div>
                      <div className="bg-yellow-100 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Updated Accounts</p>
                        <p className="text-2xl font-bold text-yellow-800">{importResult.existing_account_info.existing_accounts_count}</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Total in Database</p>
                        <p className="text-2xl font-bold text-purple-800">{importResult.account_status_counts.total_accounts}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-green-200 px-3 pt-3 border border-green-900 pb-0 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold">Active Accounts</p>
                      <p className="text-4xl font-extrabold text-green-900">{importResult.account_status_counts.activated_accounts}</p>
                    </div>
                    <div className="bg-red-200 px-3 pt-3 border border-red-900 pb-0 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase tracking-wider font-bold">Inactive Accounts</p>
                      <p className="text-4xl font-extrabold  text-red-900">{importResult.account_status_counts.deactivated_accounts}</p>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {importResult && importResult.failed_imports > 0 && (
            <Alert variant="destructive" className="bg-red-50 border-red-300">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600 mr-4" />
                <div>
                  <AlertTitle className="text-xl font-bold text-red-800 mb-2">Import Completed with Partial Errors</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-red-100 p-2 rounded">
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Total Processed</p>
                          <p className="text-lg font-semibold text-red-700">{importResult.total_processed}</p>
                        </div>
                        <div className="bg-green-100 p-2 rounded">
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Successfully Imported</p>
                          <p className="text-lg font-semibold text-green-700">{importResult.successful_imports}</p>
                        </div>
                        <div className="bg-red-200 p-2 rounded">
                          <p className="text-xs text-gray-600 uppercase tracking-wider">Failed Imports</p>
                          <p className="text-lg font-semibold text-red-800">{importResult.failed_imports}</p>
                        </div>
                      </div>
                      
                      <div className="bg-red-100 p-3 rounded-lg">
                        <p className="font-bold text-red-800 mb-2 text-sm">Error Details:</p>
                        <ul className="space-y-1 text-xs text-red-700">
                          {importResult.error_details.slice(0, 5).map((err, index) => (
                            <li key={index} className="flex items-center">
                              <AlertCircle className="w-3 h-3 mr-2 text-red-500" />
                              {err}
                            </li>
                          ))}
                          {importResult.error_details.length > 5 && (
                            <li className="text-gray-600 italic">
                              ... and {importResult.error_details.length - 5} more errors
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {showExistingAccountInfo && existingAccountInfo && (
            <div>
              {/* Existing account information display */}
            </div>
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
              variant="green3d"
              className='w-full text-white'
            >
              <Check className="w-4 h-4" />
              <span className='mt-1 -ml-1'>Completely Done</span>
            </Button>
          )}

          <Dialog 
            open={showCreateConfirmation} 
            onOpenChange={(open) => setShowCreateConfirmation(open)}
          >
            <DialogContent className="bg-white shadow-2xl border-2 border-green-100">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-green-800 flex items-center">
                  Confirm Account Creation
                </DialogTitle>
                
                <DialogDescription className="space-y-4 text-gray-700">
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p>You are about to create <span className="font-bold text-green-700 text-2xl">{existingAccountInfo?.new_accounts_count ?? 0}</span> new accounts.</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="font-bold text-yellow-700 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      This will add new accounts to the system
                    </p>
                  </div>
                  <p className="text-gray-600 italic">Are you sure you want to proceed with creating these accounts?</p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex space-x-2 justify-between">
                <div className="mt-2 relative text-left w-full space-x-2">
                    <Switch
                      id="import-method"
                      checked={useParallelImport}
                      onCheckedChange={handleParallelImportToggle}
                      disabled={parallelImportLocked}
                    />
                    <div className='text-xs absolute bottom-[1px] -left-2'>
                      {useParallelImport ? '(Faster)' : ''} Switch to Pro
                    </div>
                </div>
                <div className='flex space-x-2'>
                  <Button
                    variant="outlineAmber3d"
                    onClick={() => setShowCreateConfirmation(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="green3d"
                    className='flex items-center'
                    onClick={async () => {
                      setShowCreateConfirmation(false);
                      const result = await importFile(false);
                      if (result && result.failed_imports === 0) {
                        setShowStatistics(true);
                      }
                    }}
                  >
                    <Check className="w-4 h-4" />
                    <span className='mt-1 -ml-1'>Create Accounts</span>
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showUpdateConfirmation}  onOpenChange={(open) => {
            setShowUpdateConfirmation(open);
            setShowExistingAccountInfo(open);
          }}>
            <DialogContent className="bg-white shadow-2xl border-2 border-green-100">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-green-800 flex items-center">
                  Confirm Account Update 
                </DialogTitle>
                
                <DialogDescription className="space-y-4 text-gray-700">
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <ul className="list-disc list-inside text-yellow-900 space-y-1">
                      <li className="flex items-center">
                        - Update <span className="font-bold mx-1 text-green-700 text-2xl">{existingAccountInfo?.existing_accounts_count}</span> <span className='underline underline-offset-2 italic'>existing accounts</span>
                      </li>
                      <li className="flex items-center">
                        - Create <span className="font-bold mx-1 text-green-700 text-2xl">{existingAccountInfo?.new_accounts_count}</span> new accounts
                      </li>
                    </ul>
                  </div>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="font-bold text-red-700 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Warning: This action <span className="mx-1 uppercase text-red-900">cannot be undone</span>
                    </p>
                  </div>
                  <p className="text-gray-600 italic">Are you sure you want to proceed with this update?</p>
                  
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex space-x-2 justify-between">
                <div className="mt-2 relative text-left w-full space-x-2">
                  <Switch
                    id="import-method"
                    checked={useParallelImport}
                    onCheckedChange={handleParallelImportToggle}
                    disabled={parallelImportLocked}
                  />
                  <div className='text-xs absolute bottom-[1px] -left-2'>
                    {useParallelImport ? '(Faster)' : ''} Switch to Pro
                  </div>
                </div>
                <div className='flex space-x-2'>
                  <Button
                    variant="outlineAmber3d"
                    onClick={() => setShowUpdateConfirmation(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="green3d"
                    className='flex items-center'
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
                    <Check className="w-4 h-4" />
                    <span className='mt-1 -ml-1'>Continue with Update</span>
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default CsvImportComponent;