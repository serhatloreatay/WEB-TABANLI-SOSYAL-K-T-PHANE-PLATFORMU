const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');

const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1';

// Search books
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1, maxResults = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const startIndex = (page - 1) * maxResults;

    const response = await axios.get(`${GOOGLE_BOOKS_BASE_URL}/volumes`, {
      params: {
        q: query,
        startIndex,
        maxResults,
        key: GOOGLE_BOOKS_API_KEY
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Book search error:', error);
    res.status(500).json({ message: 'Error searching books' });
  }
});

// Get book details
router.get('/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Check if book exists in database (by google_books_id)
    const [books] = await pool.execute(
      'SELECT * FROM books WHERE google_books_id = ?',
      [bookId]
    );

    if (books.length > 0) {
      return res.json(books[0]);
    }

    // Fetch from Google Books if not in database
    const response = await axios.get(`${GOOGLE_BOOKS_BASE_URL}/volumes/${bookId}`, {
      params: {
        key: GOOGLE_BOOKS_API_KEY
      }
    });

    const volume = response.data;
    const bookInfo = volume.volumeInfo;

    // Save to database
    const [result] = await pool.execute(
      `INSERT INTO books (google_books_id, isbn, title, description, published_date, page_count, cover_url, authors, categories, publisher)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookId,
        bookInfo.industryIdentifiers?.[0]?.identifier || null,
        bookInfo.title,
        bookInfo.description,
        bookInfo.publishedDate ? bookInfo.publishedDate.split('-')[0] : null,
        bookInfo.pageCount || null,
        bookInfo.imageLinks?.thumbnail || bookInfo.imageLinks?.smallThumbnail || null,
        JSON.stringify(bookInfo.authors || []),
        JSON.stringify(bookInfo.categories || []),
        bookInfo.publisher || null
      ]
    );

    // Get saved book
    const [savedBooks] = await pool.execute('SELECT * FROM books WHERE id = ?', [result.insertId]);

    res.json(savedBooks[0]);
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ message: 'Error fetching book' });
  }
});

module.exports = router;

