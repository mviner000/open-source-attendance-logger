// src/components/AttendanceViewer.tsx
import React, { useEffect, useMemo, useCallback } from 'react';
import { useAttendanceWebSocket, Attendance } from '@/utils/websocket';
import { format, parseISO, isValid } from 'date-fns';

const AttendanceViewer: React.FC = () => {
  const { attendances, isConnected } = useAttendanceWebSocket();

  // Move formatDate to be a useCallback to ensure it's always defined
  const formatDate = useCallback((dateString: string) => {
    try {
      const parsedDate = parseISO(dateString);
      return isValid(parsedDate) 
        ? format(parsedDate, 'yyyy-MM-dd HH:mm:ss')
        : 'Invalid Date';
    } catch (error) {
      console.error('Date parsing error:', error);
      return 'Invalid Date';
    }
  }, []); // Empty dependency array means this function never changes

  // Add useEffect to log when attendances are fetched
  useEffect(() => {
    if (attendances.length > 0) {
      console.log(`Successfully fetched ${attendances.length} attendance records from server`);
      
      // Debug: Check for any duplicate IDs
      const uniqueIds = new Set(attendances.map(a => a.id));
      if (uniqueIds.size !== attendances.length) {
        console.warn('Duplicate attendance IDs detected!');
        console.warn('Problematic attendances:', 
          attendances.filter((a, index, self) => 
            self.findIndex(t => t.id === a.id) !== index
          )
        );
      }
    }
  }, [attendances]);

  // Memoize the formatted attendances to prevent unnecessary re-renders
  const formattedAttendances = useMemo(() => {
    return attendances.map(attendance => ({
      ...attendance,
      formattedDate: formatDate(attendance.time_in_date)
    }));
  }, [attendances, formatDate]);

  const renderAttendanceRow = useCallback((attendance: Attendance & { formattedDate: string }) => {
    // Add additional key generation strategy as a fallback
    const rowKey = attendance.id || `${attendance.school_id}-${attendance.full_name}-${attendance.time_in_date}`;
    
    return (
      <tr 
        key={rowKey} 
        className="bg-white/10 hover:bg-white/20 transition-colors"
      >
        <td className="px-4 py-2 text-white">{attendance.school_id}</td>
        <td className="px-4 py-2 text-white">{attendance.full_name}</td>
        <td className="px-4 py-2 text-white">
          {attendance.formattedDate}
        </td>
        <td className="px-4 py-2 text-white">{attendance.classification || 'N/A'}</td>
        <td className="px-4 py-2 text-white">{attendance.purpose_label || 'N/A'}</td>
      </tr>
    );
  }, []); // No dependencies as the function doesn't change

  return (
    <div className="p-6 bg-white/10 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Attendance Records</h2>
      {!isConnected && (
        <div className="text-yellow-400 mb-4">
          Connecting to WebSocket...
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-green-800 text-white">
            <tr>
              <th className="px-4 py-2">School ID</th>
              <th className="px-4 py-2">Full Name</th>
              <th className="px-4 py-2">Time In</th>
              <th className="px-4 py-2">Classification</th>
              <th className="px-4 py-2">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {formattedAttendances.map(renderAttendanceRow)}
          </tbody>
        </table>
        {attendances.length === 0 && (
          <div className="text-center text-white/50 py-4">
            No attendance records found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceViewer;