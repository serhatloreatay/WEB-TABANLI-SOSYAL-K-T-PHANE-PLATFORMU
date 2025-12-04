const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Like/Unlike activity
router.post('/:targetType/:targetId', authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const userId = req.user.userId;

    // Check if already liked
    const [existing] = await pool.execute(
      'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    );

    if (existing.length > 0) {
      // Unlike
      await pool.execute(
        'DELETE FROM likes WHERE id = ?',
        [existing[0].id]
      );
      return res.json({ message: 'Unliked', liked: false });
    } else {
      // Like
      await pool.execute(
        'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)',
        [userId, targetType, targetId]
      );
      return res.json({ message: 'Liked', liked: true });
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get like status
router.get('/:targetType/:targetId/status', authenticateToken, async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const userId = req.user.userId;

    const [likes] = await pool.execute(
      'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    );

    res.json({ liked: likes.length > 0 });
  } catch (error) {
    console.error('Get like status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get like count
router.get('/:targetType/:targetId/count', async (req, res) => {
  try {
    const { targetType, targetId } = req.params;

    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM likes WHERE target_type = ? AND target_id = ?',
      [targetType, targetId]
    );

    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get like count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

