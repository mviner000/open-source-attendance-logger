// utils/websocket.ts

import { useState, useEffect, useCallback, useRef } from 'react';

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

function processAttendance(attendance: Partial<Attendance>): Attendance {
    return {
        id: attendance.id || crypto.randomUUID(),
        school_id: attendance.school_id || 'Unknown',
        full_name: attendance.full_name || 'Unknown User',
        time_in_date: attendance.time_in_date 
            ? new Date(attendance.time_in_date).toISOString()
            : new Date().toISOString(),
        classification: attendance.classification || 'Unclassified',
        purpose_label: attendance.purpose_label
    };
}

export const useAttendanceWebSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const processedIds = useRef(new Set<string>());

    const connectWebSocket = useCallback(() => {
        console.log('Attempting to connect to WebSocket...');
        const newSocket = new WebSocket('ws://localhost:8080/ws');
        
        newSocket.onopen = () => {
            console.log('✅ WebSocket Connected Successfully!');
            console.log('Connection Details:', {
                url: newSocket.url,
                protocol: newSocket.protocol,
                readyState: newSocket.readyState
            });
            setIsConnected(true);
        };

        newSocket.onmessage = (event) => {
            console.log('🔬 Received WebSocket Message:', event.data);
            try {
                const data = JSON.parse(event.data);
                console.log('📨 Parsed WebSocket Data:', data);
                
                if (data.AttendanceList) {
                    console.log('📋 Received Attendance List:', data.AttendanceList);
                    const processedAttendances = data.AttendanceList.map((attendance: Partial<Attendance>) => 
                        processAttendance(attendance)
                    );
                    setAttendances(processedAttendances);
                    processedIds.current = new Set(processedAttendances.map((a: Partial<Attendance>) => a.id));
                } 
                
                if (data.NewAttendance) {
                    console.log('🆕 Received New Attendance:', data.NewAttendance);
                    const processedAttendance = processAttendance(data.NewAttendance);
                    
                    if (!processedIds.current.has(processedAttendance.id)) {
                        processedIds.current.add(processedAttendance.id);
                        setAttendances(prev => {
                            const exists = prev.some(a => a.id === processedAttendance.id);
                            return exists 
                                ? prev 
                                : [processedAttendance, ...prev].slice(0, 100);
                        });
                    }
                }
            } catch (error) {
                console.error('❌ WebSocket message parsing error:', error);
            }
        };

        newSocket.onerror = (error) => {
            console.error('❌ WebSocket Error:', error);
            setIsConnected(false);
        };

        newSocket.onclose = (event) => {
            console.log('🔌 WebSocket Disconnected:', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
            
            setIsConnected(false);
            processedIds.current.clear();
            
            // Automatic reconnection with backoff
            setTimeout(connectWebSocket, 1000);
        };

        setSocket(newSocket);
        return newSocket;
    }, []);

    useEffect(() => {
        const ws = connectWebSocket();
        return () => {
            console.log('🧹 Cleaning up WebSocket connection');
            ws.close();
            processedIds.current.clear();
        };
    }, [connectWebSocket]);

    const sendAttendance = useCallback((attendance: CreateAttendanceRequest) => {
        if (socket && isConnected) {
            console.log('📤 Sending Attendance:', attendance);
            socket.send(JSON.stringify({
                type: 'NewAttendance',
                data: attendance
            }));
        } else {
            console.warn('❗ Cannot send attendance - WebSocket not connected');
        }
    }, [socket, isConnected]);

    return {
        attendances,
        isConnected,
        sendAttendance
    };
};