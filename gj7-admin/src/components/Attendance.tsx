// Attendance.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { AttendanceApi, CreateAttendanceRequest } from '../lib/attendance'
import { logger, LogLevel } from '../lib/logger'
import { ToastProvider, ToastViewport } from "@/components/ui/toast"
import { useToast } from '@/hooks/use-toast'
import CreateAttendanceForm from './attendance/CreateAttendanceForm'

const Attendance: React.FC = () => {
  // States
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Callbacks
  const addToast = useCallback((message: string, level: LogLevel) => {
    toast({
      title: level.charAt(0).toUpperCase() + level.slice(1),
      description: message,
      variant: level === 'error' ? 'destructive' : 'default',
    })
  }, [toast])

  // Create attendance 
  const createAttendance = async (
    newAttendance: CreateAttendanceRequest
  ) => {
    try {
      // Fetch credentials first
      const { username, password } = await AttendanceApi.getCredentials()
      await AttendanceApi.createAttendance(newAttendance, username, password)
      setError(null)
      addToast('Attendance record created successfully', 'success')
    } catch (err) {
      // Ensure we capture the exact error message

      const errorMessage = err instanceof Error 
        ? err.message  
        : String(err)  


      // Set the specific error message
      setError(errorMessage)
      addToast(errorMessage, 'error')
    }

  }

  // Effects
  useEffect(() => {
    const handleLog = (log: { message: string; level: LogLevel }) => {
      addToast(log.message, log.level)
    }

    logger.addListener(handleLog)
    return () => logger.removeListener(handleLog)
  }, [addToast])

  return (
    <ToastProvider>
      <div className="p-4 max-w-4xl mx-auto">
        {error && (
          <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <CreateAttendanceForm onCreateAttendance={createAttendance} />
      </div>
      <ToastViewport />
    </ToastProvider>
  )
}

export default Attendance