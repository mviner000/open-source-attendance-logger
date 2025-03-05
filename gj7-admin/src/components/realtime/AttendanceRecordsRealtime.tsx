// src/realtime/AttendanceRecordsRealtime.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { useAttendanceWebSocket } from '@/utils/websocket';
import { LogLevel } from '@/lib/logger';
import { downloadAttendanceTableAsPDF } from '@/utils/pdfUtils';
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import SearchBar from '../SearchBar';
import ViewToggle from '../ViewToggle';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AttendanceWithDates, convertToAttendanceWithDates } from '@/types/attendance';
import FilteredAttendanceTable from '../FilteredAttendanceTable';

const AttendanceRecordsRealtime: React.FC = () => {
  const { attendances: rawAttendances, isConnected } = useAttendanceWebSocket();
  const attendances = rawAttendances.map(convertToAttendanceWithDates);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');

  const { toast } = useToast();

  const addToast = useCallback((message: string, level: LogLevel) => {
    toast({
      title: level.charAt(0).toUpperCase() + level.slice(1),
      description: message,
      variant: level === 'error' ? 'destructive' : 'default',
    });
  }, [toast]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchStatus(null);
  };

  useEffect(() => {
    console.log('WebSocket Connection Status Changed:', isConnected);
  }, [isConnected]);

  const handleDownloadPDF = useCallback(() => {
    if (attendances.length > 0) {
      downloadAttendanceTableAsPDF(attendances as AttendanceWithDates[]);
    } else {
      addToast('No attendance records to download', 'error');
    }
  }, [attendances, addToast]);


  return (
    <ToastProvider>
      <div className="max-w-screen-xl mx-auto mt-5 mb-5 px-4 sm:px-6 lg:px-0">
      <FilteredAttendanceTable
        initialCourse="ALL"
        initialDate={new Date()}
      />

        {!isConnected && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Connection Lost</AlertTitle>
            <AlertDescription>
              Attempting to reconnect to real-time updates...
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-end space-x-2 max-w-screen-xl mx-auto mt-5 mb-5 px-4 sm:px-6 lg:px-0">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleClearSearch={handleClearSearch}
          />
          <div className='hidden'>
          <ViewToggle
            view={view} 
            onViewChange={setView} 
          />
          </div>
            <Button size="sm" variant="amber3d" onClick={handleDownloadPDF} className="py-[18px]">
              Download Attendance Table in PDF
            </Button>
        </div>

        {searchStatus && (
          <div className="mb-4 text-sm text-muted-foreground">
            {searchStatus}
          </div>
        )}
      </div>
      <ToastViewport />
    </ToastProvider>
  );
};

export default AttendanceRecordsRealtime;

