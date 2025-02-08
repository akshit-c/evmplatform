import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axios';

// Use environment variable or fallback to localhost
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

const EventDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: false,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socket.on('eventCreated', (newEvent) => {
      setEvents(prev => [...prev, newEvent].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      ));
    });

    socket.on('eventUpdated', (updatedEvent) => {
      setEvents(prev => prev.map(event => 
        event._id === updatedEvent._id ? updatedEvent : event
      ));
    });

    socket.on('eventDeleted', (eventId) => {
      setEvents(prev => prev.filter(event => event._id !== eventId));
    });

    // Cleanup on unmount
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [filter, searchTerm]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/events', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      let filteredEvents = response.data;

      // Apply filters
      if (filter === 'upcoming') {
        filteredEvents = filteredEvents.filter(event => new Date(event.date) > new Date());
      } else if (filter === 'past') {
        filteredEvents = filteredEvents.filter(event => new Date(event.date) < new Date());
      }

      if (searchTerm) {
        filteredEvents = filteredEvents.filter(event => 
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setEvents(filteredEvents);
      setError('');
    } catch (err) {
      console.error('Error fetching events:', err);
      if (err.response?.status === 401) {
        setError('Please log in to view events');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch events');
      }
    } finally {
      setLoading(false);
    }
  };

  const getEventStatusClass = (date) => {
    const eventDate = new Date(date);
    const now = new Date();
    return eventDate > now ? 'upcoming' : 'past';
  };

  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation(); // Prevent event card click
    
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await axios.delete(`/api/events/${eventId}`);
      setEvents(prev => prev.filter(event => event._id !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Events Dashboard</h1>
        <button 
          className="create-event-btn"
          onClick={() => navigate('/create-event')}
        >
          Create New Event
        </button>
      </div>

      <div className="filters-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-options">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming Events</option>
            <option value="past">Past Events</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="events-grid">
        {events.length === 0 ? (
          <div className="no-events">
            <p>No events found</p>
          </div>
        ) : (
          events.map(event => {
            const isCreator = user && event.creator && 
              (user.id === event.creator._id || user.id === event.creator);

            return (
              <div 
                key={event._id} 
                className={`event-card ${getEventStatusClass(event.date)}`}
                onClick={() => handleEventClick(event._id)}
              >
                {isCreator && (
                  <div className="event-actions">
                    <button 
                      className="delete-btn"
                      onClick={(e) => handleDeleteEvent(event._id, e)}
                      title="Delete Event"
                    >
                      🗑️
                    </button>
                  </div>
                )}
                <div className="event-date">
                  {format(new Date(event.date), 'MMM dd, yyyy • h:mm a')}
                </div>
                <h3 className="event-title">{event.name}</h3>
                <div className="event-organizer">
                  <span className="organizer-label">By</span>
                  <span className="organizer-name">{event.creator?.name || 'Unknown'}</span>
                </div>
                <p className="event-description">{event.description}</p>
                <div className="event-details">
                  <span className="event-location">📍 {event.location}</span>
                </div>
                <div className="event-footer">
                  <div className="organizer">
                    <h3>Organized by</h3>
                    <p>{event.creator?.name || 'Unknown'}</p>
                  </div>
                  <div className="separator"></div>
                  <div className="attendees">
                    <h3>Attendees</h3>
                    <p>👥 {event.attendees?.length || 0}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EventDashboard;