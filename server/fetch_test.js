import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_SECRET = 'diwan-al-masri-secret-key-2026';
const token = jwt.sign({ id: 1, role: 'super_admin' }, JWT_SECRET);

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/members?year=2026&month=',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.end();
