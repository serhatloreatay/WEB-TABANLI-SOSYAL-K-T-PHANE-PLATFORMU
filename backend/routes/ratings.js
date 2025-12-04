const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Add or update rating
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content_type, content_id, rating } = req.body;
    const userId = req.user.userId;

    if (!content_type || !content_id || !rating) {
      return res.status(400).json({ message: 'content_type, content_id, and rating are required' });
    }

    if (rating < 1 || rating > 10) {
      return res.status(400).json({ message: 'Rating must be between 1 and 10' });
    }

    // Check if rating exists
    const [existingRatings] = await pool.execute(
      'SELECT id FROM ratings WHERE user_id = ? AND content_type = ? AND content_id = ?',
      [userId, content_type, content_id]
    );

    if (existingRatings.length > 0) {
      // Update existing rating
      await pool.execute(
        'UPDATE ratings SET rating = ? WHERE id = ?',
        [rating, existingRatings[0].id]
      );
    } else {
      // Insert new rating
      await pool.execute(
        'INSERT INTO ratings (user_id, content_type, content_id, rating) VALUES (?, ?, ?, ?)',
        [userId, content_type, content_id, rating]
      );
    }

    // Update average rating for content
    const [avgResult] = await pool.execute(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings 
       FROM ratings 
       WHERE content_type = ? AND content_id = ?`,
      [content_type, content_id]
    );

    const avgRating = parseFloat(avgResult[0].avg_rating).toFixed(1);
    const totalRatings = avgResult[0].total_ratings;

    // Update content table
    if (content_type === 'movie') {
      await pool.execute(
        'UPDATE movies SET average_rating = ?, total_ratings = ? WHERE id = ?',
        [avgRating, totalRatings, content_id]
      );
    } else if (content_type === 'book') {
      await pool.execute(
        'UPDATE books SET average_rating = ?, total_ratings = ? WHERE id = ?',
        [avgRating, totalRatings, content_id]
      );
    }

    res.json({ message: 'Rating saved successfully', average_rating: avgRating, total_ratings: totalRatings });
  } catch (error) {
    console.error('Rating error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's rating for a content
router.get('/user/:contentType/:contentId', authenticateToken, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const userId = req.user.userId;

    const [ratings] = await pool.execute(
      'SELECT * FROM ratings WHERE user_id = ? AND content_type = ? AND content_id = ?',
      [userId, contentType, contentId]
    );

    if (ratings.length === 0) {
      return res.json({ rating: null });
    }

    res.json(ratings[0]);
  } catch (error) {
    console.error('Get rating error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

