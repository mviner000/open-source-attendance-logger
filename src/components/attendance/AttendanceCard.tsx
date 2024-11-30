// components/attendance/AttendanceCard.tsx

import React, { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CalendarDays } from 'lucide-react'
import { AttendanceWithDates, UpdateAttendanceRequest } from '@/lib/attendance'

interface AttendanceCardProps {
  attendance: AttendanceWithDates & { purpose_label?: string }
  onUpdate: (attendanceId: string, updatedAttendance: UpdateAttendanceRequest) => Promise<void>
  onDelete: (attendanceId: string) => void
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ attendance, onUpdate, onDelete }) => {
  const [editingState, setEditingState] = useState<{ field: 'school_id' | 'full_name' | 'classification' | null }>({ field: null })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleUpdate = async (field: 'school_id' | 'full_name' | 'classification', value: string) => {
    const updateRequest: UpdateAttendanceRequest = {}
    
    switch (field) {
      case 'school_id':
        updateRequest.school_id = value;
        break;
      case 'full_name':
        updateRequest.full_name = value;
        break;
      case 'classification':
        updateRequest.classification = value;
        break;
    }
  
    await onUpdate(attendance.id, updateRequest)
    setEditingState({ field: null })
  }

  const renderEditableField = (value: string, field: 'school_id' | 'full_name' | 'classification', placeholder: string) => {
    if (editingState.field === field) {
      return field === 'classification' ? (
        <Select 
          value={value} 
          onValueChange={(newValue) => handleUpdate(field, newValue)}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="visitor">Visitor</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={value}
          onChange={(e) => handleUpdate(field, e.target.value)}
          onBlur={() => setEditingState({ field: null })}
          placeholder={placeholder}
          autoFocus
        />
      )
    }
    return (
      <span 
        onClick={() => setEditingState({ field })}
        className="cursor-text hover:bg-accent hover:text-accent-foreground p-1 rounded"
      >
        {value}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {renderEditableField(attendance.full_name, 'full_name', 'Full Name')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex space-x-2 items-center">
          <span className="font-medium">School ID:</span>
          {renderEditableField(attendance.school_id, 'school_id', 'School ID')}
        </div>
        <div className="flex space-x-2 items-center">
          <span className="font-medium">Classification:</span>
          {renderEditableField(attendance.classification, 'classification', 'Select Classification')}
        </div>
        <div className="flex items-center text-xs text-muted-foreground mt-2 space-x-1">
          <CalendarDays className="w-4 h-4 flex-shrink-0" />
          <span className="flex-grow mt-1">
              {attendance.time_in_date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}{" - "}
              {attendance.time_in_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
        {attendance.purpose_label && (
          <div className="flex space-x-2 items-center">
            <span className="font-medium">Purpose:</span>
            <span>{attendance.purpose_label}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className='border-red-400 shadow-md'
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure you want to delete this attendance record?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the attendance record.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => onDelete(attendance.id)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}

export default AttendanceCard