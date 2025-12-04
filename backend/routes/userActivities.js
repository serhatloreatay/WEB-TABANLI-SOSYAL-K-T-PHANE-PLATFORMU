const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get user activities (ratings and reviews)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const userIdInt = parseInt(userId);
    const limitInt = parseInt(limit);

    if (isNaN(userIdInt)) {
      return res.status(400).json({ message: 'Geçersiz kullanıcı ID' });
    }

    // Get ratings
    let ratings = [];
    try {
      // Use LIMIT directly in query (safe because limitInt is already parsed and validated)
      const limitValue = Math.max(1, Math.min(limitInt || 20, 100)); // Clamp between 1 and 100
      const [ratingsResult] = await pool.execute(
        `SELECT 
          r.id as activity_id,
          'rating' as activity_type,
          r.user_id,
          r.content_type,
          r.content_id,
          r.rating,
          r.created_at,
          u.username,
          u.avatar_url,
          CASE 
            WHEN r.content_type = 'movie' THEN m.title
            ELSE b.title
          END as content_title,
          CASE 
            WHEN r.content_type = 'movie' THEN m.poster_url
            ELSE b.cover_url
          END as content_poster,
          CASE 
            WHEN r.content_type = 'movie' THEN m.release_date
            ELSE b.published_date
          END as content_release_date,
          CASE 
            WHEN r.content_type = 'movie' THEN m.genres
            ELSE b.categories
          END as content_genres,
          CASE 
            WHEN r.content_type = 'movie' THEN m.directors
            ELSE b.authors
          END as content_creators,
          CASE 
            WHEN r.content_type = 'movie' THEN m.average_rating
            ELSE b.average_rating
          END as content_average_rating
         FROM ratings r
         JOIN users u ON r.user_id = u.id
         LEFT JOIN movies m ON r.content_type = 'movie' AND r.content_id = m.id
         LEFT JOIN books b ON r.content_type = 'book' AND r.content_id = b.id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC
         LIMIT ${limitValue}`,
        [userIdInt]
      );
      ratings = ratingsResult;
    } catch (ratingsError) {
      console.error('Error fetching ratings:', ratingsError);
      // Continue with empty array instead of failing
    }

    // Get reviews
    let reviews = [];
    try {
      // Use LIMIT directly in query (safe because limitInt is already parsed and validated)
      const limitValue = Math.max(1, Math.min(limitInt || 20, 100)); // Clamp between 1 and 100
      const [reviewsResult] = await pool.execute(
        `SELECT 
          r.id as activity_id,
          'review' as activity_type,
          r.user_id,
          r.content_type,
          r.content_id,
          LEFT(r.review_text, 150) as review_excerpt,
          r.review_text,
          r.created_at,
          u.username,
          u.avatar_url,
          CASE 
            WHEN r.content_type = 'movie' THEN m.title
            ELSE b.title
          END as content_title,
          CASE 
            WHEN r.content_type = 'movie' THEN m.poster_url
            ELSE b.cover_url
          END as content_poster,
          CASE 
            WHEN r.content_type = 'movie' THEN m.release_date
            ELSE b.published_date
          END as content_release_date,
          CASE 
            WHEN r.content_type = 'movie' THEN m.genres
            ELSE b.categories
          END as content_genres,
          CASE 
            WHEN r.content_type = 'movie' THEN m.directors
            ELSE b.authors
          END as content_creators,
          CASE 
            WHEN r.content_type = 'movie' THEN m.average_rating
            ELSE b.average_rating
          END as content_average_rating
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         LEFT JOIN movies m ON r.content_type = 'movie' AND r.content_id = m.id
         LEFT JOIN books b ON r.content_type = 'book' AND r.content_id = b.id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC
         LIMIT ${limitValue}`,
        [userIdInt]
      );
      reviews = reviewsResult;
    } catch (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      // Continue with empty array instead of failing
    }

    // Combine and sort
    const activities = [...ratings, ...reviews]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limitInt);

    res.json({ activities });
  } catch (error) {
    console.error('Get user activities error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ 
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
});

module.exports = router;

