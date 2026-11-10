/**
 * WEWOO Hospital Emergency Command Center - Centralized Socket.IO Service
 * Real-time bidirectional communication with WEWOO Backend and Ambulance Drivers
 */

import { io, Socket } from 'socket.io-client';
import {
  getAccessToken,
  refreshAccessToken,
  isTokenExpired,
  addTokenRefreshedListener,
  addAuthFailedListener,
} from './api';

const getSocketBaseUrl = (): string => {
  const envUrl =
    (import.meta.env as any).NEXT_PUBLIC_SOCKET_URL ||
    import.meta.env.VITE_SOCKET_URL;

  // In browser on remote preview host, route via Vite proxy if envUrl points to localhost
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (!envUrl || envUrl.includes('localhost:') || envUrl.includes('127.0.0.1:')) {
      return window.location.origin;
    }
  }

  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return 'http://localhost:5000';
};

export const SOCKET_BASE_URL = getSocketBaseUrl();

export type SocketConnectionState =
  | 'Connecting'
  | 'Connected'
  | 'Reconnecting'
  | 'Disconnected'
  | 'Error'
  | 'AuthRequired'
  | 'TokenExpired';

export interface TelemetryPayload {
  ambulanceId: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  emergencyId?: string | null;
  distanceKm?: number;
  etaMinutes?: number;
  timestamp: string;
}

class WewooSocketClient {
  private socket: Socket | null = null;
  private currentHospitalId: string | null = null;
  private stateListeners: Set<(state: SocketConnectionState, err?: string) => void> = new Set();
  private connectionState: SocketConnectionState = 'Disconnected';
  private connectionError: string | null = null;
  private isRefreshingAuth: boolean = false;
  private activeEmergencyRooms: Set<string> = new Set();

  constructor() {
    // Listen to token refresh events triggered from REST API or login
    addTokenRefreshedListener((newToken) => {
      if (this.socket) {
        this.socket.auth = { token: newToken };
        if (!this.socket.connected) {
          console.log('⚡ [WEWOO Socket.IO] Token updated. Reconnecting socket...');
          this.socket.connect();
        }
      }
    });

    // Listen to auth failure events (e.g. invalid or revoked refresh token)
    addAuthFailedListener(() => {
      this.notifyState('AuthRequired', 'Authentication session expired. Please log in again.');
      if (this.socket) {
        this.socket.disconnect();
      }
    });
  }

  public getState(): { state: SocketConnectionState; error: string | null } {
    return { state: this.connectionState, error: this.connectionError };
  }

  public subscribeState(listener: (state: SocketConnectionState, err?: string) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState, this.connectionError || undefined);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState(state: SocketConnectionState, error: string | null = null) {
    this.connectionState = state;
    this.connectionError = error;
    this.stateListeners.forEach((l) => l(state, error || undefined));
  }

