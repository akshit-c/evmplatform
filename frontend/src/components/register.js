import axios from '../utils/axios';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateForm = () => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateForm()) {
      return;
    }

    try {
      console.log('Attempting registration with:', { name, email });
      
      const response = await axios.post('/api/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password: password
      });

      console.log('Registration response:', response.data);

      if (response.data.token) {
        login(response.data.token);
        navigate('/dashboard');
      } else {
        setError('Registration successful but no token received');
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.response) {
        // Server responded with error
        setError(err.response.data.message);
        console.error('Server error:', err.response.data);
      } else if (err.request) {
        // Request made but no response
        setError('No response from server. Please check your connection.');
        console.error('Network error:', err.request);
      } else {
        // Error setting up request
        setError('Failed to make registration request');
        console.error('Request setup error:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Register</h2>
      {error && (
        <p className="error" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your name"
            disabled={loading}
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            disabled={loading}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter password (min 6 characters)"
            minLength={6}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;