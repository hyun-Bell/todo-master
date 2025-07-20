// 환경 변수 체크
console.log('Current NODE_ENV:', process.env.NODE_ENV);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

// .env.local 파일 직접 읽기
const fs = require('fs');
const path = require('path');

console.log('\n--- .env.local file contents ---');
try {
  const envLocal = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  const lines = envLocal.split('\n');
  lines.forEach(line => {
    if (line.startsWith('SUPABASE_URL=')) {
      console.log(line);
    }
  });
} catch (error) {
  console.log('Could not read .env.local:', error.message);
}

console.log('\n--- .env file contents ---');
try {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  const lines = env.split('\n');
  lines.forEach(line => {
    if (line.startsWith('SUPABASE_URL=')) {
      console.log(line);
    }
  });
} catch (error) {
  console.log('Could not read .env:', error.message);
}