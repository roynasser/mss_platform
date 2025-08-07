# MSS Platform - Project Overview

## 🚀 Quick Start

1. **Start Docker Desktop** (if not already running)
2. **Run the development environment**:
   ```bash
   ./start-dev.sh
   # OR
   npm run dev
   ```
3. **Access the application**:
   - Main Application: http://localhost:80
   - Frontend Direct: http://localhost:3000  
   - Backend API: http://localhost:3001/api

## 📁 Project Structure

```
mss-platform/
├── 📂 frontend/                 # Next.js + TypeScript + Material-UI
│   ├── 📂 src/
│   │   ├── 📂 app/             # Next.js 14 App Router
│   │   ├── 📂 components/      # Reusable UI components
│   │   ├── 📂 hooks/           # Custom React hooks
│   │   ├── 📂 services/        # API integration
│   │   ├── 📂 types/           # TypeScript definitions
│   │   └── 📂 utils/           # Helper functions
│   ├── package.json
│   ├── Dockerfile.dev
│   ├── .env.example/.env
│   └── tsconfig.json
├── 📂 backend/                  # Express + TypeScript + PostgreSQL
│   ├── 📂 src/
│   │   ├── 📂 controllers/     # Request handlers
│   │   ├── 📂 database/        # DB connection & queries
│   │   ├── 📂 middleware/      # Auth, validation, etc.
│   │   ├── 📂 models/          # Data models
│   │   ├── 📂 routes/          # API routes
│   │   ├── 📂 services/        # Business logic
│   │   ├── 📂 types/           # TypeScript definitions
│   │   ├── 📂 utils/           # Helper functions
│   │   └── server.ts           # Main server file
│   ├── package.json
│   ├── Dockerfile.dev
│   ├── .env.example/.env
│   └── tsconfig.json
├── 📂 database/                 # Database schema & migrations
│   ├── 📂 migrations/          # SQL migration files
│   └── 📂 seeds/               # Sample data
├── 📂 docker/                   # Docker configurations
│   └── nginx.conf              # NGINX reverse proxy config
├── docker-compose.yml           # Development environment
├── package.json                # Root workspace configuration
├── .gitignore                  # Git ignore rules
├── start-dev.sh                # Development startup script
└── verify-setup.sh             # Setup verification script
```

## 🛠 Technology Stack

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI)
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Forms**: React Hook Form
- **State**: React Query for server state

### Backend (Express)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with pg client
- **Cache**: Redis
- **Authentication**: JWT with bcryptjs
- **Real-time**: Socket.IO
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

### Infrastructure
- **Development**: Docker Compose
- **Reverse Proxy**: NGINX
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Hot Reload**: Both frontend and backend

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| `nginx` | 80 | Reverse proxy (main entry point) |
| `frontend` | 3000 | Next.js development server |
| `backend` | 3001 | Express API server |
| `postgres` | 5432 | PostgreSQL database |
| `redis` | 6379 | Redis cache |

## 📦 Available Scripts

### Root Level
```bash
npm run dev                # Start development environment
npm run dev:logs          # View all container logs
npm run dev:stop          # Stop development environment
npm run dev:clean         # Stop and remove all data
npm run dev:rebuild       # Rebuild and restart containers

npm run install:all       # Install all dependencies
npm run build:all         # Build all projects
npm run test:all          # Run all tests
npm run lint:all          # Lint all projects

npm run migrate           # Run database migrations
npm run seed              # Seed database with sample data
```

### Frontend
```bash
cd frontend
npm run dev               # Start development server
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Lint code
npm run type-check        # TypeScript type checking
```

### Backend
```bash
cd backend
npm run dev               # Start development server
npm run build             # Build TypeScript to JavaScript
npm run start             # Start production server
npm run test              # Run tests
npm run lint              # Lint code
npm run migrate           # Run database migrations
npm run seed              # Seed database
```

## 🔧 Development Workflow

### Initial Setup
1. Clone the repository
2. Run `./verify-setup.sh` to check prerequisites
3. Start Docker Desktop
4. Run `./start-dev.sh` to start the development environment
5. Access http://localhost:80

### Daily Development
1. `npm run dev:logs` - Monitor all services
2. Edit code in `frontend/src/` or `backend/src/`
3. Changes auto-reload via hot reload/nodemon
4. Use `npm run dev:stop` when done

### Database Operations
1. `npm run migrate` - Apply schema changes
2. `npm run seed` - Add sample data
3. Access PostgreSQL at `localhost:5432`

## 🗄 Database Schema

The platform includes comprehensive schema for:
- **Users**: Multi-role authentication (customers, technicians, admins)
- **Security Reports**: Vulnerability and threat reporting
- **Alerts**: Real-time security notifications
- **Interventions**: Technician support tickets
- **Audit Logs**: Complete activity tracking

See `/Users/roynasser/Desktop/Dome/database/migrations/001_initial_schema.sql` for full schema.

## 🔐 Environment Variables

### Frontend (.env)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Backend (.env)
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/mss_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
# ... (see backend/.env.example for full list)
```

## 🚨 User Roles & Features

### Corporate Customers
- View security reports and dashboards
- Request interventions
- Monitor alerts and notifications
- Access compliance reports

### Internal Technicians
- Secure remote access to customer environments
- Manage interventions and tickets
- Generate security reports
- Monitor system health

### System Features
- Real-time notifications via Socket.IO
- Multi-tenant data isolation
- Comprehensive audit logging
- Role-based access control
- API rate limiting and security

## 📚 Next Steps

1. **Implement Authentication**: JWT-based auth system
2. **Build Dashboard**: Customer and technician dashboards
3. **Add Report Generation**: PDF/Excel export functionality
4. **Implement Real-time**: Socket.IO for live updates
5. **Add Monitoring**: Health checks and logging
6. **Security Hardening**: Input validation, sanitization
7. **Testing**: Unit and integration tests
8. **Documentation**: API documentation with Swagger

## 🔍 Troubleshooting

### Docker Issues
- Ensure Docker Desktop is running
- Try `npm run dev:clean && npm run dev:rebuild`
- Check container logs: `npm run dev:logs`

### Database Issues
- Reset database: `npm run dev:clean` (removes all data)
- Check migrations: `npm run migrate`

### Port Conflicts
- Ensure ports 80, 3000, 3001, 5432, 6379 are available
- Stop other services using these ports

### Hot Reload Not Working
- Check file permissions
- Restart containers: `npm run dev:stop && npm run dev`

---

**Ready to build the future of cybersecurity! 🛡️**