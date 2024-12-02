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

export const useAttendanceWebSocket = (onMessageCallback?: (message: WebSocketMessage) => void) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const connectWebSocket = useCallback(() => {
    const newSocket = new WebSocket('ws://localhost:8080/ws');

    newSocket.onopen = () => {
      console.log('✅ WebSocket Connected Successfully');
      console.log('Connection Details:', {
        url: newSocket.url,
        protocol: newSocket.protocol,
        readyState: newSocket.readyState
      });
      setIsConnected(true);
      
      console.log('Sending AttendanceList request');
      newSocket.send(JSON.stringify({ 
        type: 'AttendanceList',
        data: {} // Explicitly send an empty data object
      }));
    };

    newSocket.onclose = (event) => {
      console.log('❌ WebSocket Disconnected', {
        wasClean: event.wasClean,
        code: event.code,
        reason: event.reason
      });
      setIsConnected(false);
    };

    newSocket.onmessage = (event) => {
      console.log('Raw WebSocket message received:', event.data);
      
      try {
        const rawMessage = JSON.parse(event.data);
        
        // Check if the message has an AttendanceList key
        if (rawMessage.AttendanceList && Array.isArray(rawMessage.AttendanceList)) {
          console.log('Attendance List Received:', rawMessage.AttendanceList);
          
          // Update attendances state with the received list
          setAttendances(rawMessage.AttendanceList);

          const message: WebSocketMessage = {
            type: AttendanceEventType.AttendanceList,
            data: rawMessage.AttendanceList
          };

          onMessageCallback?.(message);
        } 
        // Handle new attendance
        else if (rawMessage.NewAttendance) {
          console.log('New Attendance Received:', rawMessage.NewAttendance);
          
          const newAttendance = {
            ...rawMessage.NewAttendance,
            // Ensure time_in_date exists and is a valid ISO string
            time_in_date: rawMessage.NewAttendance.time_in_date || new Date().toISOString()
          };
          
          // Update attendances state by adding the new attendance
          setAttendances(prevAttendances => {
            // Check if the attendance already exists to avoid duplicates
            const exists = prevAttendances.some(att => att.id === newAttendance.id);
            return exists 
              ? prevAttendances 
              : [...prevAttendances, newAttendance];
          });

          const message: WebSocketMessage = {
            type: AttendanceEventType.NewAttendance,
            data: newAttendance
          };

          onMessageCallback?.(message);
        }
        // Handle errors
        else if (rawMessage.Error) {
          console.error('WebSocket Error:', rawMessage.Error);
          
          const message: WebSocketMessage = {
            type: AttendanceEventType.Error,
            data: rawMessage.Error
          };

          onMessageCallback?.(message);
        }
        // Fallback for unexpected message formats
        else {
          console.warn('Unexpected WebSocket message format:', rawMessage);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [onMessageCallback]);

  useEffect(() => {
    const cleanup = connectWebSocket();
    return cleanup;
  }, [connectWebSocket]);

  const sendAttendance = (attendance: CreateAttendanceRequest) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        type: 'NewAttendance',
        data: attendance
      }));
    }
  };

  return {
    attendances,
    isConnected,
    sendAttendance,
 connectWebSocket
  };
};