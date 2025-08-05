#!/usr/bin/env node

// Simple performance test runner for Node.js environment
import { runAllPerformanceTests } from './tests/performance-tests.ts';

async function main() {
  console.log('🚀 Starting Performance Tests...\n');
  
  try {
    await runAllPerformanceTests();
    console.log('\n✅ Performance tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Performance tests failed:', error);
    process.exit(1);
  }
}

main();