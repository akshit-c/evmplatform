import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const EventDetails = () => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // Get token directly from localStorage as backup
        const storedToken = localStorage.getItem('token');
        const authToken = token || storedToken;

        console.log('Event ID:', id);
        console.log('Auth Token available:', !!authToken);

        if (!authToken) {
          throw new Error('No authentication token available');
        }

        const response = await axios.get(`/api/events/${id}`);
        console.log('Event data:', response.data);
        
        if (!response.data) {
          throw new Error('No event data received');
        }

        setEvent(response.data);
        setError('');
      } catch (err) {
        console.error('Error fetching event:', err);
        if (err.response?.status === 401) {
          setError('Please log in to view event details');
          setTimeout(() => navigate('/login'), 1500);
        } else {
          setError(err.response?.data?.message || 'Failed to fetch event details');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthenticated) {
      setError('Please log in to view event details');
      setLoading(false);
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    fetchEvent();
  }, [id, token, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container">
        <h2>Event not found</h2>
        <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="container event-details-container">
      <button 
        className="back-button"
        onClick={() => navigate('/dashboard')}
      >
        ← Back to Dashboard
      </button>
      
      <div className="event-header">
        <h1>{event.name}</h1>
        <div className="event-meta">
          <span className="date">📅 {format(new Date(event.date), 'PPP')}</span>
          <span className="location">📍 {event.location}</span>
        </div>
      </div>

      <div className="event-body">
        <h3>Description</h3>
        <p>{event.description}</p>
      </div>

      <div className="event-footer">
        <div className="organizer">
          <h3>Organized by</h3>
          <p>{event.creator?.name || 'Unknown'}</p>
        </div>
        <div className="attendees">
          <h3>Attendees</h3>
          <p>👥 {event.attendees?.length || 0} people attending</p>
        </div>
      </div>
    </div>
  );
};

export default EventDetails; 