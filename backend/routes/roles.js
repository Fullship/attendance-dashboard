const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const pool = require('../config/database');

const router = express.Router();

// Get all roles
router.get('/roles', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(u.id) as user_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.id, r.name, r.description, r.permissions, r.is_system_role, r.created_at, r.updated_at
      ORDER BY r.is_system_role DESC, r.created_at ASC
    `);

    const roles = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions || [],
      isSystemRole: row.is_system_role,
      userCount: parseInt(row.user_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single role
router.get('/roles/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT r.*, 
             COUNT(u.id) as user_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.description, r.permissions, r.is_system_role, r.created_at, r.updated_at
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const row = result.rows[0];
    const role = {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions || [],
      isSystemRole: row.is_system_role,
      userCount: parseInt(row.user_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ role });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new role
router.post('/roles', auth, adminAuth, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions must be an array' });
    }

    // Check if role name already exists
    const existingRole = await pool.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existingRole.rows.length > 0) {
      return res.status(400).json({ message: 'Role name already exists' });
    }

    const result = await pool.query(
      `
      INSERT INTO roles (name, description, permissions, is_system_role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [name.trim(), description || '', JSON.stringify(permissions), false]
    );

    const row = result.rows[0];
    const role = {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions || [],
      isSystemRole: row.is_system_role,
      userCount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.status(201).json({
      message: 'Role created successfully',
      role,
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update role
router.put('/roles/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions must be an array' });
    }

    // Check if role exists and is not a system role
    const roleCheck = await pool.query('SELECT is_system_role FROM roles WHERE id = $1', [id]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system_role) {
      return res.status(403).json({ message: 'Cannot modify system roles' });
    }

    // Check if new name conflicts with existing role (excluding current role)
    const nameCheck = await pool.query('SELECT id FROM roles WHERE name = $1 AND id != $2', [
      name,
      id,
    ]);
    if (nameCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Role name already exists' });
    }

    const result = await pool.query(
      `
      UPDATE roles 
      SET name = $1, description = $2, permissions = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `,
      [name.trim(), description || '', JSON.stringify(permissions), id]
    );

    const row = result.rows[0];
    const role = {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: row.permissions || [],
      isSystemRole: row.is_system_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({
      message: 'Role updated successfully',
      role,
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete role
router.delete('/roles/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists and is not a system role
    const roleCheck = await pool.query('SELECT is_system_role, name FROM roles WHERE id = $1', [
      id,
    ]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (roleCheck.rows[0].is_system_role) {
      return res.status(403).json({ message: 'Cannot delete system roles' });
    }

    // Check if any users are assigned this role
    const userCheck = await pool.query('SELECT COUNT(*) as count FROM users WHERE role_id = $1', [
      id,
    ]);
    const userCount = parseInt(userCheck.rows[0].count);

    if (userCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role. ${userCount} users are assigned to this role.`,
      });
    }

    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all permissions
router.get('/permissions', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, category
      FROM permissions
      ORDER BY category, name
    `);

    const permissions = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
    }));

    res.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all hierarchy levels
router.get('/hierarchy-levels', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, 
             COUNT(u.id) as user_count
      FROM hierarchy_levels h
      LEFT JOIN users u ON h.id = u.hierarchy_level_id
      GROUP BY h.id, h.name, h.level_number, h.description, h.permissions, h.can_manage, h.created_at, h.updated_at
      ORDER BY h.level_number ASC
    `);

    const hierarchyLevels = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      level: row.level_number,
      description: row.description,
      permissions: row.permissions || [],
      canManage: row.can_manage || [],
      userCount: parseInt(row.user_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ hierarchyLevels });
  } catch (error) {
    console.error('Error fetching hierarchy levels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create hierarchy level
router.post('/hierarchy-levels', auth, adminAuth, async (req, res) => {
  try {
    const { name, level, description, permissions, canManage } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Level name is required' });
    }

    if (!level || level < 1) {
      return res.status(400).json({ message: 'Valid level number is required' });
    }

    // Check if name or level already exists
    const existingCheck = await pool.query(
      'SELECT id FROM hierarchy_levels WHERE name = $1 OR level_number = $2',
      [name, level]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Level name or number already exists' });
    }

    const result = await pool.query(
      `
      INSERT INTO hierarchy_levels (name, level_number, description, permissions, can_manage)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [
        name.trim(),
        level,
        description || '',
        JSON.stringify(permissions || []),
        JSON.stringify(canManage || []),
      ]
    );

    const row = result.rows[0];
    const hierarchyLevel = {
      id: row.id,
      name: row.name,
      level: row.level_number,
      description: row.description,
      permissions: row.permissions || [],
      canManage: row.can_manage || [],
      userCount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.status(201).json({
      message: 'Hierarchy level created successfully',
      hierarchyLevel,
    });
  } catch (error) {
    console.error('Error creating hierarchy level:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all system settings
router.get('/system-settings', auth, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, value, description, category, data_type as type
      FROM system_settings
      ORDER BY category, key
    `);

    const settings = result.rows.map(row => ({
      key: row.key,
      value: row.value,
      description: row.description,
      category: row.category,
      type: row.type,
    }));

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update system setting
router.put('/system-settings/:key', auth, adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ message: 'Setting value is required' });
    }

    const result = await pool.query(
      `
      UPDATE system_settings 
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE key = $2
      RETURNING *
    `,
      [String(value), key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    const row = result.rows[0];
    const setting = {
      key: row.key,
      value: row.value,
      description: row.description,
      category: row.category,
      type: row.data_type,
    };

    res.json({
      message: 'Setting updated successfully',
      setting,
    });
  } catch (error) {
    console.error('Error updating system setting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign role to user
router.put('/users/:userId/role', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    // Verify user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify role exists (if provided)
    if (roleId) {
      const roleCheck = await pool.query('SELECT id FROM roles WHERE id = $1', [roleId]);
      if (roleCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Role not found' });
      }
    }

    await pool.query(
      'UPDATE users SET role_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [roleId || null, userId]
    );

    res.json({ message: 'User role assigned successfully' });
  } catch (error) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign hierarchy level to user
router.put('/users/:userId/hierarchy-level', auth, adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { hierarchyLevelId } = req.body;

    // Verify user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify hierarchy level exists (if provided)
    if (hierarchyLevelId) {
      const levelCheck = await pool.query('SELECT id FROM hierarchy_levels WHERE id = $1', [
        hierarchyLevelId,
      ]);
      if (levelCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Hierarchy level not found' });
      }
    }

    await pool.query(
      'UPDATE users SET hierarchy_level_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hierarchyLevelId || null, userId]
    );

    res.json({ message: 'User hierarchy level assigned successfully' });
  } catch (error) {
    console.error('Error assigning hierarchy level to user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
