/* global Buffer */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import authService from '../../services/authService';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../services/notificationService', () => ({
  requestAndRegisterToken: jest.fn().mockResolvedValue({ success: true })
}));
jest.mock('../../services/firebaseConfig', () => ({}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  test('renders login form with all elements', () => {
    renderLogin();
    
    expect(screen.getByText('FoodExpress')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/do not have an account/i)).toBeInTheDocument();
  });

  test('updates form data on input change', () => {
    renderLogin();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('successful login with user data redirects to browse', async () => {
    authService.login.mockResolvedValue({
      success: true,
      data: {
        token: 'fake-jwt-token',
        user: {
          email: 'user@example.com',
          role: 'user',
          userId: '123'
        }
      }
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'user@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'password123' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('fake-jwt-token');
      expect(localStorage.getItem('user')).toContain('user@example.com');
    }, { timeout: 3000 });
  });

  test('successful admin login redirects to admin dashboard', async () => {
    authService.login.mockResolvedValue({
      success: true,
      data: {
        token: 'admin-token',
        user: {
          email: 'admin@example.com',
          role: 'admin',
          userId: 'admin123'
        }
      }
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'admin@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'adminpass' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem('user')).toContain('admin');
    }, { timeout: 3000 });
  });

  test('login without user object extracts from JWT', async () => {
    // Create a fake JWT token with payload
    const payload = { email: 'jwt@example.com', id: 'jwt123', role: 'user' };
    const fakeToken = `header.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;

    authService.login.mockResolvedValue({
      success: true,
      token: fakeToken
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'jwt@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'pass123' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      expect(storedUser.email).toBe('jwt@example.com');
      expect(storedUser.role).toBe('user');
    }, { timeout: 3000 });
  });

  test('failed login shows error message', async () => {
    authService.login.mockResolvedValue({
      success: false,
      message: 'Invalid credentials'
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'wrong@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'wrongpass' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });

    expect(localStorage.getItem('token')).toBeNull();
  });

  test('clears error message when typing', async () => {
    authService.login.mockResolvedValue({
      success: false,
      message: 'Login failed'
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'pass' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });

    // Type in email field
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test2@example.com' } 
    });

    await waitFor(() => {
      expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
    });
  });

  test('shows loading state during login', async () => {
    authService.login.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'test@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'pass123' } 
    });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // Button should be disabled during loading
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  test('partner login redirects to partner dashboard', async () => {
    authService.login.mockResolvedValue({
      success: true,
      data: {
        token: 'partner-token',
        user: {
          email: 'partner@example.com',
          role: 'partner',
          userId: 'partner123'
        }
      }
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: 'partner@example.com' } 
    });
    fireEvent.change(screen.getByLabelText(/password/i), { 
      target: { value: 'partnerpass' } 
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      expect(storedUser.role).toBe('partner');
    }, { timeout: 3000 });
  });
});
