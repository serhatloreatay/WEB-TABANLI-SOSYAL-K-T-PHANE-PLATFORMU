const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Get user feed (activities from followed users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 15 } = req.query;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const offset = (pageInt - 1) * limitInt;

    // Get followed user IDs
    const [follows] = await pool.execute(
      'SELECT following_id FROM follows WHERE follower_id = ?',
      [userId]
    );

    const followedUserIds = follows
      .map(f => parseInt(f.following_id))
      .filter(id => !isNaN(id));
    
    // Include own activities (avoid duplicates)
    const userIdInt = parseInt(userId);
    if (!isNaN(userIdInt) && !followedUserIds.includes(userIdInt)) {
      followedUserIds.push(userIdInt);
    }

    // Get all activities (ratings and reviews) combined and sorted
    // We need to get more than limit to account for combining, then sort and slice
    const fetchLimit = parseInt(limit) * 2; // Fetch more to account for combining
    
    // Initialize empty arrays
    let ratings = [];
    let reviews = [];
    
    // Get ratings activities (only if we have user IDs)
    if (followedUserIds.length > 0) {
      // Ensure all IDs are valid integers
      const validUserIds = followedUserIds
        .map(id => {
          const parsed = parseInt(id);
          return isNaN(parsed) ? null : parsed;
        })
        .filter(id => id !== null);
      
      if (validUserIds.length === 0) {
        // No valid user IDs, return empty results
        ratings = [];
        reviews = [];
      } else {
        // For single user ID, use = instead of IN
        // For multiple user IDs, use IN (?, ?, ...)
        const userIdCondition = validUserIds.length === 1 
          ? 'r.user_id = ?'
          : 'r.user_id IN (' + validUserIds.map(() => '?').join(',') + ')';
        
        // Build the SQL query with proper placeholders
        // Use LIMIT directly (safe because fetchLimit is already sanitized)
        const limitValue = parseInt(fetchLimit, 10);
        const baseQuery = `SELECT 
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
           WHERE ${userIdCondition}
           ORDER BY r.created_at DESC
           LIMIT ${limitValue}`;
        
        // Execute with only user IDs (LIMIT is in the query string)
        const ratingsParams = validUserIds.map(id => parseInt(id, 10));
        
        [ratings] = await pool.execute(baseQuery, ratingsParams);

        // Get reviews activities
        const reviewsBaseQuery = `SELECT 
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
           WHERE ${userIdCondition}
           ORDER BY r.created_at DESC
           LIMIT ${limitValue}`;
        
        const reviewsParams = validUserIds.map(id => parseInt(id, 10));
        
        [reviews] = await pool.execute(reviewsBaseQuery, reviewsParams);
      }
    }

    // Combine and sort by date (newest first)
    const allActivities = [...ratings, ...reviews]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Apply pagination after sorting
    const activities = allActivities.slice(offset, offset + limitInt);
    
    // Check if there are more activities
    const hasMore = allActivities.length > offset + limitInt;

    res.json({
      activities,
      page: pageInt,
      limit: limitInt,
      hasMore: hasMore
    });
  } catch (error) {
    console.error('Get feed error:', error);
    // Development mode'da daha detaylı hata mesajı göster
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Server error: ${error.message}`
      : 'Server error';
    res.status(500).json({ 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

module.exports = router;

