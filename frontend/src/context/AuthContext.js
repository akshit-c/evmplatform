import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [user, setUser] = useState(null);

  // Initialize user from stored token on mount
  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUser({
          id: decodedToken.userId,
          email: decodedToken.email,
          name: decodedToken.name
        });
      } catch (error) {
        console.error('Error decoding token:', error);
        logout(); // Clear invalid token
      }
    }
  }, []);

  const login = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      console.log('Decoded token:', decodedToken);
      const userData = {
        id: decodedToken.userId,
        email: decodedToken.email,
        name: decodedToken.name
      };
      console.log('Setting user data:', userData);
      setUser(userData);
      setToken(token);
      setIsAuthenticated(true);
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Error setting user data:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 