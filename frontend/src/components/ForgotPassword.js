import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post('/api/auth/forgot-password', { 
        email: email.trim().toLowerCase() 
      });
      
      if (response.data.resetToken) {
        // Show message and redirect after a short delay
        setMessage('Password reset link generated. Redirecting...');
        setTimeout(() => {
          navigate(`/reset-password/${response.data.resetToken}`);
        }, 1500);
      } else {
        setMessage(response.data.message);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      if (err.response) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError('No response from server. Please try again.');
      } else {
        setError('Failed to process request');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Forgot Password</h2>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
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
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Reset Password'}
        </button>
        <div className="form-footer">
          <Link to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword; 