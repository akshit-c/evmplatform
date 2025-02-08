import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from '../utils/axios';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    if (!token) {
      setError('Reset token is missing');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        newPassword: password
      });

      setMessage(response.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      if (err.response) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError('No response from server. Please try again.');
      } else {
        setError('Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container">
        <h2>Invalid Reset Link</h2>
        <p className="error">The password reset link is invalid or has expired.</p>
        <div className="form-footer">
          <Link to="/forgot-password">Request a new reset link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Reset Password</h2>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter new password"
            minLength={6}
            disabled={loading}
          />
        </div>
        <div>
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm new password"
            minLength={6}
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Set New Password'}
        </button>
        <div className="form-footer">
          <Link to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword; 