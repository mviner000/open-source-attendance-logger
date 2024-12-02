// src/components/AttendanceCreator.tsx used by client
import React, { useState, useMemo } from 'react';
import { useAttendanceWebSocket, CreateAttendanceRequest, Attendance } from '@/utils/websocket';
import { format, parseISO, isValid } from 'date-fns';

const AttendanceCreator: React.FC = () => {
  const [schoolId, setSchoolId] = useState('');
  const [fullName, setFullName] = useState('');
  const [classification, setClassification] = useState('');
  const [purposeLabel, setPurposeLabel] = useState('');

  const { sendAttendance, isConnected, attendances } = useAttendanceWebSocket();

  // Memoized date formatter
  const formatDate = (dateString: string) => {
    try {
      const parsedDate = parseISO(dateString);
      return isValid(parsedDate) 
        ? format(parsedDate, 'yyyy-MM-dd HH:mm:ss')
        : 'Invalid Date';
    } catch (error) {
      console.error('Date parsing error:', error);
      return 'Invalid Date';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const attendanceData: CreateAttendanceRequest = {
      school_id: schoolId,
      full_name: fullName,
      classification: classification || undefined,
      purpose_label: purposeLabel || undefined
    };

    sendAttendance(attendanceData);

    // Reset form
    setSchoolId('');
    setFullName('');
    setClassification('');
    setPurposeLabel('');
  };

  // Memoized sorted attendances
  const sortedAttendances = useMemo(() => {
    return [...attendances].sort((a, b) => 
      new Date(b.time_in_date).getTime() - new Date(a.time_in_date).getTime()
    );
  }, [attendances]);

  return (
    <div className="z-50 max-w-2xl mx-auto space-y-6">
      {/* Attendance Creation Form */}
      <div className="p-6 bg-white/10 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-6">Create Attendance</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="schoolId" className="block text-sm font-medium text-white">
              School ID
            </label>
            <input
              type="text"
              id="schoolId"
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="mt-1 block w-full rounded-md bg-white/20 border-transparent focus:border-green-500 focus:bg-white/30 focus:ring-0 text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-white">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-md bg-white/20 border-transparent focus:border-green-500 focus:bg-white/30 focus:ring-0 text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="classification" className="block text-sm font-medium text-white">
              Classification (Optional)
            </label>
            <input
              type="text"
              id="classification"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="mt-1 block w-full rounded-md bg-white/20 border-transparent focus:border-green-500 focus:bg-white/30 focus:ring-0 text-white"
            />
          </div>

          <div>
            <label htmlFor="purposeLabel" className="block text-sm font-medium text-white">
              Purpose Label (Optional)
            </label>
            <input
              type="text"
              id="purposeLabel"
              value={purposeLabel}
              onChange={(e) => setPurposeLabel(e.target.value)}
              className="mt-1 block w-full rounded-md bg-white/20 border-transparent focus:border-green-500 focus:bg-white/30 focus:ring-0 text-white"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={!isConnected}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isConnected ? 'Create Attendance' : 'Connecting...'}
            </button>
          </div>
        </form>
      </div>=
    </div>
  );
};

export default AttendanceCreator;