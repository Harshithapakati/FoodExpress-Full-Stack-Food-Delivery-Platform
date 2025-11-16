module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest'
  },
  
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  },
  
  moduleFileExtensions: ['js', 'jsx'],
  
  // ✅ Coverage Configuration - Focus on testable business logic
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',           // Include all source files
    '!src/main.jsx',               // Exclude entry point
    '!src/App.jsx',                // Exclude main app (routing only)
    '!src/vite-env.d.ts',          // Exclude type definitions
    '!src/**/__tests__/**',        // Exclude test files
    '!src/**/*.test.{js,jsx}',     // Exclude test files
    '!src/**/*.spec.{js,jsx}',     // Exclude spec files
    '!src/__mocks__/**',           // Exclude mocks
    '!src/setupTests.js',          // Exclude setup file
    '!src/lint-score.js',          // Exclude lint script
    // Exclude UI-heavy admin/partner/complex components (low ROI for testing)
    '!src/components/AdminPage.jsx',
    '!src/components/AdminDashboardStats.jsx',
    '!src/components/PartnerDashboard.jsx',
    '!src/components/BrowseRestaurants.jsx',
    '!src/components/ViewMenu.jsx',
    '!src/components/MenuModal.jsx',
    '!src/components/ForgotPassword.jsx',
    '!src/components/RequireAdmin.jsx',
    '!src/services/notificationService.js',
    '!src/services/firebaseConfig.js',
    '!src/services/authService.js',
    '!src/components/CartContext.jsx',
    '!src/components/CartModal.jsx'
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  coverageReporters: [
    'text',        // Console output
    'lcov',        // For CI/CD tools
    'html'         // HTML report in coverage/
  ],
  
  // ✅ Coverage thresholds (adjust as needed)
  coverageThreshold: {
    global: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    }
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.[jt]s?(x)',
    '<rootDir>/src/**/*.test.[jt]s?(x)'
  ],
  
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__mocks__/'
  ],
  
  testTimeout: 15000,
  verbose: true
};