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
    setError(''); // Reset error message
    setLoading(true);

    if (!validateForm()) {
      setLoading(false); // Stop loading if validation fails
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password: password
      });

      if (response.data.token) {
        login(response.data.token);
        navigate('/dashboard');
      } else {
        setError('Registration successful but no token received');
      }
    } catch (err) {
      // Improved error handling
      if (err.response) {
        // Log the entire error response for debugging
        console.error('Registration error response:', err.response);
        setError(err.response.data.message || 'Registration failed. Please try again.');
      } else {
        setError('Registration failed. Please check your network connection.');
      }
    } finally {
      setLoading(false); // Stop loading regardless of success or failure
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