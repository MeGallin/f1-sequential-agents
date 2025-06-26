# F1 Sequential Agents - Tests

This directory contains all test files for the F1 Sequential Agents service.

## Test Files

### Integration Tests
- **`test-integration.js`** - End-to-end integration testing for agent workflows
- **`manual-test.js`** - Manual testing utilities for agent functionality

### Validation Tests  
- **`validate-imports.js`** - Import validation and environment check (used by `npm run validate`)
- **`quick-real-test.js`** - Quick real-world API connectivity test

## Running Tests

### All Tests
```bash
npm test                    # Run Jest test suite
npm run test:ci            # CI mode with coverage
```

### Validation
```bash
npm run validate           # Run import validation
```

### Manual Testing
```bash
node tests/manual-test.js        # Manual agent testing
node tests/quick-real-test.js    # Quick API test
node tests/test-integration.js   # Integration test
```

## Test Coverage
Tests cover:
- Agent initialization and health checks
- F1 API connectivity and data retrieval
- Multi-agent workflow orchestration
- Error handling and graceful degradation
- Import validation and environment setup