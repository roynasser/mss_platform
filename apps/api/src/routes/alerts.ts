import { Router } from 'express';
import { getDB } from '@/database/connection';

const router = Router();

// Get alerts
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { page = 1, limit = 20, type, severity, unread } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT a.*, u.company
      FROM alerts a
      LEFT JOIN users u ON a.customer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Filter by customer for non-technician users
    if (req.user?.role === 'customer') {
      query += ` AND a.customer_id = $${++paramCount}`;
      params.push(req.user.userId);
    }

    // Add filters
    if (type) {
      query += ` AND a.type = $${++paramCount}`;
      params.push(type);
    }
    if (severity) {
      query += ` AND a.severity = $${++paramCount}`;
      params.push(severity);
    }
    if (unread === 'true') {
      query += ` AND a.is_read = false`;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(alert => ({
        id: alert.id,
        customerId: alert.customer_id,
        company: alert.company,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        source: alert.source,
        metadata: alert.metadata,
        isRead: alert.is_read,
        isResolved: alert.is_resolved,
        createdAt: alert.created_at,
        resolvedAt: alert.resolved_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Mark alert as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    let query = 'UPDATE alerts SET is_read = true WHERE id = $1';
    const params = [id];

    // Restrict access for customers
    if (req.user?.role === 'customer') {
      query += ' AND customer_id = $2';
      params.push(req.user.userId);
    }

    const result = await db.query(query + ' RETURNING *', params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, message: 'Alert marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;