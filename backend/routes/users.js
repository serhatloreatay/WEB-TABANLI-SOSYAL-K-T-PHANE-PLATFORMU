const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Search users by username (must be before /:userId route)
router.get('/search', async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Arama sorgusu gereklidir' });
    }

    const searchQuery = `%${query.trim()}%`;
    const limitInt = parseInt(limit);

    const [users] = await pool.execute(
      `SELECT 
        id, 
        username, 
        avatar_url, 
        bio,
        (SELECT COUNT(*) FROM ratings WHERE user_id = u.id) as total_ratings,
        (SELECT COUNT(*) FROM reviews WHERE user_id = u.id) as total_reviews,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
      FROM users u
      WHERE username LIKE ?
      ORDER BY username ASC
      LIMIT ${limitInt}`,
      [searchQuery]
    );

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Kullanıcı arama hatası' });
  }
});

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await pool.execute(
      'SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Get user stats
    const [stats] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM ratings WHERE user_id = ?) as total_ratings,
        (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as total_reviews,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count`,
      [userId, userId, userId, userId]
    );

    res.json({
      ...user,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload avatar image
router.post('/:userId/avatar', authenticateToken, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ 
        message: err.message || 'File upload error',
        error: err.code 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('Avatar upload request:', {
      userId,
      authenticatedUserId: req.user?.userId,
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : null
    });

    // Check if user is updating their own profile
    if (parseInt(userId) !== req.user.userId) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please select an image file.' });
    }

    // Get old avatar URL to delete old file
    const [users] = await pool.execute(
      'SELECT avatar_url FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (users[0].avatar_url) {
      const oldAvatarPath = users[0].avatar_url;
      // If old avatar is a local file, delete it
      if (oldAvatarPath.startsWith('/uploads/')) {
        const oldFilePath = path.join(__dirname, '..', oldAvatarPath);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log('Old avatar deleted:', oldFilePath);
          } catch (deleteError) {
            console.warn('Could not delete old avatar:', deleteError);
          }
        }
      }
    }

    // Save new avatar URL
    const avatarUrl = `/uploads/${req.file.filename}`;
    await pool.execute(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, userId]
    );

    console.log('Avatar uploaded successfully:', avatarUrl);

    res.json({ avatar_url: avatarUrl, message: 'Avatar uploaded successfully' });
  } catch (error) {
    console.error('Upload avatar error:', error);
    console.error('Error stack:', error.stack);
    // Delete uploaded file if there was an error
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (deleteError) {
          console.error('Could not delete uploaded file:', deleteError);
        }
      }
    }
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update user profile
router.put('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { avatar_url, bio } = req.body;

    console.log('Update profile request:', {
      userId,
      authenticatedUserId: req.user?.userId,
      avatar_url,
      bio
    });

    // Check if user is updating their own profile
    if (parseInt(userId) !== req.user.userId) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    // Validate user exists
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile - allow null values
    await pool.execute(
      'UPDATE users SET avatar_url = ?, bio = ? WHERE id = ?',
      [avatar_url || null, bio || null, userId]
    );

    console.log('Profile updated successfully for user:', userId);

    // Get updated user data
    const [updatedUsers] = await pool.execute(
      'SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

