const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// JWT 토큰 생성 (테스트용)
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const userId = 'test-user-123';
const token = jwt.sign(
  { sub: userId, email: 'test@example.com' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

console.log('🔑 Generated JWT token for testing');
console.log('User ID:', userId);

// WebSocket 연결
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const socket = io(`${BACKEND_URL}/realtime`, {
  auth: {
    token: token
  },
  transports: ['websocket']
});

// 연결 이벤트
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
  console.log('Timestamp:', new Date().toISOString());
  
  // 테이블 구독
  console.log('\n📡 Subscribing to tables...');
  socket.emit('subscribe', { 
    tables: ['goals', 'plans', 'checkpoints'] 
  }, (response) => {
    if (response.success) {
      console.log('✅ Subscribe successful:', response);
    } else {
      console.error('❌ Subscribe failed:', response);
    }
  });
});

// 연결 성공 메시지
socket.on('connected', (data) => {
  console.log('\n📢 Server connected event:', data);
});

// 에러 처리
socket.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// 연결 해제
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// 실시간 이벤트 수신
socket.on('goals:created', (data) => {
  console.log('📢 Goal created:', data);
});

socket.on('goals:updated', (data) => {
  console.log('📢 Goal updated:', data);
});

// Ping-Pong 테스트
setInterval(() => {
  socket.emit('ping');
}, 5000);

socket.on('pong', (data) => {
  console.log('🏓 Pong received:', data);
});

// 사용자 입력 처리
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n💡 Commands:');
console.log('  subscribe <table>  - Subscribe to a table');
console.log('  unsubscribe <table> - Unsubscribe from a table');
console.log('  reconnect - Test reconnection');
console.log('  exit - Disconnect and exit');
console.log('');

rl.on('line', (input) => {
  const [command, ...args] = input.trim().split(' ');
  
  switch(command) {
    case 'subscribe':
      socket.emit('subscribe', { tables: args }, (response) => {
        console.log('Subscribe response:', response);
      });
      break;
      
    case 'unsubscribe':
      socket.emit('unsubscribe', { tables: args }, (response) => {
        console.log('Unsubscribe response:', response);
      });
      break;
      
    case 'reconnect':
      socket.emit('reconnect', {}, (response) => {
        console.log('Reconnect response:', response);
      });
      break;
      
    case 'exit':
      console.log('\n👋 Disconnecting...');
      socket.disconnect();
      process.exit(0);
      
    default:
      console.log('Unknown command:', command);
  }
});