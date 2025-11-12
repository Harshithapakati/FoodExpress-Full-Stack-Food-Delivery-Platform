import React from "react";
import { Navigate } from "react-router-dom";

/**
 * RequireAdmin: Simple role-based guard for admin routes.
 * Checks localStorage for user role. If not admin or no token, redirects to login.
 */
function RequireAdmin({ children }) {
  try {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');

    if (!token || !userRaw) {
      return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(userRaw);
    const role = (user?.role || '').toString().toLowerCase();

    if (role !== 'admin') {
      // Non-admin user trying to access admin route
      return <Navigate to="/" replace />;
    }

    // User is authenticated and is admin
    return children;
  } catch (error) {
    console.error('RequireAdmin error:', error);
    return <Navigate to="/login" replace />;
  }
}

export default RequireAdmin;
