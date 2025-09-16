/**
 * @fileoverview Test runner for all phases
 */

import { execSync } from 'child_process';

console.log('Running Phase 1 tests...');
try {
  execSync('tsx test/phase1-test.ts', { stdio: 'inherit' });
  console.log('Phase 1 tests passed!\n');
} catch (error) {
  console.error('Phase 1 tests failed:', error);
  process.exit(1);
}

console.log('Running Phase 2 tests...');
try {
  execSync('tsx test/phase2-test.ts', { stdio: 'inherit' });
  console.log('Phase 2 tests passed!\n');
} catch (error) {
  console.error('Phase 2 tests failed:', error);
  process.exit(1);
}

console.log('Running Phase 3 tests...');
try {
  execSync('tsx test/phase3-test.ts', { stdio: 'inherit' });
  console.log('Phase 3 tests passed!\n');
} catch (error) {
  console.error('Phase 3 tests failed:', error);
  process.exit(1);
}

console.log('All tests completed successfully!');