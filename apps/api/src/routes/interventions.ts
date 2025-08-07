import { Router } from 'express';
import { getDB } from '@/database/connection';
import { requireRole } from '@/middleware/auth';

const router = Router();

// Get interventions with enhanced filtering and SLA tracking
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const { 
      page = 1, 
      limit = 10, 
      status, 
      request_type, 
      priority,
      assigned_to,
      search,
      overdue_only,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT i.*, 
             o.name as customer_name,
             ur.first_name as requested_by_first_name,
             ur.last_name as requested_by_last_name,
             ur.email as requested_by_email,
             ua.first_name as assigned_to_first_name,
             ua.last_name as assigned_to_last_name,
             ua.email as assigned_to_email,
             ub.first_name as assigned_by_first_name,
             ub.last_name as assigned_by_last_name,
             -- Calculate SLA status
             CASE 
               WHEN i.status IN ('completed', 'cancelled') THEN 'met'
               WHEN i.estimated_completion < NOW() THEN 'overdue'
               WHEN i.estimated_completion < NOW() + INTERVAL '4 hours' THEN 'at_risk'
               ELSE 'on_track'
             END as sla_status
      FROM interventions i
      LEFT JOIN organizations o ON i.customer_org_id = o.id
      LEFT JOIN users ur ON i.requested_by = ur.id
      LEFT JOIN users ua ON i.assigned_to = ua.id
      LEFT JOIN users ub ON i.assigned_by = ub.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Multi-tenant filtering
    if (req.user?.orgType === 'customer') {
      query += ` AND i.customer_org_id = $${++paramCount}`;
      params.push(req.user.orgId);
    }

    // Enhanced filters
    if (status) {
      query += ` AND i.status = $${++paramCount}`;
      params.push(status);
    }
    if (request_type) {
      query += ` AND i.request_type = $${++paramCount}`;
      params.push(request_type);
    }
    if (priority) {
      query += ` AND i.priority = $${++paramCount}`;
      params.push(priority);
    }
    if (assigned_to) {
      query += ` AND i.assigned_to = $${++paramCount}`;
      params.push(assigned_to);
    }
    if (search) {
      query += ` AND (i.title ILIKE $${++paramCount} OR i.description ILIKE $${++paramCount})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount++;
    }
    if (overdue_only === 'true') {
      query += ` AND i.estimated_completion < NOW() AND i.status NOT IN ('completed', 'cancelled')`;
    }

    // Sorting
    const validSortColumns = ['created_at', 'priority', 'status', 'estimated_completion', 'assigned_at'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY i.${sortColumn} ${sortDirection} LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Count query
    let countQuery = `SELECT COUNT(*) FROM interventions i WHERE 1=1`;
    const countParams: any[] = [];
    let countParamCount = 0;

    if (req.user?.orgType === 'customer') {
      countQuery += ` AND i.customer_org_id = $${++countParamCount}`;
      countParams.push(req.user.orgId);
    }
    if (status) {
      countQuery += ` AND i.status = $${++countParamCount}`;
      countParams.push(status);
    }
    if (request_type) {
      countQuery += ` AND i.request_type = $${++countParamCount}`;
      countParams.push(request_type);
    }
    if (priority) {
      countQuery += ` AND i.priority = $${++countParamCount}`;
      countParams.push(priority);
    }
    if (assigned_to) {
      countQuery += ` AND i.assigned_to = $${++countParamCount}`;
      countParams.push(assigned_to);
    }
    if (search) {
      countQuery += ` AND (i.title ILIKE $${++countParamCount} OR i.description ILIKE $${++countParamCount})`;
      countParams.push(`%${search}%`, `%${search}%`);
      countParamCount++;
    }
    if (overdue_only === 'true') {
      countQuery += ` AND i.estimated_completion < NOW() AND i.status NOT IN ('completed', 'cancelled')`;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        interventions: result.rows.map(intervention => ({
          id: intervention.id,
          customerOrgId: intervention.customer_org_id,
          customerName: intervention.customer_name,
          requestedBy: {
            id: intervention.requested_by,
            name: `${intervention.requested_by_first_name} ${intervention.requested_by_last_name}`,
            email: intervention.requested_by_email
          },
          assignedTo: intervention.assigned_to ? {
            id: intervention.assigned_to,
            name: `${intervention.assigned_to_first_name} ${intervention.assigned_to_last_name}`,
            email: intervention.assigned_to_email
          } : null,
          assignedBy: intervention.assigned_by ? {
            name: `${intervention.assigned_by_first_name} ${intervention.assigned_by_last_name}`
          } : null,
          title: intervention.title,
          description: intervention.description,
          requestType: intervention.request_type,
          status: intervention.status,
          priority: intervention.priority,
          slaStatus: intervention.sla_status,
          estimatedCompletion: intervention.estimated_completion,
          completedAt: intervention.completed_at,
          requestData: intervention.request_data,
          attachments: intervention.attachments || [],
          internalNotes: intervention.internal_notes,
          customerNotes: intervention.customer_notes,
          createdAt: intervention.created_at,
          updatedAt: intervention.updated_at,
          assignedAt: intervention.assigned_at
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create intervention request with auto-SLA calculation
router.post('/', requireRole(['admin', 'request_user', 'basic_user']), async (req, res, next) => {
  try {
    const db = getDB();
    const { 
      title, 
      description, 
      request_type, 
      priority = 'medium',
      request_data = {},
      customer_notes
    } = req.body;

    // Validate required fields
    if (!title || !description || !request_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, request_type'
      });
    }

    // Calculate estimated completion based on priority and type
    const estimatedCompletion = calculateEstimatedCompletion(priority, request_type);

    const result = await db.query(`
      INSERT INTO interventions (
        customer_org_id, requested_by, title, description, request_type, 
        status, priority, estimated_completion, request_data, customer_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      req.user?.orgId,
      req.user?.userId, 
      title, 
      description, 
      request_type,
      'pending',
      priority, 
      estimatedCompletion,
      JSON.stringify(request_data),
      customer_notes
    ]);

    const intervention = result.rows[0];

    // TODO: Add real-time notification when socket.io is properly configured
    // io.emit('new-intervention', {
    //   id: intervention.id,
    //   title: intervention.title,
    //   priority: intervention.priority,
    //   customerOrgId: intervention.customer_org_id,
    //   createdAt: intervention.created_at
    // });

    res.status(201).json({
      success: true,
      data: {
        id: intervention.id,
        customerOrgId: intervention.customer_org_id,
        title: intervention.title,
        description: intervention.description,
        requestType: intervention.request_type,
        status: intervention.status,
        priority: intervention.priority,
        estimatedCompletion: intervention.estimated_completion,
        createdAt: intervention.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Assign intervention to technician
router.patch('/:id/assign', requireRole(['admin', 'technician']), async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { assigned_to, internal_notes } = req.body;

    // Verify the intervention exists
    const checkResult = await db.query('SELECT * FROM interventions WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    const result = await db.query(`
      UPDATE interventions 
      SET assigned_to = $1, assigned_by = $2, assigned_at = NOW(), 
          status = 'assigned', internal_notes = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [assigned_to, req.user?.userId, internal_notes, id]);

    // TODO: Add real-time notification when socket.io is properly configured
    // io.emit(`intervention-assigned-${id}`, {
    //   id: result.rows[0].id,
    //   status: result.rows[0].status,
    //   assignedTo: assigned_to,
    //   assignedAt: result.rows[0].assigned_at
    // });

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        assignedTo: result.rows[0].assigned_to,
        assignedAt: result.rows[0].assigned_at,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update intervention status with comprehensive tracking
router.patch('/:id/status', requireRole(['technician', 'admin']), async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { status, internal_notes, customer_notes } = req.body;

    // Get current intervention
    const currentResult = await db.query('SELECT * FROM interventions WHERE id = $1', [id]);
    const current = currentResult.rows[0];

    if (!current) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['assigned', 'cancelled'],
      'assigned': ['in_progress', 'on_hold', 'cancelled'],
      'in_progress': ['completed', 'on_hold', 'cancelled'],
      'on_hold': ['in_progress', 'cancelled'],
      'completed': [], // Final state
      'cancelled': [] // Final state
    };

    if (!validTransitions[current.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from ${current.status} to ${status}`
      });
    }

    let updateFields = 'status = $2, updated_at = NOW()';
    const params = [id, status];
    let paramCount = 2;

    // Update notes if provided
    if (internal_notes) {
      updateFields += `, internal_notes = $${++paramCount}`;
      params.push(internal_notes);
    }
    if (customer_notes) {
      updateFields += `, customer_notes = $${++paramCount}`;
      params.push(customer_notes);
    }

    // Set completion timestamp
    if (status === 'completed' && !current.completed_at) {
      updateFields += ', completed_at = NOW()';
    }

    const result = await db.query(
      `UPDATE interventions SET ${updateFields} WHERE id = $1 RETURNING *`,
      params
    );

    // TODO: Add real-time update when socket.io is properly configured
    // io.emit(`intervention-updated-${id}`, {
    //   id: result.rows[0].id,
    //   status: result.rows[0].status,
    //   completedAt: result.rows[0].completed_at,
    //   updatedAt: result.rows[0].updated_at
    // });

    // If completed, calculate SLA performance
    const intervention = result.rows[0];
    let slaPerformance = null;
    if (status === 'completed') {
      const completedAt = new Date(intervention.completed_at);
      const estimatedCompletion = new Date(intervention.estimated_completion);
      const timeDiffHours = (completedAt.getTime() - estimatedCompletion.getTime()) / (1000 * 60 * 60);
      
      slaPerformance = {
        onTime: timeDiffHours <= 0,
        hoursOverdue: Math.max(0, timeDiffHours),
        completedAt: completedAt,
        estimatedCompletion: estimatedCompletion
      };
    }

    res.json({
      success: true,
      data: {
        id: intervention.id,
        status: intervention.status,
        completedAt: intervention.completed_at,
        updatedAt: intervention.updated_at,
        slaPerformance
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get intervention details
router.get('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    const { id } = req.params;

    let query = `
      SELECT i.*, 
             o.name as customer_name,
             ur.first_name as requested_by_first_name,
             ur.last_name as requested_by_last_name,
             ur.email as requested_by_email,
             ua.first_name as assigned_to_first_name,
             ua.last_name as assigned_to_last_name,
             ua.email as assigned_to_email,
             ub.first_name as assigned_by_first_name,
             ub.last_name as assigned_by_last_name
      FROM interventions i
      LEFT JOIN organizations o ON i.customer_org_id = o.id
      LEFT JOIN users ur ON i.requested_by = ur.id
      LEFT JOIN users ua ON i.assigned_to = ua.id
      LEFT JOIN users ub ON i.assigned_by = ub.id
      WHERE i.id = $1
    `;
    const params = [id];

    // Multi-tenant access control
    if (req.user?.orgType === 'customer') {
      query += ' AND i.customer_org_id = $2';
      params.push(req.user.orgId);
    }

    const result = await db.query(query, params);
    const intervention = result.rows[0];

    if (!intervention) {
      return res.status(404).json({ success: false, error: 'Intervention not found' });
    }

    // Calculate SLA status
    let slaStatus = 'on_track';
    if (intervention.status === 'completed' || intervention.status === 'cancelled') {
      slaStatus = 'met';
    } else if (new Date() > new Date(intervention.estimated_completion)) {
      slaStatus = 'overdue';
    } else if (new Date() > new Date(new Date(intervention.estimated_completion).getTime() - 4 * 60 * 60 * 1000)) {
      slaStatus = 'at_risk';
    }

    res.json({
      success: true,
      data: {
        id: intervention.id,
        customerOrgId: intervention.customer_org_id,
        customerName: intervention.customer_name,
        requestedBy: {
          id: intervention.requested_by,
          name: `${intervention.requested_by_first_name} ${intervention.requested_by_last_name}`,
          email: intervention.requested_by_email
        },
        assignedTo: intervention.assigned_to ? {
          id: intervention.assigned_to,
          name: `${intervention.assigned_to_first_name} ${intervention.assigned_to_last_name}`,
          email: intervention.assigned_to_email
        } : null,
        assignedBy: intervention.assigned_by ? {
          name: `${intervention.assigned_by_first_name} ${intervention.assigned_by_last_name}`
        } : null,
        title: intervention.title,
        description: intervention.description,
        requestType: intervention.request_type,
        status: intervention.status,
        priority: intervention.priority,
        slaStatus,
        estimatedCompletion: intervention.estimated_completion,
        completedAt: intervention.completed_at,
        requestData: intervention.request_data,
        attachments: intervention.attachments || [],
        internalNotes: intervention.internal_notes,
        customerNotes: intervention.customer_notes,
        createdAt: intervention.created_at,
        updatedAt: intervention.updated_at,
        assignedAt: intervention.assigned_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get SLA analytics
router.get('/analytics/sla', requireRole(['admin', 'technician', 'account_manager']), async (req, res, next) => {
  try {
    const db = getDB();
    const { customer_org_id, period_days = 30 } = req.query;
    
    const periodStart = new Date(Date.now() - Number(period_days) * 24 * 60 * 60 * 1000);
    
    let query = `
      SELECT 
        COUNT(*) as total_interventions,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= estimated_completion) as on_time_completions,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > estimated_completion) as overdue_completions,
        COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled') AND estimated_completion < NOW()) as currently_overdue,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE status = 'completed') as avg_completion_hours,
        COUNT(*) FILTER (WHERE priority = 'emergency') as emergency_requests,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority_requests
      FROM interventions 
      WHERE created_at >= $1
    `;
    const params = [periodStart];
    
    if (customer_org_id) {
      query += ' AND customer_org_id = $2';
      params.push(customer_org_id);
    }
    
    const result = await db.query(query, params);
    const stats = result.rows[0];
    
    const totalCompleted = parseInt(stats.on_time_completions || '0') + parseInt(stats.overdue_completions || '0');
    const slaCompliance = totalCompleted > 0 ? 
      Math.round((parseInt(stats.on_time_completions || '0') / totalCompleted) * 100) : 100;
    
    res.json({
      success: true,
      data: {
        periodDays: Number(period_days),
        periodStart,
        totalInterventions: parseInt(stats.total_interventions || '0'),
        completedInterventions: totalCompleted,
        onTimeCompletions: parseInt(stats.on_time_completions || '0'),
        overdueCompletions: parseInt(stats.overdue_completions || '0'),
        currentlyOverdue: parseInt(stats.currently_overdue || '0'),
        slaCompliance: `${slaCompliance}%`,
        averageCompletionHours: parseFloat(stats.avg_completion_hours || '0').toFixed(2),
        emergencyRequests: parseInt(stats.emergency_requests || '0'),
        highPriorityRequests: parseInt(stats.high_priority_requests || '0')
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate estimated completion
function calculateEstimatedCompletion(priority: string, requestType: string): Date {
  const now = new Date();
  let hoursToAdd = 24; // Default 24 hours
  
  // Priority-based SLA
  switch (priority) {
    case 'emergency':
      hoursToAdd = 2;
      break;
    case 'high':
      hoursToAdd = 8;
      break;
    case 'medium':
      hoursToAdd = 24;
      break;
    case 'low':
      hoursToAdd = 72;
      break;
  }
  
  // Request type modifiers
  switch (requestType) {
    case 'incident_response':
      hoursToAdd = Math.min(hoursToAdd, 4); // Never more than 4 hours for incidents
      break;
    case 'vulnerability_remediation':
      hoursToAdd *= 1.5; // 50% longer for complex remediation
      break;
    case 'security_assessment':
      hoursToAdd *= 2; // Assessments take longer
      break;
  }
  
  return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
}

export default router;