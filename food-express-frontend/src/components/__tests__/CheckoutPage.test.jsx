import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CheckoutPage from '../CheckoutPage.jsx';
import { BrowserRouter } from 'react-router-dom';
import { CartContext } from '../CartContext.jsx';

function renderWithProviders(ui, { cartItems = [] } = {}) {
  return render(
    <BrowserRouter>
      <CartContext.Provider value={{
        cartItems,
        updateQuantity: jest.fn(),
        removeFromCart: jest.fn(),
        setCartItems: jest.fn()
      }}>
        {ui}
      </CartContext.Provider>
    </BrowserRouter>
  );
}

describe('CheckoutPage UI', () => {
  test('renders empty cart state', () => {
    renderWithProviders(<CheckoutPage />);
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
  });

  test('renders cart items and allows place order button present', () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Pizza', price: 300, qty: 1, restaurantName: 'FoodHub' }]
    });
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Place Order/i })).toBeInTheDocument();
  });

  test('select card payment method', () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Burger', price: 150, qty: 2, restaurantName: 'FoodHub' }]
    });
    const cardRadio = screen.getByRole('radio', { name: /Card/i });
    fireEvent.click(cardRadio);
    expect(cardRadio).toBeChecked();
  });
});
