const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/database');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Search movies
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    if (!TMDB_API_KEY) {
      return res.status(500).json({ message: 'TMDB API key is not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
      params: {
        api_key: TMDB_API_KEY,
        query,
        page
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Movie search error:', error);
    res.status(500).json({ message: 'Error searching movies' });
  }
});

// Get popular movies (must be before /:movieId)
router.get('/popular/list', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(500).json({ message: 'TMDB API key is not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      params: {
        api_key: TMDB_API_KEY,
        page: 1
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Get popular movies error:', error);
    res.status(500).json({ message: 'Error fetching popular movies' });
  }
});

// Get top rated movies (must be before /:movieId)
router.get('/top-rated/list', async (req, res) => {
  try {
    if (!TMDB_API_KEY) {
      return res.status(500).json({ message: 'TMDB API key is not configured' });
    }

    const response = await axios.get(`${TMDB_BASE_URL}/movie/top_rated`, {
      params: {
        api_key: TMDB_API_KEY,
        page: 1
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Get top rated movies error:', error);
    res.status(500).json({ message: 'Error fetching top rated movies' });
  }
});

// Get movie details (must be last to avoid route conflicts)
router.get('/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const movieIdInt = parseInt(movieId);

    if (isNaN(movieIdInt)) {
      return res.status(400).json({ message: 'Invalid movie ID' });
    }

    if (!TMDB_API_KEY) {
      return res.status(500).json({ message: 'TMDB API key is not configured' });
    }

    console.log(`Fetching movie with ID: ${movieIdInt}`);

    // Check if movie exists in database (by id or tmdb_id)
    const [movies] = await pool.execute(
      'SELECT * FROM movies WHERE id = ? OR tmdb_id = ?',
      [movieIdInt, movieIdInt]
    );

    if (movies.length > 0) {
      console.log(`Movie found in database: ${movies[0].title}`);
      return res.json(movies[0]);
    }

    console.log(`Movie not found in database, fetching from TMDb with ID: ${movieIdInt}`);

    // If movieId is a number, try to fetch from TMDb using it as tmdb_id
    let tmdbId = movieIdInt;
    
    // If not found by id, check if it's a tmdb_id by querying TMDb directly
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    const movie = response.data;

    // Get directors and cast
    const creditsResponse = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}/credits`, {
      params: {
        api_key: TMDB_API_KEY
      }
    });

    const directors = creditsResponse.data.crew
      .filter(person => person.job === 'Director')
      .map(person => person.name);

    const cast = creditsResponse.data.cast
      .slice(0, 10)
      .map(actor => ({
        name: actor.name,
        character: actor.character
      }));

    // Save to database
    const [result] = await pool.execute(
      `INSERT INTO movies (tmdb_id, title, overview, release_date, poster_url, backdrop_url, runtime, genres, directors, cast)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movie.id,
        movie.title,
        movie.overview,
        movie.release_date,
        movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
        movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
        movie.runtime,
        JSON.stringify(movie.genres.map(g => g.name)),
        JSON.stringify(directors),
        JSON.stringify(cast)
      ]
    );

    // Get saved movie
    const [savedMovies] = await pool.execute('SELECT * FROM movies WHERE id = ?', [result.insertId]);

    res.json(savedMovies[0]);
  } catch (error) {
    console.error('Get movie error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      movieId: req.params.movieId
    });
    
    // Handle specific error cases
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        message: `Movie with ID ${req.params.movieId} not found in TMDb` 
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({ 
        message: 'Unable to connect to TMDb API. Please check your internet connection.' 
      });
    }
    
    // Development mode'da daha detaylı hata mesajı göster
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Error fetching movie: ${error.message}${error.response?.data ? ` - ${JSON.stringify(error.response.data)}` : ''}`
      : 'Error fetching movie';
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({ 
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        originalError: error.message,
        tmdbError: error.response?.data
      })
    });
  }
});

module.exports = router;

