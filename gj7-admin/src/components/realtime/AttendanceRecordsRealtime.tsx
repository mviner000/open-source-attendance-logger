import React, { useState, useCallback } from 'react';
import { useAttendanceWebSocket } from '@/utils/websocket';
import { AttendanceApi, UpdateAttendanceRequest } from '@/lib/attendance';
import { logger, LogLevel } from '@/lib/logger';
import { downloadAttendanceTableAsPDF } from '@/utils/pdfUtils';
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import AuthModal from '../AuthModal';
import AttendanceCard from '../attendance/AttendanceCard';
import AttendanceTable from '../attendance/AttendanceTable';
import SearchBar from '../SearchBar';
import ViewToggle from '../ViewToggle';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { convertToAttendanceWithDates } from '@/types/attendance';

const AttendanceRecordsRealtime: React.FC = () => {
  // WebSocket state
  const { attendances, isConnected, sendAttendance } = useAttendanceWebSocket();
  
  // Local states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAction, setAuthAction] = useState<'create' | 'delete'>('create');
  const [credentials, setCredentials] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [attendanceToDelete, setAttendanceToDelete] = useState<string | null>(null);
  const [view, setView] = useState<'card' | 'table'>('card');

  const { toast } = useToast();

  // Convert string dates to Date objects
  const attendancesWithDates = attendances.map(convertToAttendanceWithDates);

  // Fetch credentials
  const fetchCredentials = async () => {
    try {
      const creds = await AttendanceApi.getCredentials();
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to fetch credentials:', err);
    }
  };

  // Toast callback
  const addToast = useCallback((message: string, level: LogLevel) => {
    toast({
      title: level.charAt(0).toUpperCase() + level.slice(1),
      description: message,
      variant: level === 'error' ? 'destructive' : 'default',
    });
  }, [toast]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (!searchQuery) return;
    
    const filteredAttendances = attendancesWithDates.filter(attendance => 
      attendance.school_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attendance.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (attendance.purpose_label || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchStatus(`Found ${filteredAttendances.length} matching records`);
  }, [searchQuery, attendancesWithDates]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchStatus(null);
  };

  // Handle auth submission
  const handleAuthSubmit = async (inputCredentials: { username: string; password: string }) => {
    try {
      if (inputCredentials.username === credentials.username && 
          inputCredentials.password === credentials.password) {
        setIsAuthModalOpen(false);
        if (authAction === 'create') {
          // Handle create action through websocket
          sendAttendance({
            school_id: 'test',
            full_name: 'Test User',
            classification: 'Student'
          });
        } else if (authAction === 'delete' && attendanceToDelete) {
          await deleteAttendance(attendanceToDelete, inputCredentials);
        }
      } else {
        addToast('Invalid credentials', 'error');
      }
    } catch (err) {
      addToast('Authentication failed', 'error');
    }
  };

  // Update attendance
  const handleUpdateAttendance = async (attendanceId: string, updatedAttendance: UpdateAttendanceRequest) => {
    try {
      await AttendanceApi.updateAttendance(attendanceId, updatedAttendance, credentials.username, credentials.password);
      addToast('Attendance record updated successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance');
      addToast('Failed to update attendance record', 'error');
    }
  };

  // Delete attendance
  const deleteAttendance = async (attendanceId: string, auth: { username: string; password: string }) => {
    try {
      await AttendanceApi.deleteAttendance(attendanceId, auth.username, auth.password);
      addToast('Attendance record deleted successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attendance');
      addToast('Failed to delete attendance record', 'error');
    } finally {
      setAttendanceToDelete(null);
    }
  };

  const handleDownloadPDF = useCallback(() => {
    if (attendancesWithDates.length > 0) {
      downloadAttendanceTableAsPDF(attendancesWithDates);
    } else {
      addToast('No attendance records to download', 'error');
    }
  }, [attendancesWithDates, addToast]);

  const filteredAttendances = searchQuery
    ? attendancesWithDates.filter(attendance =>
        attendance.school_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendance.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (attendance.purpose_label || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : attendancesWithDates;

  if (loading && !attendances.length) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <ToastProvider>
      <div className="p-4 max-w-4xl mx-auto">
        {!isConnected && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Connection Lost</AlertTitle>
            <AlertDescription>
              Attempting to reconnect to real-time updates...
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center mb-4 space-x-4">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleClearSearch={handleClearSearch}
          />
          <ViewToggle
            view={view} 
            onViewChange={setView} 
          />
        </div>

        {searchStatus && (
          <div className="mb-4 text-sm text-muted-foreground">
            {searchStatus}
          </div>
        )}

        {view === 'card' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAttendances.map((attendance) => (
              <AttendanceCard
                key={attendance.id}
                attendance={attendance}
                onUpdate={handleUpdateAttendance}
                onDelete={(attendanceId) => {
                  setAttendanceToDelete(attendanceId);
                  setAuthAction('delete');
                  setIsAuthModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <>
            <Button onClick={handleDownloadPDF} className="mb-4">
              Download Attendance Table in PDF
            </Button>
            <AttendanceTable attendances={filteredAttendances} />
          </>
        )}
      </div>
      <ToastViewport />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleAuthSubmit}
        action={authAction === 'create' ? 'create a new attendance record' : 'delete the attendance record'}
      />
    </ToastProvider>
  );
};

export default AttendanceRecordsRealtime;