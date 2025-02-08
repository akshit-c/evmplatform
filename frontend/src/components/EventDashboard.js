import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import io from 'socket.io-client';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5001';

const EventDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, all
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const socket = io(socketUrl);

    socket.on('eventCreated', (newEvent) => {
      setEvents(prev => [...prev, newEvent].sort((a, b) => new Date(a.date) - new Date(b.date)));
    });

    socket.on('eventUpdated', (updatedEvent) => {
      setEvents(prev => prev.map(event => 
        event._id === updatedEvent._id ? updatedEvent : event
      ));
    });

    socket.on('eventDeleted', (eventId) => {
      setEvents(prev => prev.filter(event => event._id !== eventId));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [filter, searchTerm]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/events');
      let filteredEvents = response.data;

      // Debug log
      console.log('Current user:', user);
      console.log('Fetched events:', filteredEvents);
      filteredEvents.forEach(event => {
        console.log('Event:', {
          id: event._id,
          name: event.name,
          creatorId: event.creator?._id || event.creator,
          isCreator: user && (user.id === event.creator?._id || user.id === event.creator)
        });
      });

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
    } catch (err) {
      setError('Failed to fetch events');
      console.error('Error fetching events:', err);
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

  const handleEditEvent = (eventId, e) => {
    e.stopPropagation();
    navigate(`/edit-event/${eventId}`);
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
                      className="edit-btn"
                      onClick={(e) => handleEditEvent(event._id, e)}
                      title="Edit Event"
                    >
                      ✏️
                    </button>
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
                  {format(new Date(event.date), 'MMM dd, yyyy')}
                </div>
                <h3 className="event-title">{event.name}</h3>
                <p className="event-description">{event.description}</p>
                <div className="event-details">
                  <span className="event-location">📍 {event.location}</span>
                  <span className="event-attendees">👥 {event.attendees?.length || 0}</span>
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