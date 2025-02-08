import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Login from './components/login';
import Register from './components/register';
import EventDashboard from './components/EventDashboard';
import EventForm from './components/EventForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import EventDetails from './components/EventDetails';
import './App.css';

const Navigation = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="nav-bar">
      {isAuthenticated ? (
        <>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/create-event">Create Event</Link>
          <button onClick={logout} className="nav-button">Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navigation />
          <div className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <EventDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/create-event" 
                element={
                  <ProtectedRoute>
                    <EventForm />
                  </ProtectedRoute>
                } 
              />
              <Route path="/" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route 
                path="/event/:id" 
                element={
                  <ProtectedRoute>
                    <EventDetails />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;