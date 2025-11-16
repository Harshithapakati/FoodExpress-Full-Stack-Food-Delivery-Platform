import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from '../CheckoutPage.jsx';
import { BrowserRouter } from 'react-router-dom';
import { CartContext } from '../CartContext.jsx';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

global.fetch = jest.fn();

function renderWithProviders(ui, { cartItems = [] } = {}) {
  const mockUpdateQuantity = jest.fn();
  const mockRemoveFromCart = jest.fn();
  const mockSetCartItems = jest.fn();
  
  return {
    ...render(
      <BrowserRouter>
        <CartContext.Provider value={{
          cartItems,
          updateQuantity: mockUpdateQuantity,
          removeFromCart: mockRemoveFromCart,
          setCartItems: mockSetCartItems
        }}>
          {ui}
        </CartContext.Provider>
      </BrowserRouter>
    ),
    mockUpdateQuantity,
    mockRemoveFromCart,
    mockSetCartItems
  };
}

describe('CheckoutPage UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ email: 'test@test.com' }));
    global.fetch.mockClear();
  });

  test('renders empty cart state', () => {
    renderWithProviders(<CheckoutPage />);
    expect(screen.getByText(/Your cart is empty/i)).toBeInTheDocument();
  });

  test('renders cart items and calculates totals correctly', () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Pizza', price: 300, qty: 2, restaurantName: 'FoodHub' }]
    });
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getAllByText(/₹600/)[0]).toBeInTheDocument(); // Subtotal appears twice
  });

  test('calculates free delivery for orders above 500', () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Pizza', price: 600, qty: 1, restaurantName: 'FoodHub' }]
    });
    expect(screen.getByText(/Free/)).toBeInTheDocument();
  });

  test('select card payment method', () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Burger', price: 150, qty: 2, restaurantName: 'FoodHub' }]
    });
    const cardRadio = screen.getByRole('radio', { name: /Card/i });
    fireEvent.click(cardRadio);
    expect(cardRadio).toBeChecked();
  });

  test('validates form fields before submitting', async () => {
    global.alert = jest.fn();
    
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Burger', price: 150, qty: 1, restaurantName: 'FoodHub' }]
    });
    
    const placeOrderBtn = screen.getByRole('button', { name: /Place Order/i });
    fireEvent.click(placeOrderBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  test('validates phone number format', async () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Burger', price: 150, qty: 1, restaurantName: 'FoodHub' }]
    });
    
    const phoneInput = screen.getByPlaceholderText(/Phone/i);
    fireEvent.change(phoneInput, { target: { value: '123' } });
    
    const placeOrderBtn = screen.getByRole('button', { name: /Place Order/i });
    fireEvent.click(placeOrderBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Phone must be 10 digits/i)).toBeInTheDocument();
    });
  });

  test('validates pincode format', async () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Burger', price: 150, qty: 1, restaurantName: 'FoodHub' }]
    });
    
    const pincodeInput = screen.getByPlaceholderText(/Pincode/i);
    fireEvent.change(pincodeInput, { target: { value: '12345' } });
    
    const placeOrderBtn = screen.getByRole('button', { name: /Place Order/i });
    fireEvent.click(placeOrderBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/Pincode must be 6 digits/i)).toBeInTheDocument();
    });
  });

  test('handles quantity update', () => {
    const { mockUpdateQuantity } = renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Burger', price: 150, qty: 2, restaurantName: 'FoodHub' }]
    });
    
    const increaseBtn = screen.getByRole('button', { name: '+' });
    fireEvent.click(increaseBtn);
    
    expect(mockUpdateQuantity).toHaveBeenCalledWith('1', 3);
  });

  test('handles item removal', () => {
    const { mockRemoveFromCart } = renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Burger', price: 150, qty: 1, restaurantName: 'FoodHub' }]
    });
    
    const removeBtn = screen.getByTitle('Remove item');
    fireEvent.click(removeBtn);
    
    expect(mockRemoveFromCart).toHaveBeenCalledWith('1');
  });

  test('navigates to browse when adding more to empty cart', () => {
    renderWithProviders(<CheckoutPage />);
    
    const addMoreBtn = screen.getByRole('button', { name: /Add Items/i });
    fireEvent.click(addMoreBtn);
    
    expect(mockNavigate).toHaveBeenCalledWith('/browse');
  });

  test('navigates to restaurant menu when adding more items', () => {
    renderWithProviders(<CheckoutPage />, {
      cartItems: [{ _id: '1', name: 'Pizza', price: 300, qty: 1, restaurantName: 'FoodHub', restaurantId: 'rest123' }]
    });
    
    const addMoreBtn = screen.getByRole('button', { name: /Add More Items/i });
    fireEvent.click(addMoreBtn);
    
    expect(mockNavigate).toHaveBeenCalledWith('/menu?id=rest123');
  });
});
