import { spawn } from 'child_process';

console.log('Starting Forge Mini Chain with AI Agents...');

// Start the blockchain node
const blockchainProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Start the AI agents framework
const agentsProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  cwd: 'ai-agents'
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down both processes...');
  blockchainProcess.kill();
  agentsProcess.kill();
  process.exit(0);
});

blockchainProcess.on('close', (code) => {
  console.log(`Blockchain process exited with code ${code}`);
  agentsProcess.kill();
  process.exit(code);
});

agentsProcess.on('close', (code) => {
  console.log(`AI agents process exited with code ${code}`);
  blockchainProcess.kill();
  process.exit(code);
});