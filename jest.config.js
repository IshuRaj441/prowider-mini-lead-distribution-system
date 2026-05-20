/**
 * FIX #13: Jest Configuration for Comprehensive Test Suite
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  // FIX #12: Run tests sequentially to avoid database deadlocks
  maxWorkers: 1,
}