  public connect(hospitalId?: string): Socket {
    if (hospitalId) {
      this.currentHospitalId = hospitalId;
    }

    if (this.socket && this.socket.connected) {
      if (this.currentHospitalId) {
        this.joinHospitalRoom(this.currentHospitalId);
      }
      return this.socket;
    }

    this.notifyState('Connecting');

    // Check if token is already expired before initial handshake
    const currentToken = getAccessToken();
    if (currentToken && isTokenExpired(currentToken, 15) && !this.isRefreshingAuth) {
      this.isRefreshingAuth = true;
      refreshAccessToken()
        .then((freshToken) => {
          this.isRefreshingAuth = false;
          if (this.socket && freshToken) {
            this.socket.auth = { token: freshToken };
          }
        })
        .catch(() => {
          this.isRefreshingAuth = false;
        });
    }

    this.socket = io(SOCKET_BASE_URL, {
      auth: (cb) => {
        cb({ token: getAccessToken() || undefined });
      },
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('⚡ [WEWOO Socket.IO] Connected to backend server:', SOCKET_BASE_URL);
      this.isRefreshingAuth = false;
      this.notifyState('Connected');
      
      // Restore hospital room
      if (this.currentHospitalId) {
        this.joinHospitalRoom(this.currentHospitalId);
      }

      // Restore authorized active emergency rooms
      this.activeEmergencyRooms.forEach((room) => {
        this.socket?.emit('join_room', room);
      });
    });

    this.socket.on('connect_error', async (err: any) => {
      const msg = err?.message || '';
      const isAuthError =
        msg.includes('Authentication error') ||
        msg.includes('token') ||
        err?.data?.code === 'TOKEN_EXPIRED' ||
        err?.data?.code === 'TOKEN_INVALID';

      if (isAuthError) {
        console.warn('🔒 [WEWOO Socket.IO] Authentication handshake rejected:', msg);

        if (this.isRefreshingAuth) {
          return;
        }

        this.isRefreshingAuth = true;
        this.notifyState('Connecting', 'Session token expired. Refreshing credentials...');

        try {
          const refreshedToken = await refreshAccessToken();
          this.isRefreshingAuth = false;

          if (refreshedToken && this.socket) {
            console.log('⚡ [WEWOO Socket.IO] Token refreshed. Reconnecting socket with new token...');
            this.socket.auth = { token: refreshedToken };
            this.socket.connect();
            return;
          }
        } catch (refreshErr) {
          this.isRefreshingAuth = false;
        }

        // Refresh was impossible or token is invalid
        this.notifyState('AuthRequired', 'Session expired. Please log in again.');
        if (this.socket) {
          this.socket.disconnect();
        }
        return;
      }

      console.warn('⚠️ [WEWOO Socket.IO] Network connection error:', msg);
      this.notifyState('Error', `Backend connection error: ${msg}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 [WEWOO Socket.IO] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server forced disconnect (e.g. token expired while connected)
        this.socket?.connect();
        this.notifyState('Reconnecting', 'Server disconnected. Reconnecting...');
      } else if (reason === 'transport close' || reason === 'ping timeout') {
        this.notifyState('Reconnecting', 'Connection dropped. Attempting to restore...');
      } else {
        this.notifyState('Disconnected');
      }
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 [WEWOO Socket.IO] Reconnection attempt #${attempt}...`);
      this.notifyState('Reconnecting', `Attempting reconnection (#${attempt})...`);
    });

    this.socket.io.on('reconnect', (attempt) => {
      console.log(`✅ [WEWOO Socket.IO] Reconnected after ${attempt} attempts`);
      this.notifyState('Connected');
      if (this.currentHospitalId) {
        this.joinHospitalRoom(this.currentHospitalId);
      }
      this.activeEmergencyRooms.forEach((room) => {
        this.socket?.emit('join_room', room);
      });
    });

    this.socket.io.on('reconnect_error', (err) => {
      console.warn('⚠️ [WEWOO Socket.IO] Reconnect error:', err.message);
      this.notifyState('Reconnecting', `Reconnection error: ${err.message}`);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('❌ [WEWOO Socket.IO] Reconnect failed');
      this.notifyState('Disconnected', 'Backend connection lost. Automatic retry will continue.');
    });

    return this.socket;
  }

  public updateAuthToken(newToken: string): void {
    if (this.socket) {
      this.socket.auth = { token: newToken };
      if (!this.socket.connected) {
        this.socket.connect();
      }
    } else {
      this.connect(this.currentHospitalId || undefined);
    }
  }

