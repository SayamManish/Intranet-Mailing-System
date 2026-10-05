require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Server } = require('socket.io');

const initDatabase = require('./database/init');
const { initSockets } = require('./sockets/socketHandler');
const { setSocketIO } = require('./utils/notify');

// Import routes
const authRoutes = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const folderRoutes = require('./routes/folderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const attachmentRoutes = require('./routes/attachmentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize database
initDatabase();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with flexible CORS for LAN development
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Configure Socket.IO in utils
setSocketIO(io);
initSockets(io);

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: true, // Reflect request origin for LAN flexibility
  credentials: true
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Reasonable limit for active intranet users
  message: {
    success: false,
    message: 'Too many requests from this network IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);

// Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Intranet Mailing & Realtime Communication System',
    timestamp: new Date().toISOString(),
    lan_ready: true
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/admin', adminRoutes);

// ─── Serve built React frontend (for LAN / production use) ─────────────────
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Catch-all: return index.html for React Router (client-side routing)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 404 Handler for API routes when dist doesn't exist
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found on intranet server.'
    });
  });
}

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  if (err.message && err.message.includes('File type not permitted')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File exceeds the maximum allowed size (10 MB).'
    });
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected internal error occurred. Please contact IT support.'
  });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`🚀 Intranet Mailing System Server running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://${HOST}:${PORT}`);
  console.log(`   - Mode:    LAN Internal Communication`);
  console.log(`====================================================`);
});
