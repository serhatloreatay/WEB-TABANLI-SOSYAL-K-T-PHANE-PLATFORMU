const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Add content to user list (watched, to_watch, read, to_read)
router.post('/user-list', authenticateToken, async (req, res) => {
  try {
    const { content_type, content_id, list_type } = req.body;
    const userId = req.user.userId;

    if (!content_type || !content_id || !list_type) {
      return res.status(400).json({ message: 'content_type, content_id, and list_type are required' });
    }

    const validListTypes = ['watched', 'to_watch', 'read', 'to_read'];
    if (!validListTypes.includes(list_type)) {
      return res.status(400).json({ message: 'Invalid list_type' });
    }

    // Check if already in list
    const [existing] = await pool.execute(
      'SELECT id FROM user_lists WHERE user_id = ? AND content_type = ? AND content_id = ? AND list_type = ?',
      [userId, content_type, content_id, list_type]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Content already in this list' });
    }

    await pool.execute(
      'INSERT INTO user_lists (user_id, content_type, content_id, list_type) VALUES (?, ?, ?, ?)',
      [userId, content_type, content_id, list_type]
    );

    res.json({ message: 'Content added to list successfully' });
  } catch (error) {
    console.error('Add to list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove content from user list
router.delete('/user-list', authenticateToken, async (req, res) => {
  try {
    const { content_type, content_id, list_type } = req.body;
    const userId = req.user.userId;

    await pool.execute(
      'DELETE FROM user_lists WHERE user_id = ? AND content_type = ? AND content_id = ? AND list_type = ?',
      [userId, content_type, content_id, list_type]
    );

    res.json({ message: 'Content removed from list successfully' });
  } catch (error) {
    console.error('Remove from list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's lists
router.get('/user/:userId/:listType', async (req, res) => {
  try {
    const { userId, listType } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    // Use LIMIT and OFFSET directly in query (safe because values are already parsed)
    const limitValue = parseInt(limitInt, 10);
    const offsetValue = parseInt(offset, 10);
    
    const query = `SELECT ul.*, 
       ${listType === 'watched' || listType === 'to_watch' 
         ? 'm.title, m.poster_url, m.release_date' 
         : 'b.title, b.cover_url as poster_url, b.published_date as release_date'}
       FROM user_lists ul
       ${listType === 'watched' || listType === 'to_watch' 
         ? 'LEFT JOIN movies m ON ul.content_id = m.id' 
         : 'LEFT JOIN books b ON ul.content_id = b.id'}
       WHERE ul.user_id = ? AND ul.list_type = ? AND ul.content_type = ?
       ORDER BY ul.created_at DESC
       LIMIT ${limitValue} OFFSET ${offsetValue}`;
    
    const [items] = await pool.execute(
      query,
      [
        parseInt(userId, 10),
        listType,
        listType === 'watched' || listType === 'to_watch' ? 'movie' : 'book'
      ]
    );

    res.json(items);
  } catch (error) {
    console.error('Get user list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create custom list
router.post('/custom', authenticateToken, async (req, res) => {
  try {
    const { name, description, is_public } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ message: 'List name is required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO custom_lists (user_id, name, description, is_public) VALUES (?, ?, ?, ?)',
      [userId, name, description || null, is_public !== undefined ? is_public : true]
    );

    res.status(201).json({ id: result.insertId, message: 'Custom list created successfully' });
  } catch (error) {
    console.error('Create custom list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's custom lists
router.get('/custom/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [lists] = await pool.execute(
      'SELECT * FROM custom_lists WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json(lists);
  } catch (error) {
    console.error('Get custom lists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get custom list by ID
router.get('/custom/:listId/info', async (req, res) => {
  try {
    const { listId } = req.params;

    const [lists] = await pool.execute(
      'SELECT * FROM custom_lists WHERE id = ?',
      [listId]
    );

    if (lists.length === 0) {
      return res.status(404).json({ message: 'List not found' });
    }

    res.json(lists[0]);
  } catch (error) {
    console.error('Get custom list info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add content to custom list
router.post('/custom/:listId/add', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;
    const { content_type, content_id } = req.body;
    const userId = req.user.userId;

    // Check if list belongs to user
    const [lists] = await pool.execute(
      'SELECT id FROM custom_lists WHERE id = ? AND user_id = ?',
      [listId, userId]
    );

    if (lists.length === 0) {
      return res.status(403).json({ message: 'You can only add to your own lists' });
    }

    await pool.execute(
      'INSERT INTO custom_list_items (custom_list_id, content_type, content_id) VALUES (?, ?, ?)',
      [listId, content_type, content_id]
    );

    res.json({ message: 'Content added to custom list successfully' });
  } catch (error) {
    console.error('Add to custom list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get custom list items
router.get('/custom/:listId/items', async (req, res) => {
  try {
    const { listId } = req.params;

    const [items] = await pool.execute(
      `SELECT cli.*, 
       CASE 
         WHEN cli.content_type = 'movie' THEN m.title
         ELSE b.title
       END as title,
       CASE 
         WHEN cli.content_type = 'movie' THEN m.poster_url
         ELSE b.cover_url
       END as poster_url
       FROM custom_list_items cli
       LEFT JOIN movies m ON cli.content_type = 'movie' AND cli.content_id = m.id
       LEFT JOIN books b ON cli.content_type = 'book' AND cli.content_id = b.id
       WHERE cli.custom_list_id = ?
       ORDER BY cli.added_at DESC`,
      [listId]
    );

    res.json(items);
  } catch (error) {
    console.error('Get custom list items error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

