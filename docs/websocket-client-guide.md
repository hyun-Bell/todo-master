# WebSocket Client Guide for React Native

## Installation

```bash
# React Native 프로젝트에서
npm install socket.io-client
# or
yarn add socket.io-client
```

## Basic Setup

```typescript
// src/services/websocket.service.ts
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(baseUrl: string) {
    const token = await AsyncStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    this.socket = io(`${baseUrl}/realtime`, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connected', (data) => {
      console.log('Connected to realtime server:', data);
      this.reconnectAttempts = 0;
      this.subscribeToTables(['goals', 'plans', 'checkpoints']);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from realtime server:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('reconnect_required', (data) => {
      console.log('Reconnection required:', data);
      this.attemptReconnect();
    });

    // Realtime event listeners
    this.socket.on('goals:created', this.handleGoalsCreated);
    this.socket.on('goals:updated', this.handleGoalsUpdated);
    this.socket.on('goals:deleted', this.handleGoalsDeleted);
    
    this.socket.on('plans:created', this.handlePlansCreated);
    this.socket.on('plans:updated', this.handlePlansUpdated);
    this.socket.on('plans:deleted', this.handlePlansDeleted);
    
    this.socket.on('checkpoints:created', this.handleCheckpointsCreated);
    this.socket.on('checkpoints:updated', this.handleCheckpointsUpdated);
    this.socket.on('checkpoints:deleted', this.handleCheckpointsDeleted);
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      5000
    );

    setTimeout(() => {
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.socket?.emit('reconnect', {});
    }, delay);
  }

  subscribeToTables(tables: string[]) {
    if (!this.socket) return;
    
    this.socket.emit('subscribe', { tables }, (response: any) => {
      if (response.success) {
        console.log('Subscribed to tables:', response.subscribedTo);
      } else {
        console.error('Failed to subscribe:', response.error);
      }
    });
  }

  unsubscribeFromTables(tables: string[]) {
    if (!this.socket) return;
    
    this.socket.emit('unsubscribe', { tables }, (response: any) => {
      if (response.success) {
        console.log('Unsubscribed from tables:', response.unsubscribedFrom);
      } else {
        console.error('Failed to unsubscribe:', response.error);
      }
    });
  }

  // Event handlers
  private handleGoalsCreated = (data: any) => {
    console.log('Goal created:', data);
    // Update local state/Redux/Context
  };

  private handleGoalsUpdated = (data: any) => {
    console.log('Goal updated:', data);
    // Update local state/Redux/Context
  };

  private handleGoalsDeleted = (data: any) => {
    console.log('Goal deleted:', data);
    // Update local state/Redux/Context
  };

  private handlePlansCreated = (data: any) => {
    console.log('Plan created:', data);
    // Update local state/Redux/Context
  };

  private handlePlansUpdated = (data: any) => {
    console.log('Plan updated:', data);
    // Update local state/Redux/Context
  };

  private handlePlansDeleted = (data: any) => {
    console.log('Plan deleted:', data);
    // Update local state/Redux/Context
  };

  private handleCheckpointsCreated = (data: any) => {
    console.log('Checkpoint created:', data);
    // Update local state/Redux/Context
  };

  private handleCheckpointsUpdated = (data: any) => {
    console.log('Checkpoint updated:', data);
    // Update local state/Redux/Context
  };

  private handleCheckpointsDeleted = (data: any) => {
    console.log('Checkpoint deleted:', data);
    // Update local state/Redux/Context
  };

  // Utility methods
  sendPing() {
    if (!this.socket) return;
    
    this.socket.emit('ping');
    this.socket.once('pong', (data) => {
      console.log('Pong received:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();
```

## Usage in React Native Components

```typescript
// App.tsx or main component
import { useEffect } from 'react';
import { websocketService } from './services/websocket.service';

function App() {
  useEffect(() => {
    // Connect to WebSocket when app starts
    websocketService.connect('http://your-backend-url')
      .catch(error => console.error('WebSocket connection failed:', error));

    // Cleanup on app unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // ... rest of your app
}
```

## Redux Integration Example

```typescript
// store/slices/realtimeSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RealtimeState {
  connected: boolean;
  lastUpdate: string | null;
}

const initialState: RealtimeState = {
  connected: false,
  lastUpdate: null,
};

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    setLastUpdate: (state, action: PayloadAction<string>) => {
      state.lastUpdate = action.payload;
    },
  },
});

export const { setConnected, setLastUpdate } = realtimeSlice.actions;
export default realtimeSlice.reducer;
```

## Environment Variables

```env
# .env
API_BASE_URL=http://localhost:3000
WEBSOCKET_URL=http://localhost:3000
```

## Troubleshooting

1. **Connection Issues**
   - Ensure the backend server is running
   - Check if the authentication token is valid
   - Verify network connectivity

2. **Events Not Received**
   - Confirm you're subscribed to the correct tables
   - Check server logs for errors
   - Verify event names match between client and server

3. **Reconnection Problems**
   - Check if the token has expired
   - Monitor network changes
   - Review server-side session management

## Security Considerations

1. Always use secure WebSocket connections (wss://) in production
2. Implement token refresh logic for long-lived connections
3. Validate all incoming data from the server
4. Handle connection failures gracefully