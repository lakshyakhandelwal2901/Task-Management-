// controllers/task.controller.js - Task CRUD Operations
const { pool } = require('../config/db');
const { AppError } = require('../utils/error');
const { logger } = require('../utils/logger');

exports.createTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { title, description, priority = 'medium' } = req.body;
    const userId = req.user.id;

    if (!title) {
      throw new AppError('Task title is required', 400);
    }

    const result = await client.query(
      `INSERT INTO tasks (title, description, priority, user_id, status) 
       VALUES ($1, $2, $3, $4, 'pending') 
       RETURNING *`,
      [title, description, priority, userId]
    );

    const task = result.rows[0];
    logger.info(`Task created: ${task.id} by user ${userId}`);

    res.status(201).json({
      status: 'success',
      message: 'Task created successfully',
      data: { task }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

exports.getAllTasks = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM tasks';
    let countQuery = 'SELECT COUNT(*) FROM tasks';
    const params = [];
    const conditions = [];

    if (!isAdmin) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(userId);
    }

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (priority) {
      conditions.push(`priority = $${params.length + 1}`);
      params.push(priority);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [tasksResult, countResult] = await Promise.all([
      client.query(query, params),
      client.query(countQuery, params.slice(0, -2))
    ]);

    const tasks = tasksResult.rows;
    const totalTasks = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalTasks / limit);

    res.status(200).json({
      status: 'success',
      data: {
        tasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalTasks,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

exports.getTaskById = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const result = await client.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    const task = result.rows[0];

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    if (!isAdmin && task.user_id !== userId) {
      throw new AppError('You are not authorized to access this task', 403);
    }

    res.status(200).json({
      status: 'success',
      data: { task }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

exports.updateTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    const task = taskResult.rows[0];

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    if (!isAdmin && task.user_id !== userId) {
      throw new AppError('You are not authorized to update this task', 403);
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const updateQuery = `
      UPDATE tasks 
      SET ${updates.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);
    const updatedTask = result.rows[0];

    logger.info(`Task updated: ${id} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: { task: updatedTask }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

exports.deleteTask = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    const task = taskResult.rows[0];

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    if (!isAdmin && task.user_id !== userId) {
      throw new AppError('You are not authorized to delete this task', 403);
    }

    await client.query('DELETE FROM tasks WHERE id = $1', [id]);

    logger.info(`Task deleted: ${id} by user ${userId}`);

    res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};

exports.getTaskStats = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(DISTINCT user_id) as total_users
      FROM tasks
    `);

    const stats = result.rows[0];

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
};