import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreateAttendanceRequest } from '@/lib/attendance'

interface CreateAttendanceFormProps {
  onCreateAttendance: (attendance: CreateAttendanceRequest) => Promise<void>
}

const CreateAttendanceForm: React.FC<CreateAttendanceFormProps> = ({ onCreateAttendance }) => {
  const [schoolId, setSchoolId] = useState('')
  const [fullName, setFullName] = useState('')
  const [classification, setClassification] = useState('')
  const [purposeId, setPurposeId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedSchoolId = schoolId.trim()
    const trimmedFullName = fullName.trim()
    const trimmedClassification = classification.trim()

    if (!trimmedSchoolId || !trimmedFullName || !trimmedClassification) {
      console.error('School ID, Full Name, and Classification are required')
      return
    }

    const attendanceData: CreateAttendanceRequest = {
      school_id: trimmedSchoolId,
      full_name: trimmedFullName,
      classification: trimmedClassification,
      purpose_id: purposeId.trim() || undefined
    }

    await onCreateAttendance(attendanceData)
    setSchoolId('')
    setFullName('')
    setClassification('')
    setPurposeId('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
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
            onKeyPress={handleKeyPress}
            required
          />
          <Input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyPress={handleKeyPress}
            required
          />
          <Select 
            value={classification} 
            onValueChange={setClassification}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="visitor">Visitor</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Purpose ID (Optional)"
            value={purposeId}
            onChange={(e) => setPurposeId(e.target.value)}
            onKeyPress={handleKeyPress}
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