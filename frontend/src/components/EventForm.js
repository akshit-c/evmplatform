import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axios';

const EventForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    organizerName: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Creating event with data:', formData);
      
      const response = await axios.post('/api/events', {
        ...formData,
        organizerName: formData.organizerName || user?.name || 'Unknown'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Event created:', response.data);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error creating event:', err);
      if (err.response?.status === 401) {
        setError('Please log in again to create an event');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.response?.data?.message || 'Failed to create event');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="container">
      <h2>Create New Event</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Event Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label>Organizer Name</label>
          <input
            type="text"
            name="organizerName"
            value={formData.organizerName}
            onChange={handleChange}
            placeholder={user?.name || 'Enter organizer name'}
            disabled={loading}
          />
          <small className="form-hint">
            Leave blank to use your account name
          </small>
        </div>
        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label>Date</label>
          <input
            type="datetime-local"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <div>
          <label>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
};

export default EventForm;