const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
// Increase payload limit for base64 image data
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Database setup: Mongoose
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/safeguard';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB at ' + MONGODB_URI))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const violationSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  image_data: { type: String },
  confidence: { type: Number },
  description: { type: String }
});
const Violation = mongoose.model('Violation', violationSchema);

const statSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  masked: { type: Number, default: 0 },
  unmasked: { type: Number, default: 0 }
});
const Stat = mongoose.model('Stat', statSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);
  
  if (token === 'guest') {
    req.user = { username: 'guest' };
    return next();
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  let { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  username = username.trim().toLowerCase();

  try {
    const user = new User({ username, password });
    await user.save();
    res.json({ success: true, userId: user._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  let { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  username = username.trim().toLowerCase();

  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.post('/api/violations', authenticateToken, async (req, res) => {
  const { image_data, confidence, description } = req.body;
  
  try {
    const violation = new Violation({ image_data, confidence, description });
    await violation.save();
    
    // Emit real-time alert
    io.emit('new_violation', violation);
    
    res.json(violation);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log violation' });
  }
});

app.get('/api/violations', authenticateToken, async (req, res) => {
  try {
    const violations = await Violation.find().sort({ timestamp: -1 }).limit(50);
    res.json(violations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// New endpoint for logging compliance stats from the live feed
app.post('/api/stats', authenticateToken, async (req, res) => {
  const { masked, unmasked } = req.body;
  
  try {
    const stat = new Stat({ masked, unmasked });
    await stat.save();
    
    // Emit to dashboard for live compliance rate updates
    io.emit('new_stats', stat);
    
    res.json(stat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log stats' });
  }
});

// Fetch compliance stats for the dashboard
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    // Return all stats, or limit to recent to avoid massive payloads
    // Sorting ascending if the frontend expects chronological data, or descending
    const stats = await Stat.find().sort({ timestamp: -1 }).limit(500);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
