const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Get comments for a review (MUST be before /:contentType/:contentId route)
router.get('/:reviewId/comments', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    const [comments] = await pool.execute(
      `SELECT c.*, u.username, u.avatar_url 
       FROM review_comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.review_id = ? 
       ORDER BY c.created_at ASC 
       LIMIT ${limitInt} OFFSET ${offset}`,
      [reviewId]
    );

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM review_comments WHERE review_id = ?',
      [reviewId]
    );

    res.json({
      comments,
      total: countResult[0].total,
      page: pageInt,
      limit: limitInt
    });
  } catch (error) {
    console.error('Get review comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment to a review (MUST be before /:contentType/:contentId route)
router.post('/:reviewId/comments', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { comment_text } = req.body;
    const userId = req.user.userId;

    if (!comment_text || comment_text.trim().length === 0) {
      return res.status(400).json({ message: 'Yorum metni gereklidir' });
    }

    // Check if review exists
    const [reviews] = await pool.execute(
      'SELECT id FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Yorum bulunamadı' });
    }

    const [result] = await pool.execute(
      'INSERT INTO review_comments (review_id, user_id, comment_text) VALUES (?, ?, ?)',
      [reviewId, userId, comment_text.trim()]
    );

    // Get created comment with user info
    const [comments] = await pool.execute(
      `SELECT c.*, u.username, u.avatar_url 
       FROM review_comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json(comments[0]);
  } catch (error) {
    console.error('Add review comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update comment (MUST be before /:contentType/:contentId route)
router.put('/:reviewId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { comment_text } = req.body;
    const userId = req.user.userId;

    if (!comment_text || comment_text.trim().length === 0) {
      return res.status(400).json({ message: 'Yorum metni gereklidir' });
    }

    // Check if comment belongs to user
    const [comments] = await pool.execute(
      'SELECT id FROM review_comments WHERE id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (comments.length === 0) {
      return res.status(403).json({ message: 'Sadece kendi yorumlarınızı düzenleyebilirsiniz' });
    }

    await pool.execute(
      'UPDATE review_comments SET comment_text = ? WHERE id = ?',
      [comment_text.trim(), commentId]
    );

    // Get updated comment with user info
    const [updatedComments] = await pool.execute(
      `SELECT c.*, u.username, u.avatar_url 
       FROM review_comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [commentId]
    );

    res.json(updatedComments[0]);
  } catch (error) {
    console.error('Update review comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete comment (MUST be before /:contentType/:contentId route)
router.delete('/:reviewId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    // Check if comment belongs to user
    const [comments] = await pool.execute(
      'SELECT id FROM review_comments WHERE id = ? AND user_id = ?',
      [commentId, userId]
    );

    if (comments.length === 0) {
      return res.status(403).json({ message: 'Sadece kendi yorumlarınızı silebilirsiniz' });
    }

    await pool.execute('DELETE FROM review_comments WHERE id = ?', [commentId]);

    res.json({ message: 'Yorum silindi' });
  } catch (error) {
    console.error('Delete review comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews for content
router.get('/:contentType/:contentId', async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;
    const contentIdInt = parseInt(contentId);

    // First, find the actual content ID (could be movies.id or movies.tmdb_id)
    let actualContentId = contentIdInt;
    
    if (contentType === 'movie') {
      const [movies] = await pool.execute(
        'SELECT id FROM movies WHERE id = ? OR tmdb_id = ?',
        [contentIdInt, contentIdInt]
      );
      if (movies.length > 0) {
        actualContentId = movies[0].id;
      } else {
        return res.json({ reviews: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
      }
    } else if (contentType === 'book') {
      const [books] = await pool.execute(
        'SELECT id FROM books WHERE id = ? OR google_books_id = ?',
        [contentIdInt, contentIdInt]
      );
      if (books.length > 0) {
        actualContentId = books[0].id;
      } else {
        return res.json({ reviews: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
      }
    }

    const [reviews] = await pool.execute(
      `SELECT r.*, u.username, u.avatar_url 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.content_type = ? AND r.content_id = ? 
       ORDER BY r.created_at DESC 
       LIMIT ${limitInt} OFFSET ${offset}`,
      [contentType, actualContentId]
    );

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM reviews WHERE content_type = ? AND content_id = ?',
      [contentType, actualContentId]
    );

    res.json({
      reviews,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content_type, content_id, review_text } = req.body;
    const userId = req.user.userId;

    if (!content_type || !content_id || !review_text) {
      return res.status(400).json({ message: 'content_type, content_id, and review_text are required' });
    }

    const [result] = await pool.execute(
      'INSERT INTO reviews (user_id, content_type, content_id, review_text) VALUES (?, ?, ?, ?)',
      [userId, content_type, content_id, review_text]
    );

    // Update total reviews count
    if (content_type === 'movie') {
      await pool.execute(
        'UPDATE movies SET total_reviews = total_reviews + 1 WHERE id = ?',
        [content_id]
      );
    } else if (content_type === 'book') {
      await pool.execute(
        'UPDATE books SET total_reviews = total_reviews + 1 WHERE id = ?',
        [content_id]
      );
    }

    // Get created review with user info
    const [reviews] = await pool.execute(
      `SELECT r.*, u.username, u.avatar_url 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json(reviews[0]);
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update review
router.put('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { review_text } = req.body;
    const userId = req.user.userId;

    // Check if review belongs to user
    const [reviews] = await pool.execute(
      'SELECT id FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (reviews.length === 0) {
      return res.status(403).json({ message: 'You can only edit your own reviews' });
    }

    await pool.execute(
      'UPDATE reviews SET review_text = ? WHERE id = ?',
      [review_text, reviewId]
    );

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete review
router.delete('/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    // Check if review belongs to user
    const [reviews] = await pool.execute(
      'SELECT content_type, content_id FROM reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (reviews.length === 0) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    const { content_type, content_id } = reviews[0];

    await pool.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);

    // Update total reviews count
    if (content_type === 'movie') {
      await pool.execute(
        'UPDATE movies SET total_reviews = GREATEST(total_reviews - 1, 0) WHERE id = ?',
        [content_id]
      );
    } else if (content_type === 'book') {
      await pool.execute(
        'UPDATE books SET total_reviews = GREATEST(total_reviews - 1, 0) WHERE id = ?',
        [content_id]
      );
    }

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

