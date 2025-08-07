import { Router } from 'express';
import { getDB } from '@/database/connection';
import { requireRole } from '@/middleware/auth';

const router = Router();

// Get security reports (customers see their own, technicians see all)
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { page = 1, limit = 10, type, severity, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT r.*, u.company
      FROM security_reports r
      LEFT JOIN users u ON r.customer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Filter by customer for non-technician users
    if (req.user?.role === 'customer') {
      query += ` AND r.customer_id = $${++paramCount}`;
      params.push(req.user.userId);
    }

    // Add filters
    if (type) {
      query += ` AND r.type = $${++paramCount}`;
      params.push(type);
    }
    if (severity) {
      query += ` AND r.severity = $${++paramCount}`;
      params.push(severity);
    }
    if (status) {
      query += ` AND r.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Count query
    let countQuery = `
      SELECT COUNT(*)
      FROM security_reports r
      WHERE 1=1
    `;
    const countParams: any[] = [];
    let countParamCount = 0;

    if (req.user?.role === 'customer') {
      countQuery += ` AND r.customer_id = $${++countParamCount}`;
      countParams.push(req.user.userId);
    }

    if (type) {
      countQuery += ` AND r.type = $${++countParamCount}`;
      countParams.push(type);
    }
    if (severity) {
      countQuery += ` AND r.severity = $${++countParamCount}`;
      countParams.push(severity);
    }
    if (status) {
      countQuery += ` AND r.status = $${++countParamCount}`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        reports: result.rows.map(report => ({
          id: report.id,
          customerId: report.customer_id,
          company: report.company,
          title: report.title,
          type: report.type,
          severity: report.severity,
          status: report.status,
          description: report.description,
          findings: report.findings,
          recommendations: report.recommendations,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get specific report
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    let query = `
      SELECT r.*, u.company, u.first_name, u.last_name
      FROM security_reports r
      LEFT JOIN users u ON r.customer_id = u.id
      WHERE r.id = $1
    `;
    const params = [id];

    // Restrict access for customers
    if (req.user?.role === 'customer') {
      query += ' AND r.customer_id = $2';
      params.push(req.user.userId);
    }

    const result = await db.query(query, params);
    const report = result.rows[0];

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    res.json({
      success: true,
      data: {
        id: report.id,
        customerId: report.customer_id,
        company: report.company,
        customerName: `${report.first_name} ${report.last_name}`,
        title: report.title,
        type: report.type,
        severity: report.severity,
        status: report.status,
        description: report.description,
        findings: report.findings,
        recommendations: report.recommendations,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;