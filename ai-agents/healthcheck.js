const http = require('http');

// Check if the AI agents API is running
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  res.on('data', (d) => {
    process.stdout.write(d);
  });
  
  res.on('end', () => {
    console.log('\nHealth check completed');
  });
});

req.on('error', (error) => {
  console.error('Health check failed:', error.message);
});

req.end();