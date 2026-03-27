const http = require('http');

const data = JSON.stringify({
  email: 'admin@chaldal.com',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body.substring(0, 100)));
});

req.on('error', console.error);
req.write(data);
req.end();
