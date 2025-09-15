/**
 * @fileoverview Health check script for Docker container
 */
const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.API_PORT || 8080,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('ERROR');
  process.exit(1);
});

request.end();