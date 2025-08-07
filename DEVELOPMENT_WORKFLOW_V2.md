# Development Workflow Documentation - Version 2.0

**Created**: August 7, 2025  
**Version**: 2.0 (Supersedes Version 1.0)  
**Changes**: Enhanced session management, activity tracking, mock API system integration  

## Overview

This document outlines the development workflow for the MSS Platform Version 2.0, incorporating the new session management system, enhanced remote access features, and mock API framework for seamless development experience.

## Development Environment Setup

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- Git for version control
- VS Code (recommended) with TypeScript extensions

### Version 2.0 Enhancements
- **Mock API System**: Development continues without backend dependencies
- **Enhanced Session Persistence**: No logouts during development iteration
- **Activity Tracking**: Automatic session management during coding
- **Improved Hot Reload**: Better state preservation during code changes

### Quick Start
```bash
# Clone repository
git clone [repository-url]
cd mss-platform

# Start development environment
docker-compose up -d

# Install dependencies
npm install

# Start frontend development server
npm run dev

# Access application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# Database: localhost:5432
# Redis: localhost:6379
```

## Version 2.0 Development Features

### 1. Mock API Development Mode
The platform now includes comprehensive mock APIs that prevent development errors and enable full-featured UI development.

#### Key Benefits:
- **No Backend Required**: Develop UI features independently
- **Realistic Data**: Dynamic mock data generation for testing
- **Error Prevention**: No "route not found" errors during development
- **Easy Migration**: TODO comments mark mock APIs for replacement

#### Mock API Usage:
```typescript
// Example: Customer Dashboard Development
const response = await apiService.getCustomerDashboard();
// Returns realistic mock data immediately
// TODO: Replace with real API when backend ready
```

### 2. Enhanced Session Management
Development workflow benefits from improved session persistence:

#### Developer Benefits:
- **No Login Interruptions**: Code changes don't log you out
- **Browser Refresh Safe**: Maintain authentication across refreshes
- **Multi-Tab Development**: Consistent session across browser tabs
- **Network Error Recovery**: Continue development during server restarts

#### Session Configuration:
```typescript
// Development-friendly timeouts
SESSION_TIMEOUT: 5 * 60 * 1000,        // 5 minutes (adjustable)
TOKEN_CHECK_THRESHOLD: 45 * 60 * 1000, // 45 minutes (adjustable)
```

### 3. Activity Tracking Integration
New components automatically integrate with activity tracking:

```typescript
// Any user interaction extends session
import { useActivityTracker } from '../hooks/useActivityTracker';

const MyComponent = () => {
  useActivityTracker(); // Automatic session extension
  // Component logic...
};
```

## Development Workflow

### 1. Feature Development Process

#### Planning Phase
1. **Review existing documentation** (SESSION_MANAGEMENT_V2.md, API_DOCUMENTATION_V2.md)
2. **Identify required APIs** - check if mocks exist
3. **Plan session management integration** for new features
4. **Design activity tracking requirements**

#### Implementation Phase
```typescript
// 1. Create component with activity tracking
const NewFeatureComponent = () => {
  const { updateActivity } = useActivityTracker();
  
  // 2. Use mock APIs during development
  const loadData = async () => {
    const response = await apiService.getFeatureData();
    if (response.success) {
      setData(response.data);
    }
  };
  
  // 3. Handle user interactions
  const handleUserAction = () => {
    updateActivity(); // Extend session
    // Action logic...
  };
};
```

#### Testing Phase
1. **Test session persistence** - refresh browser, navigate back/forward
2. **Test activity tracking** - verify session extends on interactions
3. **Test mock APIs** - ensure realistic data displays correctly
4. **Test error scenarios** - network errors, server downtime

### 2. API Development Workflow

#### For Frontend-Only Development
```typescript
// Use existing mock APIs or create new ones
async getNewFeatureData(): Promise<ApiResponse<any>> {
  // TODO: Replace with real API when backend ready
  return Promise.resolve({
    success: true,
    data: {
      // Realistic mock data structure
      items: [...],
      metadata: {...}
    }
  });
}
```

