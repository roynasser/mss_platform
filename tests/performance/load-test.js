import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],    // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:3001';

// Test scenarios
export default function () {
  // Homepage load test
  let response = http.get(`${BASE_URL}/`);
  check(response, {
    'Homepage status is 200': (r) => r.status === 200,
    'Homepage loads quickly': (r) => r.timings.duration < 500,
  });
  errorRate.add(response.status !== 200);
  
  sleep(1);
  
  // Authentication flow test
  const loginPayload = JSON.stringify({
    email: `user${Math.floor(Math.random() * 1000)}@test.com`,
    password: 'TestPassword123!',
  });
  
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  response = http.post(`${API_URL}/api/auth/login`, loginPayload, loginParams);
  check(response, {
    'Login endpoint responds': (r) => r.status === 200 || r.status === 401,
    'Login responds quickly': (r) => r.timings.duration < 300,
  });
  
  sleep(1);
  
  // Dashboard load test (if authenticated)
  if (response.status === 200) {
    const token = JSON.parse(response.body).token;
    const authParams = {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    
    response = http.get(`${BASE_URL}/dashboard`, authParams);
    check(response, {
      'Dashboard loads': (r) => r.status === 200,
      'Dashboard loads quickly': (r) => r.timings.duration < 600,
    });
    
    // API endpoints test
    response = http.get(`${API_URL}/api/reports/security`, authParams);
    check(response, {
      'Security reports API responds': (r) => r.status === 200,
      'API responds quickly': (r) => r.timings.duration < 200,
    });
    
    response = http.get(`${API_URL}/api/interventions`, authParams);
    check(response, {
      'Interventions API responds': (r) => r.status === 200,
      'API responds quickly': (r) => r.timings.duration < 200,
    });
  }
  
  sleep(2);
}

// Stress test scenario
export function stressTest() {
  const response = http.get(`${BASE_URL}/`);
  check(response, {
    'Status is 200': (r) => r.status === 200,
  });
}

// Spike test scenario
export function spikeTest() {
  const response = http.get(`${API_URL}/api/health`);
  check(response, {
    'Health check passes': (r) => r.status === 200,
  });
}