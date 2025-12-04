const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// Universal search (movies and books)
router.get('/', async (req, res) => {
  try {
    const { query, type, genre, year, minRating, page = 1 } = req.query;

    // Eğer query yoksa ve filtreler de yoksa hata döndür
    const hasFilters = genre || year || minRating
    if (!query && !type && !hasFilters) {
      return res.status(400).json({ message: 'Search query, type, or filters are required' });
    }

    const results = {
      movies: [],
      books: []
    };

    // Search movies
    if (!type || type === 'movie' || type === 'all') {
      try {
        // Eğer query yoksa ama filtreler varsa (özellikle yıl), TMDB discover API kullan
        if (!query && (year || genre || minRating)) {
          // Eğer sadece yıl filtresi varsa, TMDB discover API'den o yıldaki tüm filmleri getir
          if (year && !genre && !minRating) {
            try {
              // TMDB discover API ile yıl filtresi
              const discoverResponse = await axios.get('https://api.themoviedb.org/3/discover/movie', {
                params: {
                  api_key: TMDB_API_KEY,
                  primary_release_year: parseInt(year),
                  sort_by: 'popularity.desc',
                  page: page || 1,
                  language: 'tr-TR'
                }
              });

              results.movies = discoverResponse.data.results.map(movie => ({
                id: movie.id,
                title: movie.title,
                release_date: movie.release_date,
                poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
                type: 'movie'
              }));
            } catch (discoverError) {
              console.error('TMDB discover error:', discoverError);
              // Fallback: database'den arama yap
              let sqlQuery = `SELECT id, tmdb_id, title, poster_url, release_date, average_rating, total_ratings 
                             FROM movies WHERE YEAR(release_date) = ? 
                             ORDER BY average_rating DESC, total_ratings DESC LIMIT 50`;
              const [dbMovies] = await pool.execute(sqlQuery, [parseInt(year)]);
              
              results.movies = dbMovies.map(movie => ({
                id: movie.tmdb_id || movie.id,
                title: movie.title,
                release_date: movie.release_date,
                poster_url: movie.poster_url,
                type: 'movie',
                average_rating: movie.average_rating,
                total_ratings: movie.total_ratings
              }));
            }
          } else {
            // Diğer filtrelerle database'den arama yap
            let sqlQuery = `SELECT id, tmdb_id, title, poster_url, release_date, average_rating, total_ratings 
                           FROM movies WHERE 1=1`;
            const params = [];
            
            if (year) {
              sqlQuery += ` AND YEAR(release_date) = ?`;
              params.push(parseInt(year));
            }
            
            if (minRating) {
              const minRatingFloat = parseFloat(minRating);
              if (!isNaN(minRatingFloat)) {
                sqlQuery += ` AND average_rating >= ?`;
                params.push(minRatingFloat);
              }
            }
            
            // Genre için basit bir LIKE araması (genres JSON field'ında)
            if (genre) {
              sqlQuery += ` AND (genres LIKE ? OR genres LIKE ?)`;
              const genreLower = genre.toLowerCase();
              params.push(`%"${genreLower}"%`);
              params.push(`%${genreLower}%`);
            }
            
            sqlQuery += ` ORDER BY average_rating DESC, total_ratings DESC LIMIT 50`;
            
            const [dbMovies] = await pool.execute(sqlQuery, params);
            
            results.movies = dbMovies.map(movie => ({
              id: movie.tmdb_id || movie.id,
              title: movie.title,
              release_date: movie.release_date,
              poster_url: movie.poster_url,
              type: 'movie',
              average_rating: movie.average_rating,
              total_ratings: movie.total_ratings
            }));
          }
        } else {
          // Normal TMDB API araması (query varsa)
          const movieResponse = await axios.get('https://api.themoviedb.org/3/search/movie', {
            params: {
              api_key: TMDB_API_KEY,
              query: query || '',
              page,
              ...(year && { year }),
              ...(genre && { with_genres: genre })
            }
          });

          results.movies = movieResponse.data.results.map(movie => ({
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            type: 'movie'
          }));
        }
      } catch (error) {
        console.error('Movie search error:', error);
      }
    }

    // Search books
    if (!type || type === 'book' || type === 'all') {
      try {
        // Eğer query yoksa ama filtreler varsa, database'den arama yap
        if (!query && (year || genre || minRating)) {
          // Eğer sadece yıl filtresi varsa, Google Books API'den o yıldaki kitapları getir
          if (year && !genre && !minRating) {
            try {
              // Google Books API ile yıl filtresi
              const bookParams = {
                q: `publishedDate:${year}`,
                startIndex: (page - 1) * 20,
                maxResults: 40,
                orderBy: 'relevance'
              };
              
              if (GOOGLE_BOOKS_API_KEY) {
                bookParams.key = GOOGLE_BOOKS_API_KEY;
              }

              const bookResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
                params: bookParams,
                headers: {
                  'Referer': process.env.FRONTEND_URL || 'http://localhost:3000'
                }
              });

              results.books = bookResponse.data.items?.map(item => ({
                id: item.id,
                title: item.volumeInfo.title,
                published_date: item.volumeInfo.publishedDate,
                poster_url: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail,
                type: 'book'
              })) || [];
            } catch (booksApiError) {
              console.error('Google Books API error:', booksApiError);
              // Fallback: database'den arama yap
              let sqlQuery = `SELECT id, google_books_id, title, cover_url, published_date, average_rating, total_ratings 
                             FROM books WHERE (YEAR(published_date) = ? OR published_date LIKE ?) 
                             ORDER BY average_rating DESC, total_ratings DESC LIMIT 50`;
              const [dbBooks] = await pool.execute(sqlQuery, [parseInt(year), `${year}%`]);
              
              results.books = dbBooks.map(book => ({
                id: book.google_books_id || book.id,
                title: book.title,
                published_date: book.published_date,
                poster_url: book.cover_url,
                type: 'book',
                average_rating: book.average_rating,
                total_ratings: book.total_ratings
              }));
            }
          } else {
            // Diğer filtrelerle database'den arama yap
            let sqlQuery = `SELECT id, google_books_id, title, cover_url, published_date, average_rating, total_ratings 
                           FROM books WHERE 1=1`;
            const params = [];
            
            if (year) {
              sqlQuery += ` AND (YEAR(published_date) = ? OR published_date LIKE ?)`;
              params.push(parseInt(year));
              params.push(`${year}%`);
            }
            
            if (minRating) {
              const minRatingFloat = parseFloat(minRating);
              if (!isNaN(minRatingFloat)) {
                sqlQuery += ` AND average_rating >= ?`;
                params.push(minRatingFloat);
              }
            }
            
            // Genre için basit bir LIKE araması (categories JSON field'ında)
            if (genre) {
              sqlQuery += ` AND (categories LIKE ? OR categories LIKE ?)`;
              const genreLower = genre.toLowerCase();
              params.push(`%"${genreLower}"%`);
              params.push(`%${genreLower}%`);
            }
            
            sqlQuery += ` ORDER BY average_rating DESC, total_ratings DESC LIMIT 50`;
            
            const [dbBooks] = await pool.execute(sqlQuery, params);
            
            results.books = dbBooks.map(book => ({
              id: book.google_books_id || book.id,
              title: book.title,
              published_date: book.published_date,
              poster_url: book.cover_url,
              type: 'book',
              average_rating: book.average_rating,
              total_ratings: book.total_ratings
            }));
          }
        } else {
          // Normal Google Books API araması (query varsa)
          const bookParams = {
            q: query || '',
            startIndex: (page - 1) * 20,
            maxResults: 20
          };
          
          // Add API key only if configured and not restricted
          if (GOOGLE_BOOKS_API_KEY) {
            bookParams.key = GOOGLE_BOOKS_API_KEY;
          }

          const bookResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
            params: bookParams,
            headers: {
              'Referer': process.env.FRONTEND_URL || 'http://localhost:3000'
            }
          });

          results.books = bookResponse.data.items?.map(item => ({
            id: item.id,
            title: item.volumeInfo.title,
            published_date: item.volumeInfo.publishedDate,
            poster_url: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail,
            type: 'book'
          })) || [];
        }
      } catch (error) {
        console.error('Book search error:', error);
        console.error('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        
        // If API key fails with 403, try without API key
        if (error.response?.status === 403 && GOOGLE_BOOKS_API_KEY) {
          try {
            console.log('Retrying book search without API key...');
            const bookResponse = await axios.get('https://www.googleapis.com/books/v1/volumes', {
              params: {
                q: query || '',
                startIndex: (page - 1) * 20,
                maxResults: 20
              }
            });

            results.books = bookResponse.data.items?.map(item => ({
              id: item.id,
              title: item.volumeInfo.title,
              published_date: item.volumeInfo.publishedDate,
              poster_url: item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail,
              type: 'book'
            })) || [];
          } catch (retryError) {
            console.error('Book search retry error:', retryError);
            results.books = [];
          }
        } else {
          // Don't fail the entire search if books fail, just return empty array
          results.books = [];
        }
      }
    }

    // Filter by rating if specified - check database ratings
    if (minRating) {
      const minRatingFloat = parseFloat(minRating);
      if (!isNaN(minRatingFloat)) {
        // Filter movies by rating from database
        if (results.movies.length > 0) {
          const movieIds = results.movies.map(m => m.id);
          if (movieIds.length > 0) {
            const placeholders = movieIds.map(() => '?').join(',');
            const [ratedMovies] = await pool.execute(
              `SELECT DISTINCT m.id, m.tmdb_id, m.title, m.poster_url, m.release_date, m.average_rating
               FROM movies m
               WHERE m.tmdb_id IN (${placeholders}) AND m.average_rating >= ?`,
              [...movieIds, minRatingFloat]
            );
            
            // Keep only movies that meet rating criteria
            const ratedMovieIds = new Set(ratedMovies.map(m => m.tmdb_id || m.id));
            results.movies = results.movies.filter(m => ratedMovieIds.has(m.id));
          }
        }

        // Filter books by rating from database
        if (results.books.length > 0) {
          const bookIds = results.books.map(b => b.id);
          if (bookIds.length > 0) {
            const placeholders = bookIds.map(() => '?').join(',');
            const [ratedBooks] = await pool.execute(
              `SELECT DISTINCT b.id, b.google_books_id, b.title, b.cover_url, b.published_date, b.average_rating
               FROM books b
               WHERE b.google_books_id IN (${placeholders}) AND b.average_rating >= ?`,
              [...bookIds, minRatingFloat]
            );
            
            // Keep only books that meet rating criteria
            const ratedBookIds = new Set(ratedBooks.map(b => b.google_books_id || b.id));
            results.books = results.books.filter(b => ratedBookIds.has(b.id));
          }
        }
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search error' });
  }
});

