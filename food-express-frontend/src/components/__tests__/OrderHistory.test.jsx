import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OrderHistory from '../OrderHistory.jsx';
import { BrowserRouter } from 'react-router-dom';

// Mock fetch globally
const originalFetch = global.fetch;

function mockFetchImplementation({ orders = [], success = true } = {}) {
  return jest.fn().mockImplementation((url, options) => {
    if (url.includes('/api/orders/history')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success, orders })
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
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
