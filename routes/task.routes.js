// routes/task.routes.js - Task Routes
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateTask, validateQueryParams } = require('../middleware/validation.middleware');

router.use(authenticate);

router.post('/', validateTask, taskController.createTask);
router.get('/', validateQueryParams, taskController.getAllTasks);
router.get('/stats', authorize('admin'), taskController.getTaskStats);
router.get('/:id', taskController.getTaskById);
router.put('/:id', validateTask, taskController.updateTask);
router.patch('/:id', validateTask, taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;