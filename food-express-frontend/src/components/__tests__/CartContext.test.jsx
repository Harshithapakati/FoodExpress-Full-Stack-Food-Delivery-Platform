import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { CartProvider, CartContext } from '../CartContext';

// Mock fetch
global.fetch = jest.fn();

describe('CartContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch.mockClear();
  });

  const TestComponent = () => {
    const context = React.useContext(CartContext);
    
    if (!context) {
      return <div>No context</div>;
    }

    const { cartItems } = context;

    return (
      <div>
        <div data-testid="cart-count">{cartItems.length}</div>
      </div>
    );
  };

  test('provides cart context to children', () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-count')).toBeInTheDocument();
  });

  test('does not fetch cart when no token exists', async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
