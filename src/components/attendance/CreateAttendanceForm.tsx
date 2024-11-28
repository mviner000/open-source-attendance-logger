// components/notes/AttendanceCard.tsx

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateAttendanceRequest } from '@/lib/attendance'

interface CreateAttendanceFormProps {
  onCreateAttendance: (attendance: CreateAttendanceRequest) => Promise<void>
}

const CreateAttendanceForm: React.FC<CreateAttendanceFormProps> = ({ onCreateAttendance }) => {
  const [schoolId, setSchoolId] = useState('')
  const [purposeId, setPurposeId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedSchoolId = schoolId.trim()
    
    if (!trimmedSchoolId) {
      console.error('School ID is required')
      return
    }

    const attendanceData: CreateAttendanceRequest = {
      school_id: trimmedSchoolId,
      full_name: '', // Optional, will be filled by backend
      classification: '', // Will be automatically determined by backend
      purpose_id: purposeId.trim() || undefined
    }

    await onCreateAttendance(attendanceData)
    
    // Reset form
    setSchoolId('')
    setPurposeId('')
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Create Attendance</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="School ID"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            required
          />
          <Input
            type="text"
            placeholder="Purpose ID (Optional)"
            value={purposeId}
            onChange={(e) => setPurposeId(e.target.value)}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit">Create Attendance</Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default CreateAttendanceForm