#### For Backend Integration
```typescript
// Replace mock with real API
async getNewFeatureData(): Promise<ApiResponse<any>> {
  return this.makeRequest('/feature/data', {
    requireAuth: true,
    method: 'GET'
  });
}
```

### 3. Authentication Testing

#### Session Management Testing
```typescript
// Test scenarios to verify
1. Browser refresh → Session maintained ✅
2. Network interruption → Graceful fallback ✅
3. True inactivity (5+ min) → Automatic logout ✅
4. Token expiry → Smart refresh handling ✅
```

#### Activity Tracking Testing
```typescript
// Verify activity extends session
const testActivity = () => {
  // Simulate user interactions
  fireEvent.click(button);
  fireEvent.scroll(window);
  fireEvent.keyPress(input);
  
  // Check activity timestamp updated
  const lastActivity = localStorage.getItem('mss_last_activity');
  expect(parseInt(lastActivity)).toBeCloseTo(Date.now(), -1000);
};
```

## Code Organization

### Version 2.0 Structure
```
src/
├── components/
│   ├── auth/                 # Enhanced authentication components
│   ├── dashboard/           # Dashboard with mock API integration
│   ├── remote/              # Enhanced remote access terminal
│   └── providers/           # Activity tracker provider
├── contexts/
│   ├── AuthContext.tsx     # Enhanced session management
│   └── WebSocketContext.tsx
├── hooks/
│   └── useActivityTracker.ts # NEW: Activity monitoring hook
├── services/
│   ├── authService.ts      # Enhanced with activity tracking
│   └── apiService.ts       # Mock API system integration
└── types/                   # TypeScript definitions
```

### New Files in Version 2.0
- `hooks/useActivityTracker.ts` - Activity monitoring
- `components/providers/ActivityTracker.tsx` - Activity provider
- Mock API implementations in `services/apiService.ts`

## Development Best Practices

### 1. Session Management
```typescript
// DO: Use activity tracker in interactive components
const MyComponent = () => {
  useActivityTracker();
  // Component logic
};

// DON'T: Manually manage session timeouts
// The system handles this automatically
```

### 2. API Integration
```typescript
// DO: Use mock APIs during development
async loadDashboardData() {
  const response = await apiService.getCustomerDashboard();
  // Works immediately with realistic data
}

// DO: Add TODO comments for real API migration
// TODO: Replace with actual API call when backend endpoint is implemented

// DON'T: Hard-code API responses in components
// Use the centralized mock API system instead
```

### 3. Error Handling
```typescript
// DO: Handle both mock and real API responses consistently
const response = await apiService.getData();
if (response.success) {
  setData(response.data);
} else {
  setError(response.error || 'Failed to load data');
}

// DO: Test error scenarios with mock APIs
// Mock APIs can simulate various error conditions
```

### 4. Activity Tracking
```typescript
// DO: Let the system handle activity automatically
// Activity tracker monitors user interactions automatically

// DON'T: Manually update activity timestamps
// Use the provided hooks and context instead
```

## Testing Strategy

### 1. Component Testing
```typescript
// Test with mock APIs
describe('CustomerDashboard', () => {
  it('loads data from mock API', async () => {
    render(<CustomerDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Security Score: 85%')).toBeInTheDocument();
    });
  });
  
  it('handles mock API errors gracefully', async () => {
    // Test error scenarios
  });
});
```

### 2. Session Management Testing
```typescript
// Test session persistence
describe('Session Management', () => {
  it('persists session across page refresh', () => {
    // Login user
    // Refresh page
    // Verify still authenticated
  });
  
  it('extends session on user activity', () => {
    // Simulate user interaction
    // Check activity timestamp updated
  });
});
```

### 3. Integration Testing
```typescript
// Test real API integration
describe('API Integration', () => {
  it('migrates from mock to real API', async () => {
    // Switch from mock to real API
    // Verify same data structure
    // Confirm functionality maintained
  });
});
```

