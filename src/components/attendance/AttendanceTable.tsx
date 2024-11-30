// components/attendance/AttendanceTable.tsx

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AttendanceWithDates } from '@/lib/attendance'

interface AttendanceTableProps {
  attendances: AttendanceWithDates[]
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ attendances }) => {
  return (
    <div className='p-4 bg-white -mx-64'>
        <div className='text-center w-full'>
        <img 
            src='/attendance_records_header.png' 
            alt='Attendance Records Header' 
            className='mb-4' 
        />
        <p className=''>
        Updated Daily Record of Library Users SY: 2024-2025 November 20, 2024
        </p>
        </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Full Name</TableHead>
          <TableHead>Classification</TableHead>
          <TableHead>Purpose</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {attendances.map((attendance) => (
          <TableRow key={attendance.id}>
            <TableCell>
              {attendance.time_in_date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
              })}
            </TableCell>
            <TableCell>
              {attendance.time_in_date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </TableCell>
            <TableCell>{attendance.full_name}</TableCell>
            <TableCell>{attendance.classification}</TableCell>
            <TableCell>{attendance.purpose_label || 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  )
}

export default AttendanceTable

