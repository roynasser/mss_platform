import './register-paths';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { connectDB } from '@/database/connection';
import { connectRedis } from '@/database/redis';
import { errorHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';

// Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import organizationRoutes from '@/routes/organizations';
import technicianAccessRoutes from '@/routes/technician-access';
import accessManagementRoutes from '@/routes/access-management';
import auditRoutes from '@/routes/audit';
import reportRoutes from '@/routes/reports';
import alertRoutes from '@/routes/alerts';
import interventionRoutes from '@/routes/interventions';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true,
  },
});

const PORT = parseInt(process.env.PORT || '3001', 10);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/organizations', authMiddleware, organizationRoutes);
app.use('/api/technician-access', authMiddleware, technicianAccessRoutes);
app.use('/api/access-management', authMiddleware, accessManagementRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/alerts', authMiddleware, alertRoutes);
app.use('/api/interventions', authMiddleware, interventionRoutes);

// API v1 routes (alternative paths)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);
app.use('/api/v1/organizations', authMiddleware, organizationRoutes);
app.use('/api/v1/technician-access', authMiddleware, technicianAccessRoutes);
app.use('/api/v1/access-management', authMiddleware, accessManagementRoutes);
app.use('/api/v1/audit', authMiddleware, auditRoutes);
app.use('/api/v1/reports', authMiddleware, reportRoutes);
app.use('/api/v1/alerts', authMiddleware, alertRoutes);
app.use('/api/v1/interventions', authMiddleware, interventionRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (room: string) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  socket.on('leave-room', (room: string) => {
    socket.leave(room);
    console.log(`Client ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };