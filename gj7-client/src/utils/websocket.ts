// utils/websocket.ts

import { Attendance, CreateAttendanceRequest } from '@/types/attendance';
import { useState, useEffect, useCallback } from 'react';

export enum AttendanceEventType {
    NewAttendance = 'NewAttendance',
    AttendanceList = 'AttendanceList',
    Error = 'Error'
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

// Exponential backoff configuration
const createExponentialBackoff = (
    maxRetries: number = 10, 
    initialInterval: number = 1000, 
    maxInterval: number = 30000
) => {
    let retryCount = 0;

    return () => {
        if (retryCount >= maxRetries) {
            console.error('Max reconnection attempts reached');
            return null;
        }

        const nextInterval = Math.min(
            initialInterval * Math.pow(2, retryCount),
            maxInterval
        );

        retryCount++;
        return nextInterval;
    };
};

export const useAttendanceWebSocket = () => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Create a backoff function for reconnection attempts
    const getReconnectInterval = createExponentialBackoff();

    const connectWebSocket = useCallback(() => {
        // Cleanup existing socket if it exists
        if (socket) {
            socket.close();
        }

        const savedIp = localStorage.getItem('app_server_ip') || 'localhost';
        const wsUrl = `ws://${savedIp}:8080/ws`;

        try {
            const newSocket = new WebSocket(wsUrl);

            // Connection opened successfully
            newSocket.onopen = () => {
                console.log('WebSocket Connected successfully');
                setIsConnected(true);
                setConnectionError(null);
                // Reset retry count on successful connection
                getReconnectInterval(); // Reset
            };

            // Handle incoming messages
            newSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.AttendanceList) {
                        const processedAttendances = data.AttendanceList.map((attendance: Partial<Attendance>) => 
                            processAttendance(attendance)
                        );
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

            // Error handling
            newSocket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setIsConnected(false);
                setConnectionError('WebSocket connection failed');
            };

            // Connection closed
            newSocket.onclose = (event) => {
                console.log('WebSocket Disconnected', event);
                setIsConnected(false);

                // Attempt reconnection with exponential backoff
                const reconnectInterval = getReconnectInterval();
                if (reconnectInterval !== null) {
                    console.log(`Attempting to reconnect in ${reconnectInterval}ms`);
                    setTimeout(connectWebSocket, reconnectInterval);
                }
            };

            setSocket(newSocket);
            return newSocket;

        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setIsConnected(false);
            setConnectionError('Failed to establish WebSocket connection');
            
            // Attempt reconnection
            const reconnectInterval = getReconnectInterval();
            if (reconnectInterval !== null) {
                setTimeout(connectWebSocket, reconnectInterval);
            }

            return null;
        }
    }, []);

    // Initial connection and cleanup
    useEffect(() => {
        const ws = connectWebSocket();
        
        // Cleanup function
        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [connectWebSocket]);

    // Send attendance via WebSocket
    const sendAttendance = useCallback((attendance: CreateAttendanceRequest) => {
        if (socket && isConnected) {
            try {
                socket.send(JSON.stringify({
                    type: 'NewAttendance',
                    data: attendance
                }));
            } catch (error) {
                console.error('Failed to send attendance:', error);
                setConnectionError('Failed to send attendance');
            }
        } else {
            console.warn('WebSocket not connected. Cannot send attendance.');
        }
    }, [socket, isConnected]);

    // Force reconnection method
    const forceReconnect = useCallback(() => {
        connectWebSocket();
    }, [connectWebSocket]);

    return {
        attendances,
        isConnected,
        connectionError,
        sendAttendance,
        forceReconnect
    };
};