import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'MSS Platform API'
  });
});

// Basic info endpoint
app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'MSS Platform API',
    version: '1.0.0',
    description: 'Cybersecurity Managed Security Services Platform API',
    endpoints: {
      health: '/api/health',
      info: '/api/info',
      users: {
        create: 'POST /api/users',
        list: 'GET /api/users',
        get: 'GET /api/users/:id'
      },
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      }
    }
  });
});

// Mock user storage (in production this would be database)
let users: any[] = [];
let userIdCounter = 1;

// User management routes
app.post('/api/users', (req, res) => {
  try {
    const { email, firstName, lastName, role = 'basic_user', organizationId } = req.body;
    
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'firstName', 'lastName']
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        email
      });
    }

    const newUser = {
      id: userIdCounter++,
      email,
      firstName,
      lastName,
      role,
      organizationId: organizationId || 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    
    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/api/users', (req, res) => {
  res.status(200).json({
    users,
    total: users.length
  });
});

app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.status(200).json({ user });
});

// Basic authentication routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'basic_user' } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password', 'firstName', 'lastName']
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        email
      });
    }

    const newUser = {
      id: userIdCounter++,
      email,
      firstName,
      lastName,
      role,
      organizationId: 1, // Default organization
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: { ...newUser, password: undefined }, // Don't return password
      token: 'mock-jwt-token-' + newUser.id // Mock JWT token
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        required: ['email', 'password']
      });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.status(200).json({
      message: 'Login successful',
      user: { ...user, password: undefined },
      token: 'mock-jwt-token-' + user.id,
      refreshToken: 'mock-refresh-token-' + user.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MSS Platform API Server started on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`ℹ️  Info: http://localhost:${PORT}/api/info`);
  console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;