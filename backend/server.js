// --- IMPORTS & SETUP ---
// We import necessary packages to build our server.
// express: Creates the web server.
// mongoose: Helps us connect to and talk to our MongoDB database easily.
// cors: Allows our frontend to make requests to our backend (Cross-Origin Resource Sharing).
// http: Node's built-in module to create an HTTP server (needed for WebSockets).
// dotenv: Loads our secret keys from the .env file.
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const http       = require('http');
require('dotenv').config();

// We import our custom socket handler which manages real-time messaging
const { setupSocket } = require('./socket/socketHandler');

// Routes
const authRoutes   = require('./routes/authRoutes');
const chatRoutes   = require('./routes/chatRoutes');
const userRoutes   = require('./routes/userRoutes');
const statusRoutes = require('./routes/statusRoutes');
const aiRoutes            = require('./routes/aiRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const communityRoutes     = require('./routes/communityRoutes');
const callRoutes          = require('./routes/callRoutes');

// --- INITIALIZATION ---
// We create an Express application called 'app'
const app    = express();
// We wrap our Express app in a standard HTTP server so we can use Socket.io
const server = http.createServer(app);
// We start Socket.io on our server for real-time features like instant messages
const io     = setupSocket(server);
// We attach 'io' to 'app' so we can access it anywhere in our routes using req.app.get('io')
app.set('io', io);

const path = require('path');
const fs   = require('fs');

// Ensure all upload subdirectories exist at startup
['audio', 'images', 'videos', 'documents', 'status'].forEach(sub => {
  fs.mkdirSync(path.join(__dirname, 'uploads', sub), { recursive: true });
});

// --- MIDDLEWARE (The Middlemen) ---
// Middleware functions run before our routes. They process incoming requests.
// express.json() allows us to read JSON data sent from the frontend (e.g. { "name": "John" }).
// We set a high limit (50mb) so users can send large text or data.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// This line makes our 'uploads' folder public so users can view images and listen to voice notes.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS security setting: We only allow requests from specific frontend addresses (like our React app).
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
  ],
  credentials: true,
}));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const adminRoutes = require('./routes/adminRoutes');

// --- API ROUTES (The Roadmap) ---
// Here we define the "endpoints" (URLs) our frontend can call.
// Think of this like a restaurant menu. If the frontend asks for '/api/auth',
// we send that request to the authRoutes file to handle login/signup.
app.use('/api/auth',    authRoutes);
app.use('/api/chats',   chatRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/admin',   adminRoutes);
app.use('/api/status',  statusRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/communities',  communityRoutes);
app.use('/api/calls',        callRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found.` }));

// --- DATABASE CONNECTION (MongoDB) ---
// We tell Mongoose to connect to our MongoDB URL (loaded from .env).
// If process.env.MONGODB_URI is missing, it falls back to a local database.
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lingualink')
  .then(async () => {
    console.log('✅ MongoDB connected successfully!');

    // Drop the old text index if it still exists without the correct language_override.
    // This lets Mongoose recreate it with language_override:'dummy' so non-English
    // language values (e.g. 'hi', 'fr') in the `language` field don't cause save errors.
    try {
      const userCol = mongoose.connection.collection('users');
      const indexes = await userCol.indexes();
      const textIdx = indexes.find(i => i.key && i.key._fts === 'text');
      if (textIdx && textIdx.language_override !== 'dummy') {
        await userCol.dropIndex(textIdx.name);
        console.log(`🔧 Dropped stale text index "${textIdx.name}" — will be recreated with correct settings.`);
      }
    } catch (e) {
      // Index already gone or never existed — safe to ignore
      if (!e.message.includes('index not found')) {
        console.warn('[index-fix] Unexpected error:', e.message);
      }
    }

    // Now let Mongoose sync indexes (creates the corrected index)
    await mongoose.model('User').syncIndexes();
    await mongoose.model('User').updateMany({}, { onlineStatus: 'offline' });
    console.log('User indexes synced & stale online statuses cleared.');
  })
  .catch(err => console.error('MongoDB connection failed:', err.message));

// --- START THE SERVER ---
// We tell our server to listen for traffic on a specific port (e.g., 5000).
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`LinguaLink backend running on port ${PORT}`);
});
