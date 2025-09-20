import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { createWebSocketServer } from './websocket.js';
import { gamesRouter } from './routes/games.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sequence Game Backend Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/games', gamesRouter);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
let wss;
try {
  wss = createWebSocketServer(server);
  console.log('✅ WebSocket server created successfully');
} catch (error) {
  console.error('❌ Failed to create WebSocket server:', error);
  process.exit(1);
}

// Start the server
const startServer = async () => {
  try {
    // Connect to database first
    console.log('🔄 Starting server initialization...');
    await connectDatabase();
    
    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 HTTP server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server: ws://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🗄️  Database: Connected to MongoDB Atlas`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    await disconnectDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    console.log('Server closed');
    await disconnectDatabase();
    process.exit(0);
  });
});
