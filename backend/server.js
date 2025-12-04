const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Library Platform API is running' });
});

// API Routes (will be added)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/books', require('./routes/books'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/lists', require('./routes/lists'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/search', require('./routes/search'));
app.use('/api/follows', require('./routes/follows'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/user-activities', require('./routes/userActivities'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

