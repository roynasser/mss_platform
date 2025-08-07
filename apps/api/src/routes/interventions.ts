import { Router } from 'express';
import { getDB } from '@/database/connection';
import { requireRole } from '@/middleware/auth';

const router = Router();

// Get interventions
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { page = 1, limit = 10, status, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT i.*, 
             c.company as customer_company,
             c.first_name as customer_first_name,
             c.last_name as customer_last_name,
             t.first_name as technician_first_name,
             t.last_name as technician_last_name
      FROM interventions i
      LEFT JOIN users c ON i.customer_id = c.id
      LEFT JOIN users t ON i.technician_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Filter by customer for non-technician users
    if (req.user?.role === 'customer') {
      query += ` AND i.customer_id = $${++paramCount}`;
      params.push(req.user.userId);
    }

    // Add filters
    if (status) {
      query += ` AND i.status = $${++paramCount}`;
      params.push(status);
    }
    if (type) {
      query += ` AND i.type = $${++paramCount}`;
      params.push(type);
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(intervention => ({
        id: intervention.id,
        customerId: intervention.customer_id,
        technicianId: intervention.technician_id,
        customerCompany: intervention.customer_company,
        customerName: `${intervention.customer_first_name} ${intervention.customer_last_name}`,
        technicianName: intervention.technician_first_name ? 
          `${intervention.technician_first_name} ${intervention.technician_last_name}` : null,
        title: intervention.title,
        description: intervention.description,
        type: intervention.type,
        status: intervention.status,
        priority: intervention.priority,
        scheduledAt: intervention.scheduled_at,
        startedAt: intervention.started_at,
        completedAt: intervention.completed_at,
        notes: intervention.notes,
        createdAt: intervention.created_at,
        updatedAt: intervention.updated_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// Create intervention request
router.post('/', requireRole(['customer']), async (req, res, next) => {
  try {
    const db = getDB();
    const { title, description, type, priority, scheduledAt } = req.body;

    const result = await db.query(
      `INSERT INTO interventions (customer_id, title, description, type, status, priority, scheduled_at, notes)
       VALUES ($1, $2, $3, $4, 'requested', $5, $6, $7)
       RETURNING *`,
      [req.user?.userId, title, description, type, priority, scheduledAt, '[]']
    );

    const intervention = result.rows[0];

    res.status(201).json({
      success: true,
      data: {
        id: intervention.id,
        customerId: intervention.customer_id,
        title: intervention.title,
        description: intervention.description,
        type: intervention.type,
        status: intervention.status,
        priority: intervention.priority,
        scheduledAt: intervention.scheduled_at,
        createdAt: intervention.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update intervention status (technician only)
router.patch('/:id/status', requireRole(['technician', 'admin']), async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status, note } = req.body;

    // Get current intervention
    const currentResult = await db.query('SELECT * FROM interventions WHERE id = $1', [id]);
    const current = currentResult.rows[0];

    if (!current) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Update status and add note
    const notes = current.notes || [];
    if (note) {
      notes.push({
        timestamp: new Date().toISOString(),
        author: req.user?.email,
        content: note,
      });
    }

    let updateFields = 'status = $2, notes = $3, updated_at = NOW()';
    const params = [id, status, JSON.stringify(notes)];
    let paramCount = 3;

    // Set timestamps based on status
    if (status === 'in_progress' && !current.started_at) {
      updateFields += `, started_at = NOW(), technician_id = $${++paramCount}`;
      params.push(req.user?.userId);
    } else if (status === 'completed' && !current.completed_at) {
      updateFields += ', completed_at = NOW()';
    }

    const result = await db.query(
      `UPDATE interventions SET ${updateFields} WHERE id = $1 RETURNING *`,
      params
    );

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        startedAt: result.rows[0].started_at,
        completedAt: result.rows[0].completed_at,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;