// Get popular/top rated content
router.get('/popular', async (req, res) => {
  try {
    const { type } = req.query;

    const results = {};

    if (!type || type === 'movie' || type === 'all') {
      // Get popular movies from database
      // Popularity = total_ratings + total_reviews + total list additions
      const [popularMovies] = await pool.execute(
        `SELECT 
          m.id, 
          m.tmdb_id, 
          m.title, 
          m.poster_url, 
          m.release_date, 
          m.average_rating, 
          m.total_ratings,
          m.total_reviews,
          (SELECT COUNT(*) FROM user_lists WHERE content_type = 'movie' AND content_id = m.id) as total_list_additions,
          (m.total_ratings + m.total_reviews + (SELECT COUNT(*) FROM user_lists WHERE content_type = 'movie' AND content_id = m.id)) as popularity_score
         FROM movies m
         WHERE m.total_ratings > 0 OR m.total_reviews > 0
         ORDER BY popularity_score DESC, m.average_rating DESC 
         LIMIT 20`
      );

      results.movies = popularMovies;
    }

    if (!type || type === 'book' || type === 'all') {
      // Get popular books from database
      const [popularBooks] = await pool.execute(
        `SELECT 
          b.id, 
          b.google_books_id, 
          b.title, 
          b.cover_url, 
          b.published_date, 
          b.average_rating, 
          b.total_ratings,
          b.total_reviews,
          (SELECT COUNT(*) FROM user_lists WHERE content_type = 'book' AND content_id = b.id) as total_list_additions,
          (b.total_ratings + b.total_reviews + (SELECT COUNT(*) FROM user_lists WHERE content_type = 'book' AND content_id = b.id)) as popularity_score
         FROM books b
         WHERE b.total_ratings > 0 OR b.total_reviews > 0
         ORDER BY popularity_score DESC, b.average_rating DESC 
         LIMIT 20`
      );

      results.books = popularBooks;
    }

    res.json(results);
  } catch (error) {
    console.error('Get popular error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/top-rated', async (req, res) => {
  try {
    const { type } = req.query;

    const results = {};

    if (!type || type === 'movie' || type === 'all') {
      const [topMovies] = await pool.execute(
        `SELECT id, tmdb_id, title, poster_url, release_date, average_rating, total_ratings 
         FROM movies 
         WHERE total_ratings >= 1 AND average_rating > 0
         ORDER BY average_rating DESC, total_ratings DESC 
         LIMIT 20`
      );

      results.movies = topMovies;
    }

    if (!type || type === 'book' || type === 'all') {
      const [topBooks] = await pool.execute(
        `SELECT id, google_books_id, title, cover_url, published_date, average_rating, total_ratings 
         FROM books 
         WHERE total_ratings >= 1 AND average_rating > 0
         ORDER BY average_rating DESC, total_ratings DESC 
         LIMIT 20`
      );

      results.books = topBooks;
    }

    res.json(results);
  } catch (error) {
    console.error('Get top rated error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

