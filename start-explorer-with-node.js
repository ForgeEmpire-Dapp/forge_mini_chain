/**
 * Script to start both the blockchain node and explorer together
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting Forge Mini Chain with Explorer...');

// Start the blockchain node
const nodeProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
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
  console.log('\nShutting down processes...');
  nodeProcess.kill();
  explorerProcess.kill();
  process.exit(0);
});

nodeProcess.on('error', (error) => {
  console.error('Failed to start blockchain node:', error);
});

explorerProcess.on('error', (error) => {
  console.error('Failed to start explorer:', error);
});

console.log('Forge Mini Chain and Explorer started successfully!');
console.log('Blockchain Node: http://localhost:8080');
console.log('Explorer: http://localhost:3000');