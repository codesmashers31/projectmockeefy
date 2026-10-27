import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useAuth } from './AuthContext';

export interface DataSyncPayload {
    type: string;
    data: any;
    userId?: string;
    expertId?: string;
    sessionId?: string;
    timestamp: number;
}

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    emit: (event: string, ...args: any[]) => void;
    subscribeDataSync: (type: string | string[], callback: (payload: DataSyncPayload) => void) => () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    emit: () => {},
    subscribeDataSync: () => () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
    children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const { token, user, updateUser } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const subscribersRef = useRef<Map<string, Set<(payload: DataSyncPayload) => void>>>(new Map());

    // Connect or disconnect socket based on auth token
    useEffect(() => {
        if (!token) {
            if (socketRef.current) {
                console.log('[SocketProvider] Disconnecting socket due to logout / missing token');
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        }

        // Avoid re-creating socket if already connected with same token
        if (socketRef.current?.connected) {
            return;
        }

        console.log('[SocketProvider] Initializing real-time socket connection...');
        const s = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socketRef.current = s;

        s.on('connect', () => {
            console.log('[SocketProvider] Real-time socket connected. Socket ID:', s.id);
            setIsConnected(true);
        });

        s.on('disconnect', (reason) => {
            console.log('[SocketProvider] Real-time socket disconnected:', reason);
            setIsConnected(false);
        });

        s.on('connect_error', (error) => {
            console.warn('[SocketProvider] Connection error:', error.message);
            setIsConnected(false);
        });

        s.on('reconnect', (attemptNumber) => {
            console.log(`[SocketProvider] Reconnected successfully after ${attemptNumber} attempts`);
            setIsConnected(true);
            // Notify all subscribers of reconciliation
            const reconnectedSubs = subscribersRef.current.get('RECONNECTED');
            if (reconnectedSubs) {
                reconnectedSubs.forEach((cb) => cb({ type: 'RECONNECTED', data: null, timestamp: Date.now() }));
            }
        });

        // Global DATA_SYNC event listener
        s.on('DATA_SYNC', (payload: DataSyncPayload) => {
            console.log('[SocketProvider] 🔄 Received DATA_SYNC:', payload.type, payload);
            if (!payload?.type) return;

            // Automatically synchronize top-level Auth user state
            if (
                payload.type === 'PROFILE_UPDATED' ||
                payload.type === 'USER_UPDATED' ||
                payload.type === 'PERSONAL_INFO_UPDATED'
            ) {
                const d = payload.data || {};
                const pi = d.personalInfo || d.personalInformation || {};
                updateUser({
                    name: d.name || d.userName,
                    phone: d.phone || d.mobile || pi.phone || pi.mobile,
                    profileImage: d.photoUrl || d.profileImage,
                    personalInfo: {
                        phone: d.phone || d.mobile || pi.phone || pi.mobile,
                        city: pi.city,
                        state: pi.state,
                        country: pi.country,
                        bio: pi.bio,
                    },
                });
            } else if (payload.type === 'PROFILE_PHOTO_UPDATED') {
                const photoUrl = payload.data?.photoUrl || payload.data?.profile?.photoUrl;
                if (photoUrl) {
                    updateUser({ profileImage: photoUrl });
                }
            }

            // Notify specific type subscribers
            const typeSubs = subscribersRef.current.get(payload.type);
            if (typeSubs) {
                typeSubs.forEach((cb) => {
                    try {
                        cb(payload);
                    } catch (err) {
                        console.error(`[SocketProvider] Error in subscriber for ${payload.type}:`, err);
                    }
                });
            }

            // Notify wildcard '*' subscribers
            const wildcardSubs = subscribersRef.current.get('*');
            if (wildcardSubs) {
                wildcardSubs.forEach((cb) => {
                    try {
                        cb(payload);
                    } catch (err) {
                        console.error('[SocketProvider] Error in wildcard subscriber:', err);
                    }
                });
            }
        });

        return () => {
            console.log('[SocketProvider] Cleaning up socket connection');
            s.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [token]);

    const emit = useCallback((event: string, ...args: any[]) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit(event, ...args);
        } else {
            console.warn(`[SocketProvider] Cannot emit "${event}": Socket is not connected`);
        }
    }, []);

    const subscribeDataSync = useCallback(
        (type: string | string[], callback: (payload: DataSyncPayload) => void) => {
            const types = Array.isArray(type) ? type : [type];
            types.forEach((t) => {
                if (!subscribersRef.current.has(t)) {
                    subscribersRef.current.set(t, new Set());
                }
                subscribersRef.current.get(t)!.add(callback);
            });

            // Return unsubscribe function
            return () => {
                types.forEach((t) => {
                    const set = subscribersRef.current.get(t);
                    if (set) {
                        set.delete(callback);
                        if (set.size === 0) {
                            subscribersRef.current.delete(t);
                        }
                    }
                });
            };
        },
        []
    );

    const value: SocketContextType = {
        socket: socketRef.current,
        isConnected,
        emit,
        subscribeDataSync,
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

/**
 * Custom Hook to listen for real-time DATA_SYNC events with automatic cleanup and fresh closures.
 * 
 * @param syncTypes - Event type string or array of strings, e.g. 'PROFILE_UPDATED', 'SESSION_UPDATED'
 * @param handler - Callback invoked when a matching DATA_SYNC event is received
 */
export function useDataSync(
    syncTypes: string | string[],
    handler: (payload: DataSyncPayload) => void
) {
    const { subscribeDataSync, isConnected } = useSocket();
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        const unsubscribe = subscribeDataSync(syncTypes, (payload) => {
            if (handlerRef.current) {
                handlerRef.current(payload);
            }
        });

        return unsubscribe;
    }, [subscribeDataSync, Array.isArray(syncTypes) ? syncTypes.join(',') : syncTypes]);

    return { isConnected };
}

/**
 * Custom Hook to listen for any generic Socket event with automatic cleanup.
 */
export function useSocketEvent<T = any>(
    eventName: string,
    handler: (data: T) => void
) {
    const { socket } = useSocket();
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!socket) return;

        const listener = (data: T) => {
            if (handlerRef.current) {
                handlerRef.current(data);
            }
        };

        socket.on(eventName, listener);

        return () => {
            socket.off(eventName, listener);
        };
    }, [socket, eventName]);
}
