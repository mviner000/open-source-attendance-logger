// utils/websocket.ts (FULL REPLACEMENT)
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
    time_in_date: string;
    classification: string;
    purpose_label?: string;
}

export interface WebSocketMessage {
    type: AttendanceEventType;
    data: CreateAttendanceRequest | Attendance[] | string;
}

function processAttendance(attendance: Attendance): Attendance {
    return {
        ...attendance,
        time_in_date: attendance.time_in_date 
            ? new Date(attendance.time_in_date).toISOString()
            : new Date().toISOString(),
        classification: attendance.classification || 'N/A'
    };
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
        };

        newSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.AttendanceList) {
                    const processedAttendances = data.AttendanceList.map(processAttendance);
                    setAttendances(processedAttendances);
                } 
                
                if (data.NewAttendance) {
                    const processedAttendance = processAttendance(data.NewAttendance);
                    setAttendances(prev => {
                        const exists = prev.some(a => a.id === processedAttendance.id);
                        return exists 
                            ? prev 
                            : [processedAttendance, ...prev].slice(0, 100);
                    });
                }
            } catch (error) {
                console.error('WebSocket message parsing error:', error);
            }
        };

        newSocket.onclose = () => {
            setIsConnected(false);
            console.log('WebSocket Disconnected');
            
            // Automatic reconnection with backoff
            setTimeout(connectWebSocket, 1000);
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