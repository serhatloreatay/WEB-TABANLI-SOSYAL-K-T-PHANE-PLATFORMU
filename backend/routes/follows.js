const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Follow user
router.post('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.userId;

    if (parseInt(userId) === followerId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Check if already following
    const [existing] = await pool.execute(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    await pool.execute(
      'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
      [followerId, userId]
    );

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow user
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.userId;

    await pool.execute(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, userId]
    );

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if following
router.get('/:userId/status', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.user.userId;

    const [follows] = await pool.execute(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, userId]
    );

    res.json({ isFollowing: follows.length > 0 });
  } catch (error) {
    console.error('Check follow status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get followers list
router.get('/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;

    const [followers] = await pool.execute(
      `SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.bio,
        f.created_at as followed_at,
        (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) as total_ratings,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as total_reviews,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get following list
router.get('/:userId/following', async (req, res) => {
  try {
    const { userId } = req.params;

    const [following] = await pool.execute(
      `SELECT 
        u.id,
        u.username,
        u.avatar_url,
        u.bio,
        f.created_at as followed_at,
        (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) as total_ratings,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as total_reviews,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({ following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

