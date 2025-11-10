import '@testing-library/jest-dom';

// Mock window.alert
global.alert = jest.fn();

// Mock window.Razorpay
global.Razorpay = jest.fn((options) => ({
  open: jest.fn(),
  on: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
