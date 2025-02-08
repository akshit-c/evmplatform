const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Add Cloudinary configuration
cloudinary.config({ 
  cloud_name: 'your_cloud_name', 
  api_key: 'your_api_key', 
  api_secret: 'your_api_secret' 
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return resetToken;
};

const User = mongoose.model('User', userSchema);

// Event Schema
const eventSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  date: { 
    type: Date, 
    required: true 
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  creator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  image: {
    url: String,
    public_id: String
  }
});

const Event = mongoose.model('Event', eventSchema);

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for new events
  socket.on('newEvent', async (eventData) => {
    try {
      const event = new Event(eventData);
      const savedEvent = await event.save();
      // Broadcast the new event to all connected clients
      io.emit('eventCreated', savedEvent);
    } catch (error) {
      socket.emit('eventError', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('creator', '_id name email')
      .sort({ date: 1 });
    
    // Convert events to include string IDs
    const formattedEvents = events.map(event => ({
      ...event.toObject(),
      _id: event._id.toString(),
      creator: {
        ...event.creator.toObject(),
        _id: event.creator._id.toString()
      }
    }));
    
    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

app.get('/api/auth/test', (req, res) => {
  res.json({ message: 'Auth endpoint is working' });
});

app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Convert ObjectId to string for consistent comparison
    const token = jwt.sign(
      { 
        userId: user._id.toString(), // Convert to string
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    console.log('Forgot password request received:', req.body);
    const { email } = req.body;

    // Validate email
    if (!email) {
      console.log('Email missing from request');
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      return res.status(404).json({ message: 'No account with that email exists' });
    }

    try {
      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      console.log('Reset token generated:', resetToken);

      // Save user with new token
      await user.save();
      console.log('User saved with reset token');

      // In production, you would send an email here
      // For development, return the token in the response
      res.json({ 
        message: 'Password reset instructions sent to your email',
        resetToken // Remove this in production
      });
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new Error('Error generating reset token');
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Error processing password reset request',
      error: error.message 
    });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    console.log('Reset password request received:', { token: req.body.token ? 'exists' : 'missing' });
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        message: 'Token and new password are required' 
      });
    }

    // Hash the token from the request
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log('Looking for user with reset token');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('No user found with valid reset token');
      return res.status(400).json({ 
        message: 'Password reset token is invalid or has expired' 
      });
    }

    console.log('User found, updating password');
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update user
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    console.log('Password updated successfully');

    res.json({ 
      message: 'Password has been reset successfully. Please log in with your new password.' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Error resetting password. Please try again.' 
    });
  }
});

// Event Routes
app.post('/api/events', auth, async (req, res) => {
  try {
    const { name, description, date, location } = req.body;

    if (!name || !description || !date || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const event = new Event({
      name,
      description,
      date,
      location,
      creator: req.user._id
    });

    const savedEvent = await event.save();
    const populatedEvent = await Event.findById(savedEvent._id)
      .populate('creator', '_id name email');

    io.emit('eventCreated', populatedEvent);
    res.status(201).json(populatedEvent);
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

app.get('/api/events/:id', auth, async (req, res) => {
  try {
    console.log('Event details request:', {
      eventId: req.params.id,
      userId: req.user._id,
      authHeader: req.headers.authorization
    });

    const event = await Event.findById(req.params.id)
      .populate('creator', '_id name email');
    
    if (!event) {
      console.log('Event not found:', req.params.id);
      return res.status(404).json({ message: 'Event not found' });
    }

    console.log('Event found:', {
      id: event._id,
      name: event.name,
      creator: event.creator._id
    });

    const formattedEvent = {
      ...event.toObject(),
      _id: event._id.toString(),
      creator: event.creator ? {
        ...event.creator.toObject(),
        _id: event.creator._id.toString()
      } : null
    };
    
    res.json(formattedEvent);
  } catch (error) {
    console.error('Error in /api/events/:id:', error);
    res.status(500).json({ 
      message: 'Error fetching event details',
      error: error.message 
    });
  }
});

app.put('/api/events/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      event[key] = updates[key];
    });

    await event.save();
    res.json({ message: 'Event updated successfully', event });
  } catch (error) {
    res.status(500).json({ message: 'Error updating event' });
  }
});

app.delete('/api/events/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);
    
    // Emit event deletion through socket
    io.emit('eventDeleted', req.params.id);
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Error deleting event' });
  }
});

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));