  public reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connect(this.currentHospitalId || undefined);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.notifyState('Disconnected');
    }
  }

  public joinHospitalRoom(hospitalId: string): void {
    this.currentHospitalId = hospitalId;
    if (this.socket && this.socket.connected) {
      this.socket.emit('hospital:join', hospitalId);
      console.log(`🏥 [WEWOO Socket.IO] Joined room hospital:${hospitalId}`);
    }
  }

  public joinEmergencyRoom(emergencyId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_room', `emergency:${emergencyId}`);
      console.log(`🚨 [WEWOO Socket.IO] Joined room emergency:${emergencyId}`);
    }
  }

  // ==========================================================================
  // HOSPITAL TO DRIVER EMITTERS
  // ==========================================================================

  public emitHospitalAccepted(emergencyId: string, doctor?: string, notes?: string): void {
    if (!this.socket) return;
    this.socket.emit('hospital:accepted', { emergencyId, doctor, notes });
    // Also emit alias
    this.socket.emit('hospital:respond_emergency', {
      emergencyId,
      action: 'ACCEPT',
      assignedDoctor: doctor,
      prepInstructions: notes,
    });
  }

  public emitHospitalDeclined(emergencyId: string, reason?: string): void {
    if (!this.socket) return;
    this.socket.emit('hospital:declined', { emergencyId, reason });
    this.socket.emit('hospital:respond_emergency', {
      emergencyId,
      action: 'REJECT',
      rejectionReason: reason,
    });
  }

  public emitHospitalPreparing(emergencyId: string, details?: string): void {
    if (!this.socket) return;
    this.socket.emit('hospital:preparing', { emergencyId, details });
  }

  public emitHospitalReady(emergencyId: string): void {
    if (!this.socket) return;
    this.socket.emit('hospital:ready', { emergencyId });
  }

  public emitHospitalResourceUpdated(hospitalId: string, updates: any): void {
    if (!this.socket) return;
    this.socket.emit('hospital:resource-updated', { hospitalId, updates });
    this.socket.emit('hospital:update_resources', { hospitalId, updates });
  }

  public emitPreparationUpdated(
    emergencyId: string,
    taskId: number | string,
    isCompleted: boolean,
    assignedTo?: string
  ): void {
    if (!this.socket) return;
    this.socket.emit('preparation:updated', { emergencyId, taskId, isCompleted, assignedTo });
    this.socket.emit('hospital:toggle_task', { emergencyId, taskId, isCompleted, assignedTo });
  }

  // ==========================================================================
  // DRIVER TO HOSPITAL LISTENERS
  // ==========================================================================

  public onEmergencyNew(callback: (emergency: any) => void): () => void {
    if (!this.socket) this.connect();
    const s = this.socket!;

    const handler = (data: any) => {
      const emergency = data?.emergency || data;
      callback(emergency);
    };

    s.on('emergency:new', handler);
    s.on('emergency:incoming_request', handler);

    return () => {
      s.off('emergency:new', handler);
      s.off('emergency:incoming_request', handler);
    };
  }

  public onAmbulanceLocationUpdate(callback: (telemetry: TelemetryPayload) => void): () => void {
    if (!this.socket) this.connect();
    const s = this.socket!;

    const handler = (data: any) => {
      callback({
        ambulanceId: data.ambulanceId,
        latitude: data.latitude,
        longitude: data.longitude,
        speedKmh: data.speedKmh || 0,
        heading: data.heading || 0,
        emergencyId: data.emergencyId,
        distanceKm: data.distanceKm,
        etaMinutes: data.etaMinutes,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    };

    s.on('ambulance:location-update', handler);
    s.on('ambulance:location_update', handler);

    return () => {
      s.off('ambulance:location-update', handler);
      s.off('ambulance:location_update', handler);
    };
  }

  public onEmergencyStatusUpdate(callback: (data: any) => void): () => void {
    if (!this.socket) this.connect();
    const s = this.socket!;

    const handler = (data: any) => callback(data);
    s.on('emergency:status-update', handler);
    s.on('emergency:status_change', handler);

    return () => {
      s.off('emergency:status-update', handler);
      s.off('emergency:status_change', handler);
    };
  }

  public onEmergencyJourneyUpdate(callback: (data: any) => void): () => void {
    if (!this.socket) this.connect();
    const s = this.socket!;

    const handler = (data: any) => callback(data);
    s.on('emergency:journey-update', handler);
    s.on('emergency:eta_update', handler);

    return () => {
      s.off('emergency:journey-update', handler);
      s.off('emergency:eta_update', handler);
    };
  }

  public onEmergencyVitalsUpdate(callback: (data: any) => void): () => void {
    if (!this.socket) this.connect();
    const s = this.socket!;

    const handler = (data: any) => callback(data);
    s.on('emergency:vitals_updated', handler);

    return () => {
      s.off('emergency:vitals_updated', handler);
    };
  }

  public onResourcesUpdated(callback: (resources: any) => void): () => void {
    if (!this.socket) this.connect();
    const s = this.socket!;

    const handler = (data: any) => callback(data);
    s.on('hospital:resource-updated', handler);
    s.on('resources:updated', handler);
    s.on('hospital:resource_change', handler);

    return () => {
      s.off('hospital:resource-updated', handler);
      s.off('resources:updated', handler);
      s.off('hospital:resource_change', handler);
    };
  }

  public onPreparationUpdated(callback: (taskData: any) => void): () => void {
    if (!this.socket) this.connect();
    const s = this.socket!;

    const handler = (data: any) => callback(data);
    s.on('preparation:updated', handler);
    s.on('emergency:prep_task_updated', handler);

    return () => {
      s.off('preparation:updated', handler);
      s.off('emergency:prep_task_updated', handler);
    };
  }
}

export const wewooSocket = new WewooSocketClient();
