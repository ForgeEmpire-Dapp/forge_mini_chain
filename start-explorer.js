/**
 * Script to start both the blockchain node and the explorer
 */
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting blockchain node and explorer...');

// Start the blockchain node (leader mode)
const nodeProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: true
});

// Start the explorer
const explorerProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'explorer'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down processes...');
  nodeProcess.kill();
  explorerProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down processes...');
  nodeProcess.kill();
  explorerProcess.kill();
  process.exit(0);
});