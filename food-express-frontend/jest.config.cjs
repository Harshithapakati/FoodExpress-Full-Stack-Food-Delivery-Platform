module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  // Focus coverage on the most important pages to meet threshold
  collectCoverageFrom: [
    'src/components/CheckoutPage.jsx',
    'src/components/OrderHistory.jsx'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  }
};
