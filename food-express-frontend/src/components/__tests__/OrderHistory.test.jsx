import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OrderHistory from '../OrderHistory.jsx';
import { BrowserRouter } from 'react-router-dom';

// Mock fetch globally
const originalFetch = global.fetch;

function mockFetchImplementation({ orders = [], success = true } = {}) {
  return jest.fn().mockImplementation((url) => {
    if (url.includes('/api/orders/history')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success, orders })
      });
    }
    if (url.includes('/api/payment/order')) {
      return Promise.resolve({
        json: () => Promise.resolve({ 
          success: true, 
          order_id: 'order_abc123', 
          amount: 450, 
          currency: 'INR', 
          key_id: 'rzp_test_key' 
        })
      });
    }
    if (url.includes('/api/payment/verify')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, order: { _id: 'order123' } })
      });
    }
    // Default mock for other endpoints
    return Promise.resolve({
      json: () => Promise.resolve({ success: true })
    });
  });
}

describe('OrderHistory component', () => {
  beforeEach(() => {
    // Setup localStorage
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
    
    global.fetch = mockFetchImplementation({
      orders: [
        {
          _id: 'order123',
          createdAt: new Date().toISOString(),
          restaurantName: 'FoodHub',
          status: 'Pending Payment',
          totalAmount: 450,
          items: [
            { name: 'Pizza', quantity: 1, price: 300 },
            { name: 'Soda', quantity: 1, price: 150 }
          ]
        }
      ],
      success: true
    });

    // Mock Razorpay with proper constructor
    window.Razorpay = jest.fn((options) => {
      return {
        open: jest.fn(() => {
          // Simulate successful payment
          if (options.handler) {
            options.handler({
              razorpay_order_id: options.order_id,
              razorpay_payment_id: 'pay_123',
              razorpay_signature: 'sig_123'
            });
          }
        }),
        on: jest.fn()
      };
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('renders order history with pending payment and retry button', async () => {
    render(
      <BrowserRouter>
        <OrderHistory />
      </BrowserRouter>
    );

    expect(screen.getByText(/Loading order history/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Your Order History/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/FoodHub/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Payment/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry Payment/i });
    expect(retryBtn).toBeInTheDocument();
  });

  test('clicking retry payment disables button during processing', async () => {
    render(
      <BrowserRouter>
        <OrderHistory />
      </BrowserRouter>
    );

    await waitFor(() => screen.getByText(/Pending Payment/i));

    const retryBtn = screen.getByRole('button', { name: /Retry Payment/i });
    fireEvent.click(retryBtn);

    // Button should show processing state or be disabled
    await waitFor(() => {
      expect(retryBtn).toBeDisabled();
    });
  });
});
