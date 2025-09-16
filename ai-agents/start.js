const { spawn } = require('child_process');

// Start the AI agents framework
const agentProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit'
});

agentProcess.on('close', (code) => {
  console.log(`AI agents framework exited with code ${code}`);
});

agentProcess.on('error', (error) => {
  console.error('Failed to start AI agents framework:', error);
});