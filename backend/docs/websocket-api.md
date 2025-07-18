# WebSocket API Documentation

## Overview

TodoMaster 백엔드는 Socket.IO를 사용하여 실시간 양방향 통신을 제공합니다. 모든 WebSocket 연결은 JWT 토큰 기반 인증이 필요합니다.

## Connection

### Endpoint

```
ws://localhost:3000/realtime
```

### Authentication

연결 시 JWT 토큰을 auth 객체에 포함해야 합니다:

```javascript
const socket = io('http://localhost:3000/realtime', {
  auth: {
    token: 'your-jwt-token'
  },
  transports: ['websocket']
});
```

### Connection Events

#### `connect`
연결이 성공적으로 수립되었을 때 발생합니다.

```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});
```

#### `connected`
서버가 연결을 확인하고 사용자 정보를 반환합니다.

```javascript
socket.on('connected', (data) => {
  console.log('User connected:', data);
  // { userId: 'user-id', connectedAt: '2025-01-01T00:00:00.000Z' }
});
```

#### `disconnect`
연결이 끊어졌을 때 발생합니다.

```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

#### `error`
오류가 발생했을 때 발생합니다.

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

## Client-to-Server Events

### `subscribe`
특정 테이블의 실시간 이벤트를 구독합니다.

**Request:**
```javascript
socket.emit('subscribe', { 
  tables: ['goals', 'plans', 'checkpoints'] 
}, (response) => {
  console.log('Subscribe response:', response);
});
```

**Response:**
```javascript
{
  success: true,
  subscribedTables: ['goals', 'plans', 'checkpoints'],
  timestamp: '2025-01-01T00:00:00.000Z'
}
```

### `unsubscribe`
테이블 구독을 취소합니다.

**Request:**
```javascript
socket.emit('unsubscribe', { 
  tables: ['goals'] 
}, (response) => {
  console.log('Unsubscribe response:', response);
});
```

**Response:**
```javascript
{
  success: true,
  unsubscribedTables: ['goals'],
  remainingTables: ['plans', 'checkpoints'],
  timestamp: '2025-01-01T00:00:00.000Z'
}
```

### `ping`
연결 상태를 확인하기 위한 ping 메시지입니다.

**Request:**
```javascript
socket.emit('ping');
```

**Response Event:** `pong`
```javascript
socket.on('pong', (data) => {
  console.log('Pong received:', data);
  // { timestamp: '2025-01-01T00:00:00.000Z', latency: 15 }
});
```

### `reconnect`
재연결을 시도합니다.

**Request:**
```javascript
socket.emit('reconnect', {}, (response) => {
  console.log('Reconnect response:', response);
});
```

**Response:**
```javascript
{
  success: true,
  message: 'Reconnection successful',
  sessionRestored: true
}
```

## Server-to-Client Events

### Database Change Events

데이터베이스 변경 사항에 대한 실시간 이벤트입니다. 구독한 테이블에서만 이벤트를 수신합니다.

#### `goals:created`
새 목표가 생성되었을 때 발생합니다.

```javascript
socket.on('goals:created', (data) => {
  console.log('New goal created:', data);
  // {
  //   id: 'goal-id',
  //   title: 'Goal Title',
  //   userId: 'user-id',
  //   createdAt: '2025-01-01T00:00:00.000Z',
  //   ...
  // }
});
```

#### `goals:updated`
목표가 업데이트되었을 때 발생합니다.

```javascript
socket.on('goals:updated', (data) => {
  console.log('Goal updated:', data);
  // {
  //   id: 'goal-id',
  //   changes: { title: 'New Title', status: 'completed' },
  //   updatedAt: '2025-01-01T00:00:00.000Z'
  // }
});
```

#### `goals:deleted`
목표가 삭제되었을 때 발생합니다.

```javascript
socket.on('goals:deleted', (data) => {
  console.log('Goal deleted:', data);
  // { id: 'goal-id', deletedAt: '2025-01-01T00:00:00.000Z' }
});
```

#### Plans Events
- `plans:created` - 새 계획 생성
- `plans:updated` - 계획 업데이트
- `plans:deleted` - 계획 삭제

#### Checkpoints Events
- `checkpoints:created` - 새 체크포인트 생성
- `checkpoints:updated` - 체크포인트 업데이트
- `checkpoints:deleted` - 체크포인트 삭제

## Error Handling

### Authentication Errors

```javascript
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication failed') {
    // JWT 토큰이 유효하지 않거나 만료됨
    console.error('Authentication failed:', error);
  }
});
```

### Common Error Messages

| Error Message | Description | Solution |
|--------------|-------------|----------|
| `Authentication failed` | JWT 토큰이 없거나 유효하지 않음 | 유효한 JWT 토큰 제공 |
| `Invalid token` | JWT 토큰 형식이 잘못됨 | 올바른 토큰 형식 사용 |
| `Token expired` | JWT 토큰이 만료됨 | 새로운 토큰 발급 |
| `Invalid table name` | 지원하지 않는 테이블명 | goals, plans, checkpoints 중 사용 |
| `Subscription failed` | 구독 처리 중 오류 | 재시도 또는 재연결 |

## Best Practices

### 1. Connection Management

```javascript
// 연결 상태 관리
let isConnected = false;

socket.on('connect', () => {
  isConnected = true;
  // 재연결 시 필요한 구독 복원
  resubscribeToTables();
});

socket.on('disconnect', () => {
  isConnected = false;
});
```

### 2. Heartbeat

주기적으로 ping을 보내 연결 상태를 확인합니다:

```javascript
setInterval(() => {
  if (isConnected) {
    socket.emit('ping');
  }
}, 30000); // 30초마다
```

### 3. Error Recovery

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  
  // 인증 오류인 경우 토큰 갱신
  if (error.message === 'Authentication failed') {
    refreshToken().then(newToken => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

### 4. Subscription Management

```javascript
// 구독 상태 추적
const subscribedTables = new Set();

function subscribeToTable(table) {
  socket.emit('subscribe', { tables: [table] }, (response) => {
    if (response.success) {
      subscribedTables.add(table);
    }
  });
}

function unsubscribeFromTable(table) {
  socket.emit('unsubscribe', { tables: [table] }, (response) => {
    if (response.success) {
      subscribedTables.delete(table);
    }
  });
}
```

## Testing Tools

### Manual Testing

`test-websocket.js` 스크립트를 사용하여 WebSocket 연결을 테스트할 수 있습니다:

```bash
node test-websocket.js
```

### Load Testing

`load-test-websocket.js` 스크립트를 사용하여 부하 테스트를 수행할 수 있습니다:

```bash
# 100개의 동시 연결 테스트
node load-test-websocket.js 100
```

## Security Considerations

1. **JWT 토큰 보안**
   - HTTPS를 통해서만 토큰 전송
   - 토큰을 로컬 스토리지가 아닌 안전한 곳에 저장
   - 적절한 토큰 만료 시간 설정

2. **Rate Limiting**
   - 클라이언트당 연결 수 제한
   - 메시지 빈도 제한

3. **Input Validation**
   - 모든 클라이언트 입력 검증
   - SQL Injection 방지

4. **Authorization**
   - 사용자는 자신의 데이터에만 접근 가능
   - 관리자 권한 확인