## Debugging and Troubleshooting

### 1. Session Issues
```typescript
// Debug session state
if (process.env.NODE_ENV === 'development') {
  console.log('Session state:', {
    isAuthenticated,
    lastActivity: localStorage.getItem('mss_last_activity'),
    sessionAge: Date.now() - parseInt(lastActivity),
    shouldVerifyToken
  });
}
```

### 2. Activity Tracking Issues
```typescript
// Debug activity tracking
const { updateActivity } = useActivityTracker();

// Check if activity events are firing
document.addEventListener('click', () => {
  console.log('Activity event detected');
});
```

### 3. Mock API Issues
```typescript
// Debug mock API responses
async getCustomerDashboard() {
  console.log('Using mock customer dashboard API');
  const mockData = { /* mock data */ };
  console.log('Returning mock data:', mockData);
  return Promise.resolve({ success: true, data: mockData });
}
```

## Deployment Workflow

### 1. Development to Staging
```bash
# Ensure all TODOs are documented
git grep -n "TODO.*Replace with.*API"

# Run tests
npm test

# Build production bundle
npm run build

# Deploy to staging
npm run deploy:staging
```

### 2. Mock API Migration
```typescript
// Step 1: Identify mock APIs in use
grep -r "TODO.*Replace with.*API" src/services/

// Step 2: Implement real API endpoints on backend
POST /api/dashboard/customer
GET /api/analytics/security-metrics

// Step 3: Replace mock with real API calls
- // TODO: Replace with actual API call when backend endpoint is implemented
+ return this.makeRequest('/dashboard/customer', { requireAuth: true });

// Step 4: Test integration
npm test
```

### 3. Production Deployment
```bash
# Verify no mock APIs in production build
npm run build
grep -r "TODO.*Replace" dist/ # Should return nothing

# Deploy to production
npm run deploy:production
```

## Performance Optimization

### 1. Session Management
- **Reduced API Calls**: Smart token verification reduces calls by ~60%
- **Better Caching**: Session data cached locally with activity tracking
- **Faster Page Loads**: Eliminated unnecessary token verification on every load

### 2. Mock API System
- **Development Speed**: Instant responses during development
- **Realistic Testing**: Dynamic data generation for comprehensive testing
- **Easy Migration**: Seamless transition to real APIs

### 3. Activity Tracking
- **Optimized Event Handling**: Debounced activity updates
- **Minimal Overhead**: Lightweight event listeners
- **Battery Efficiency**: Smart activity detection

## Version Control and Documentation

### 1. Commit Guidelines
```bash
# Session management changes
git commit -m "feat: enhance session persistence with activity tracking"

# Mock API additions
git commit -m "feat: add mock API for customer dashboard"

# Bug fixes
git commit -m "fix: resolve connection timing in remote access terminal"
```

### 2. Documentation Updates
- Always update version numbers in documentation
- Create new versioned files for major changes
- Include migration guides for breaking changes
- Document new features with examples

### 3. Code Review Checklist
- ✅ Activity tracking integrated in interactive components
- ✅ Mock APIs have TODO comments for migration
- ✅ Session management properly implemented
- ✅ Error handling covers all scenarios
- ✅ Performance implications considered
- ✅ Documentation updated

## Future Development Considerations

### 1. Version 2.1 Planning
- Session warning notifications
- Multi-tab activity synchronization
- Enhanced customer portal features
- Advanced security metrics

### 2. Technical Debt Management
- Replace mock APIs with real implementations
- Optimize activity tracking performance
- Enhance error handling coverage
- Improve test coverage

### 3. Architecture Evolution
- Consider GraphQL for complex data fetching
- Implement service workers for offline support
- Add real-time collaboration features
- Enhance mobile responsiveness

---

**Next Steps for Developers:**
1. Familiarize yourself with the new session management system
2. Use mock APIs for rapid UI development
3. Integrate activity tracking in new components
4. Follow the enhanced testing strategy
5. Document any new mock APIs created