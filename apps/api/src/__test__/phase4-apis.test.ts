import request from 'supertest';
import express from 'express';
import { getTestApp } from './helpers/test-server';

describe('Phase 4: Customer Portal APIs', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = await getTestApp();
  });

  describe('Dashboard API', () => {
    it('should get dashboard overview', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('securityScore');
      expect(response.body.data).toHaveProperty('alertStats');
      expect(response.body.data).toHaveProperty('interventionStats');
    });

    it('should get security score details', async () => {
      const response = await request(app)
        .get('/api/dashboard/security-score')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('currentScore');
      expect(response.body.data).toHaveProperty('scoreBreakdown');
    });

    it('should get real-time security status', async () => {
      const response = await request(app)
        .get('/api/dashboard/security-status')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallStatus');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('interventions');
    });

    it('should get vulnerability distribution', async () => {
      const response = await request(app)
        .get('/api/dashboard/vulnerabilities')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('critical');
    });

    it('should get compliance dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard/compliance')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('frameworks');
    });
  });

  describe('Reports API Enhancements', () => {
    it('should get reports with enhanced filtering', async () => {
      const response = await request(app)
        .get('/api/reports')
        .query({
          page: 1,
          limit: 10,
          report_type: 'vulnerability_assessment',
          severity: 'high',
          search: 'security'
        })
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reports');
      expect(response.body.data).toHaveProperty('total');
    });

    it('should generate a new report', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          customer_org_id: 'test-org-id',
          report_type: 'vulnerability_assessment',
          title: 'Test Security Report',
          description: 'Automated test report',
          severity: 'medium'
        })
        .set('Authorization', 'Bearer mock-token')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Security Report');
    });

    it('should export report as JSON', async () => {
      const response = await request(app)
        .get('/api/reports/test-id/export')
        .query({ format: 'json' })
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should handle CSV export (currently not implemented)', async () => {
      const response = await request(app)
        .get('/api/reports/test-id/export')
        .query({ format: 'csv' })
        .set('Authorization', 'Bearer mock-token')
        .expect(501);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('CSV export not yet implemented');
    });
  });

  describe('Interventions API Enhancements', () => {
    it('should get interventions with SLA tracking', async () => {
      const response = await request(app)
        .get('/api/interventions')
        .query({
          page: 1,
          limit: 10,
          status: 'pending',
          priority: 'high'
        })
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('interventions');
      expect(response.body.data.interventions[0]).toHaveProperty('slaStatus');
    });

    it('should create intervention with SLA calculation', async () => {
      const response = await request(app)
        .post('/api/interventions')
        .send({
          title: 'Test Intervention',
          description: 'Test intervention request',
          request_type: 'incident_response',
          priority: 'high',
          customer_notes: 'Urgent security incident'
        })
        .set('Authorization', 'Bearer mock-token')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('estimatedCompletion');
      expect(response.body.data.priority).toBe('high');
    });

    it('should get SLA analytics', async () => {
      const response = await request(app)
        .get('/api/interventions/analytics/sla')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('slaCompliance');
      expect(response.body.data).toHaveProperty('totalInterventions');
    });
  });

  describe('Analytics API', () => {
    it('should get analytics overview', async () => {
      const response = await request(app)
        .get('/api/analytics/overview')
        .query({ period_days: 30 })
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('securityTrends');
      expect(response.body.data).toHaveProperty('alertAnalytics');
      expect(response.body.data).toHaveProperty('interventionAnalytics');
    });

    it('should get predictive analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/predictions')
        .query({ forecast_days: 30 })
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('predictions');
      expect(response.body.data).toHaveProperty('confidence');
    });

    it('should get benchmark analysis', async () => {
      const response = await request(app)
        .get('/api/analytics/benchmarks')
        .query({ industry: 'technology' })
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('industry');
      expect(response.body.data).toHaveProperty('benchmarks');
    });

    it('should get security maturity assessment', async () => {
      const response = await request(app)
        .get('/api/analytics/maturity-assessment')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallMaturity');
      expect(response.body.data).toHaveProperty('domains');
    });

    it('should calculate custom metrics', async () => {
      const response = await request(app)
        .post('/api/analytics/custom-metrics')
        .send({
          metrics: ['alert_velocity', 'resolution_efficiency'],
          period_days: 30,
          aggregation: 'daily'
        })
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data.metrics).toHaveProperty('alert_velocity');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid report export format', async () => {
      const response = await request(app)
        .get('/api/reports/test-id/export')
        .query({ format: 'invalid' })
        .set('Authorization', 'Bearer mock-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unsupported format');
    });

    it('should handle missing required fields for intervention', async () => {
      const response = await request(app)
        .post('/api/interventions')
        .send({
          title: 'Test Intervention'
          // Missing description and request_type
        })
        .set('Authorization', 'Bearer mock-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });
  });
});