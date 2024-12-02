// utils/websocket.ts
import { useState, useEffect, useCallback } from 'react';

export enum AttendanceEventType {
  NewAttendance = 'NewAttendance',
  AttendanceList = 'AttendanceList',
  Error = 'Error'
}

export interface CreateAttendanceRequest {
  school_id: string;
  full_name: string;
  classification?: string;
  purpose_label?: string;
}

export interface Attendance {
  id: string;
  school_id: string;
  full_name: string;
  time_in_date: string; // Expecting an ISO date string
  classification: string;
  purpose_label?: string;
}

export interface WebSocketMessage {
  type: AttendanceEventType;
  data: CreateAttendanceRequest | Attendance[] | string;
}

export const useAttendanceWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const connectWebSocket = useCallback(() => {
    const newSocket = new WebSocket('ws://localhost:8080/ws');

    newSocket.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
      
      // Request initial attendance list
      newSocket.send(JSON.stringify({ 
        type: 'AttendanceList', 
        data: {} 
      }));
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.AttendanceList) {
          // Ensure time_in_date is a valid ISO string and classification is not undefined
          const processedAttendances = data.AttendanceList.map((attendance: Attendance) => ({
            ...attendance,
            time_in_date: attendance.time_in_date 
              ? (typeof attendance.time_in_date === 'string' 
                  ? attendance.time_in_date 
                  : new Date(attendance.time_in_date).toISOString())
              : new Date().toISOString(),
            classification: attendance.classification || 'N/A'
          }));

          setAttendances(processedAttendances);
        } else if (data.NewAttendance) {
          // Process new attendance
          const processedAttendance = {
            ...data.NewAttendance,
            time_in_date: data.NewAttendance.time_in_date 
              ? (typeof data.NewAttendance.time_in_date === 'string' 
                  ? data.NewAttendance.time_in_date 
                  : new Date(data.NewAttendance.time_in_date).toISOString())
              : new Date().toISOString(),
            classification: data.NewAttendance.classification || 'N/A'
          };

          // Add new attendance in real-time
          setAttendances(prev => {
            // Prevent duplicates
            const exists = prev.some(a => a.id === processedAttendance.id);
            return exists 
              ? prev 
              : [processedAttendance, ...prev];
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    newSocket.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket Disconnected');
    };

    setSocket(newSocket);
    return newSocket;
  }, []);

  useEffect(() => {
    const ws = connectWebSocket();
    return () => ws.close();
  }, [connectWebSocket]);

  const sendAttendance = useCallback((attendance: CreateAttendanceRequest) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'NewAttendance',
        data: attendance
      }));
    }
  }, [socket, isConnected]);

  return { 
    attendances, 
    isConnected, 
    sendAttendance 
  };
};