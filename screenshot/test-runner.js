#!/usr/bin/env node

// Load the required files
const fs = require('fs');

// Mock browser environment
global.window = global;
global.document = {
  createElement: (tag) => ({
    innerHTML: '',
    textContent: '',
    style: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: () => {},
    remove: () => {},
    cloneNode: () => ({ style: {}, querySelectorAll: () => [] })
  }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, removeChild: () => {} },
  readyState: 'complete'
};

// Mock Intl for date formatting
global.Intl = {
  DateTimeFormat: function(locale, options) {
    return {
      format: (date) => date.toLocaleString()
    };
  }
};

try {
  // Load the files
  eval(fs.readFileSync('types.js', 'utf8'));
  eval(fs.readFileSync('interfaces.js', 'utf8'));
  eval(fs.readFileSync('html2canvas-wrapper.js', 'utf8'));
  eval(fs.readFileSync('screenshot-renderer.js', 'utf8'));
  eval(fs.readFileSync('renderer-test.js', 'utf8'));

  // Run the test
  testScreenshotRenderer().then(result => {
    console.log('Test result:', result);
    process.exit(result.success ? 0 : 1);
  }).catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
} catch (error) {
  console.error('Setup error:', error);
  process.exit(1);
}