const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

// 설정
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const NUM_CLIENTS = process.argv[2] ? parseInt(process.argv[2]) : 100;
const RAMP_UP_TIME = 10000; // 10초에 걸쳐 클라이언트 생성

console.log(`🚀 WebSocket Load Test`);
console.log(`📊 Target: ${BACKEND_URL}`);
console.log(`👥 Clients: ${NUM_CLIENTS}`);
console.log(`⏱️  Ramp-up: ${RAMP_UP_TIME / 1000}s\n`);

const clients = [];
const stats = {
  connected: 0,
  disconnected: 0,
  errors: 0,
  messages: 0,
  subscriptions: 0,
  startTime: Date.now()
};

// 통계 출력
setInterval(() => {
  const runtime = Math.floor((Date.now() - stats.startTime) / 1000);
  const memUsage = process.memoryUsage();
  
  console.log(`\n📊 Stats at ${runtime}s:`);
  console.log(`  Connected: ${stats.connected}/${NUM_CLIENTS}`);
  console.log(`  Disconnected: ${stats.disconnected}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Messages: ${stats.messages}`);
  console.log(`  Subscriptions: ${stats.subscriptions}`);
  console.log(`  Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
}, 5000);

// 클라이언트 생성 함수
function createClient(index) {
  const userId = `load-test-user-${index}`;
  const token = jwt.sign(
    { sub: userId, email: `test${index}@example.com` },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const socket = io(`${BACKEND_URL}/realtime`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    stats.connected++;
    
    // 랜덤하게 테이블 구독
    const tables = [];
    if (Math.random() > 0.3) tables.push('goals');
    if (Math.random() > 0.3) tables.push('plans');
    if (Math.random() > 0.3) tables.push('checkpoints');
    
    if (tables.length > 0) {
      socket.emit('subscribe', { tables }, (response) => {
        if (response?.success) {
          stats.subscriptions++;
        }
      });
    }
  });

  socket.on('disconnect', () => {
    stats.connected--;
    stats.disconnected++;
  });

  socket.on('error', (error) => {
    stats.errors++;
    console.error(`❌ Client ${index} error:`, error.message);
  });

  // 실시간 이벤트 카운트
  ['goals:created', 'goals:updated', 'plans:created', 'plans:updated'].forEach(event => {
    socket.on(event, () => {
      stats.messages++;
    });
  });

  // 주기적으로 ping 전송
  setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
    }
  }, 30000);

  clients.push({ socket, userId, index });
  return socket;
}

// 점진적으로 클라이언트 생성
const delayBetweenClients = RAMP_UP_TIME / NUM_CLIENTS;
let clientIndex = 0;

const rampUpInterval = setInterval(() => {
  createClient(clientIndex);
  clientIndex++;
  
  if (clientIndex >= NUM_CLIENTS) {
    clearInterval(rampUpInterval);
    console.log('\n✅ All clients created');
    
    // 테스트 종료 옵션
    setTimeout(() => {
      console.log('\n📊 Final Statistics:');
      console.log(JSON.stringify(stats, null, 2));
      
      console.log('\n🔄 Press Ctrl+C to disconnect all clients and exit');
    }, 5000);
  }
}, delayBetweenClients);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  
  clients.forEach(({ socket }) => {
    socket.disconnect();
  });
  
  setTimeout(() => {
    console.log('✅ All clients disconnected');
    process.exit(0);
  }, 2000);
});