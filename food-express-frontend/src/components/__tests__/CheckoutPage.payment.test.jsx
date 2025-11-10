import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from '../CheckoutPage.jsx';
import { BrowserRouter } from 'react-router-dom';
import { CartContext } from '../CartContext.jsx';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => jest.fn(),
  };
});

const mockFetch = jest.fn();
const originalFetch = global.fetch;

function setupFetchForPaymentFlow() {
  mockFetch.mockImplementation((url) => {
    if (url.includes('/api/payment/order')) {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, order_id: 'order_abc', amount: 500, currency: 'INR', key_id: 'rzp_test_key' })
      });
    }
    if (url.includes('/api/payment/verify')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, order: { _id: 'id1' } }) });
    }
    if (url.includes('/api/cart/clear')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
  });
  global.fetch = mockFetch;
}

function renderCheckout(cartItems) {
  return render(
    <BrowserRouter>
      <CartContext.Provider value={{
        cartItems,
        updateQuantity: jest.fn(),
        removeFromCart: jest.fn(),
        setCartItems: jest.fn()
      }}>
        <CheckoutPage />
      </CartContext.Provider>
    </BrowserRouter>
  );
}

describe('CheckoutPage payment flow', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'fake');
    localStorage.setItem('user', JSON.stringify({ email: 'u@example.com' }));
    setupFetchForPaymentFlow();
    // Mock Razorpay
    window.Razorpay = function(opts) {
      this.options = opts;
      this.open = () => {
        // Simulate success: call handler
        opts.handler({
          razorpay_order_id: opts.order_id,
          razorpay_payment_id: 'pay_123',
          razorpay_signature: 'sig_123'
        });
      };
      this.on = () => {};
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('submits card payment and opens Razorpay', async () => {
    renderCheckout([{ _id: '1', name: 'Pizza', price: 300, qty: 1, img: '', restaurantName: 'FoodHub' }]);

    // Fill address fields
    fireEvent.change(screen.getByPlaceholderText(/Full name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/Phone number/i), { target: { value: '9999999999' } });
    fireEvent.change(screen.getByPlaceholderText(/Flat\/House no./i), { target: { value: '12A' } });
    fireEvent.change(screen.getByPlaceholderText(/Street\/Area/i), { target: { value: 'Main St' } });
    fireEvent.change(screen.getByPlaceholderText(/City/i), { target: { value: 'Bengaluru' } });
    fireEvent.change(screen.getByPlaceholderText(/Pincode/i), { target: { value: '560001' } });

    // Choose card
    fireEvent.click(screen.getByRole('radio', { name: /Card/i }));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Place Order/i }));

    // Verify payment order created and Razorpay invoked via handler
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/payment/order'), expect.any(Object));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/payment/verify'), expect.any(Object));
    });
  });
});
