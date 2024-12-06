// components/attendance/AttendanceList.tsx

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreateAttendanceRequest } from '@/lib/attendance'
import { Purpose, PurposeApi } from '@/lib/purpose'
import PurposeCard from '@/components/purpose/PurposeCard'
import { PurposeModal } from '../purpose-modal'
import { cn } from '@/lib/utils'

interface CreateAttendanceFormProps {
  onCreateAttendance: (attendance: CreateAttendanceRequest) => Promise<void>
}

const CreateAttendanceForm: React.FC<CreateAttendanceFormProps> = ({ onCreateAttendance }) => {
  const [schoolId, setSchoolId] = useState('')
  const [selectedPurpose, setSelectedPurpose] = useState<Purpose | null>(null)
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch purposes when component mounts
  useEffect(() => {
    const fetchPurposes = async () => {
      try {
        setLoading(true)
        const fetchedPurposes = await PurposeApi.getAllPurposes()
        // Filter out deleted purposes
        setPurposes(fetchedPurposes.filter(purpose => !purpose.is_deleted))
      } catch (error) {
        console.error('Failed to fetch purposes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPurposes()
  }, [])

  const handlePurposeSelect = (purpose: Purpose) => {
    setSelectedPurpose(purpose)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedSchoolId = schoolId.trim()
    
    if (!trimmedSchoolId) {
      console.error('School ID is required')
      return
    }

    // Ensure a purpose is selected
    if (!selectedPurpose) {
      console.error('Please select a purpose')
      return
    }

    const attendanceData: CreateAttendanceRequest = {
      school_id: trimmedSchoolId,
      full_name: '', // Optional, will be filled by backend
      classification: '', // Will be automatically determined by backend
      purpose_label: selectedPurpose.label  // Changed from purpose_id to purpose_label
    }

    await onCreateAttendance(attendanceData)
    
    // Reset form
    setSchoolId('')
    setSelectedPurpose(null)
  }

  return (
    <Card className="pb-2">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="School ID"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            required
            className='hidden'
          />
          
          <div>
            <PurposeModal onUpdate={() => window.location.reload()} />
            {loading ? (
              <p>Loading purposes...</p>
            ) : purposes.length === 0 ? (
              <p className="text-muted-foreground">No purposes available</p>
            ) : (
              <ScrollArea className="w-full mt-5">
                <div className="grid grid-cols-3 gap-4 pr-4">
                  {purposes.map((purpose) => (
                    <PurposeCard
                      key={purpose.id}
                      label={purpose.label}
                      iconName={purpose.icon_name}
                      className={cn(
                        selectedPurpose?.label === purpose.label 
                          ? 'border-green-500 shadow-md bg-green-50' 
                          : ''
                      )}
                      iconColor={selectedPurpose?.label === purpose.label ? 'text-green-500' : 'text-amber-500'}
                      onClick={() => handlePurposeSelect(purpose)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

export default CreateAttendanceForm