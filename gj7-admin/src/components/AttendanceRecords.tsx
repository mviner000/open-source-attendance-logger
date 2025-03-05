// AttendanceRecords.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { AttendanceApi, AttendanceWithDates, UpdateAttendanceRequest } from '../lib/attendance'
import { logger, LogLevel } from '../lib/logger'
import { downloadAttendanceTableAsPDF } from '@/utils/untallied_lanscape'
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import AuthModal from './AuthModal'
import AttendanceCard from './attendance/AttendanceCard'
import AttendanceTable from './attendance/AttendanceTable'
import SearchBar from './SearchBar'
import ViewToggle from './ViewToggle'

const AttendanceRecords: React.FC = () => {
  // States
  const [attendances, setAttendances] = useState<AttendanceWithDates[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authAction, setAuthAction] = useState<'create' | 'delete'>('create')
  const [credentials, setCredentials] = useState<{ username: string; password: string }>({ username: '', password: '' })
  const [attendanceToDelete, setAttendanceToDelete] = useState<string | null>(null)
  const [view, setView] = useState<'card' | 'table'>('card')

  const { toast } = useToast()

  // Fetch credentials
  const fetchCredentials = async () => {
    try {
      const creds = await AttendanceApi.getCredentials()
      setCredentials(creds)
    } catch (err) {
      console.error('Failed to fetch credentials:', err)
    }
  }

  // Callbacks
  const addToast = useCallback((message: string, level: LogLevel) => {
    toast({
      title: level.charAt(0).toUpperCase() + level.slice(1),
      description: message,
      variant: level === 'error' ? 'destructive' : 'default',
    })
  }, [toast])

  // Fetch all attendances
  const fetchAttendances = useCallback(async () => {
    try {
      setLoading(true)
      const fetchedAttendances = await AttendanceApi.getAllAttendances()
      setAttendances(fetchedAttendances)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attendances')
    } finally {
      setLoading(false)
    }
  }, [])

  // Search attendances
  const handleSearch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search attendances')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, fetchAttendances])

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchStatus(null)
    fetchAttendances()
  }

  // Handle auth submission
  const handleAuthSubmit = async (inputCredentials: { username: string; password: string }) => {
    try {
      if (inputCredentials.username === credentials.username && 
          inputCredentials.password === credentials.password) {
        setIsAuthModalOpen(false)
        if (authAction === 'create') {
          // Handle create action
        } else if (authAction === 'delete' && attendanceToDelete) {
          await deleteAttendance(attendanceToDelete, inputCredentials)
        }
      } else {
        addToast('Invalid credentials', 'error')
      }
    } catch (err) {
      addToast('Authentication failed', 'error')
    }
  }


  // Update attendance
  const handleUpdateAttendance = async (attendanceId: string, updatedAttendance: UpdateAttendanceRequest) => {
    try {
      await AttendanceApi.updateAttendance(attendanceId, updatedAttendance, credentials.username, credentials.password)
      await fetchAttendances()
      setError(null)
      addToast('Attendance record updated successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance')
      addToast('Failed to update attendance record', 'error')
    }
  }

  // Delete attendance after authentication
  const deleteAttendance = async (attendanceId: string, auth: { username: string; password: string }) => {
    try {
      await AttendanceApi.deleteAttendance(attendanceId, auth.username, auth.password)
      await fetchAttendances()
      setError(null)
      addToast('Attendance record deleted successfully', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete attendance')
      addToast('Failed to delete attendance record', 'error')
    } finally {
      setAttendanceToDelete(null)
    }
  }

  const handleDownloadPDF = useCallback(() => {
    if (attendances.length > 0) {
      downloadAttendanceTableAsPDF(attendances)
    } else {
      addToast('No attendance records to download', 'error')
    }
  }, [attendances, addToast])

  // Effects
  useEffect(() => {
    const handleLog = (log: { message: string; level: LogLevel }) => {
      addToast(log.message, log.level)
    }

    logger.addListener(handleLog)
    return () => logger.removeListener(handleLog)
  }, [addToast])

  useEffect(() => {
    fetchAttendances()
    fetchCredentials()
  }, [fetchAttendances])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, handleSearch])

  if (loading && !attendances.length) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <ToastProvider>
      <div className="p-4 max-w-4xl mx-auto">
        {error && (
          <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded mb-4">
            {error}
          </div>
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
            {attendances.map((attendance) => (
              <AttendanceCard
                key={attendance.id}
                attendance={attendance}
                onUpdate={handleUpdateAttendance}
                onDelete={(attendanceId) => {
                  setAttendanceToDelete(attendanceId)
                  setAuthAction('delete')
                  setIsAuthModalOpen(true)
                }}
              />
            ))}
          </div>
        ) : (
          <>
          <Button onClick={handleDownloadPDF} className="mb-4">
            Download Attendance Table in PDF
          </Button>
          <AttendanceTable attendances={attendances} />
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
  )
}

export default AttendanceRecords