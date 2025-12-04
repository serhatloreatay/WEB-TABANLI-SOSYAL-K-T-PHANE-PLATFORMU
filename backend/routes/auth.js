const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const pool = require('../config/database');

// Email transporter setup
const createTransporter = () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return null;
};

// Register
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Kullanıcı adı 3 ile 50 karakter arasında olmalıdır'),
  body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır'),
  body('passwordConfirm').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Şifreler eşleşmiyor');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      // Check which one is duplicate
      const [emailCheck] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: 'Bu e-posta zaten kullanımda' });
      }
      return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanımda' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    // Generate token
    const token = jwt.sign(
      { userId: result.insertId, email, username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      message: 'Kayıt başarıyla tamamlandı',
      token,
      user: {
        id: result.insertId,
        username,
        email,
        avatar_url: null,
        bio: null
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    // Development mode'da daha detaylı hata mesajı göster
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Server error during registration: ${error.message}`
      : 'Server error during registration';
    res.status(500).json({ 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
  body('password').notEmpty().withMessage('Şifre gereklidir')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash, avatar_url, bio FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Password Reset Request
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If email exists, password reset link has been sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign({ userId: users[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token
    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, resetTokenExpires, users[0].id]
    );

    // Send email with reset link
    const transporter = createTransporter();
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    let emailSent = false;
    
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Şifre Sıfırlama - Kütüphanem',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Şifre Sıfırlama</h2>
              <p>Merhaba,</p>
              <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
              <p style="margin: 20px 0;">
                <a href="${resetLink}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  Şifremi Sıfırla
                </a>
              </p>
              <p>Veya bu linki tarayıcınıza kopyalayın:</p>
              <p style="color: #666; word-break: break-all;">${resetLink}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Bu link 1 saat geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız, 
                bu e-postayı görmezden gelebilirsiniz.
              </p>
            </div>
          `
        });
        emailSent = true;
        console.log('Password reset email sent successfully to:', email);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        console.error('Error details:', {
          message: emailError.message,
          code: emailError.code,
          response: emailError.response,
          command: emailError.command
        });
        // Continue anyway - don't reveal email sending failure to user
      }
    } else {
      // Development mode - log the reset link
      console.log('========================================');
      console.log('E-POSTA YAPILANDIRMASI YOK - DEVELOPMENT MODU');
      console.log('Şifre sıfırlama linki (console):', resetLink);
      console.log('========================================');
    }

    // In development mode, return the link if email wasn't sent
    if (process.env.NODE_ENV === 'development' && !emailSent) {
      return res.json({ 
        message: 'E-posta yapılandırması yapılmamış. Development modunda link aşağıda:',
        resetLink: resetLink,
        note: 'Backend console\'da da link görüntülenmektedir.'
      });
    }

    res.json({ message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderildi.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Password Reset
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Sıfırlama token\'ı gereklidir'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş sıfırlama token\'ı' });
    }

    // Check if token exists and is not expired
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > NOW()',
      [decoded.userId, token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş sıfırlama token\'ı' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [passwordHash, decoded.userId]
    );

    res.json({ message: 'Şifre başarıyla sıfırlandı' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

