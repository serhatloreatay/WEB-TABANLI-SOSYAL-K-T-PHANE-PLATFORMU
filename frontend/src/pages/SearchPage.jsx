import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './SearchPage.css'

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [activeTab, setActiveTab] = useState('search')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    genre: '',
    year: '',
    minRating: ''
  })

  const { data: searchResults, isLoading: searchLoading, refetch: searchRefetch } = useQuery(
    ['search', searchQuery, searchType, filters],
    async () => {
      // Eğer arama sorgusu yoksa ve filtreler de yoksa arama yapma
      const hasFilters = filters.genre.trim() || filters.year.trim() || filters.minRating.trim()
      if (!searchQuery.trim() && !hasFilters) return null
      
      const response = await axios.get('/api/search', {
        params: { 
          query: searchQuery || '', 
          type: searchType,
          genre: filters.genre || undefined,
          year: filters.year || undefined,
          minRating: filters.minRating || undefined
        }
      })
      return response.data
    },
    { enabled: false }
  )

  const { data: popularData, isLoading: popularLoading } = useQuery('popular', async () => {
    const response = await axios.get('/api/search/popular')
    return response.data
  })

  const { data: topRatedData, isLoading: topRatedLoading } = useQuery('top-rated', async () => {
    const response = await axios.get('/api/search/top-rated')
    return response.data
  })

  const handleSearch = (e) => {
    e.preventDefault()
    // Eğer arama sorgusu varsa veya herhangi bir filtre varsa arama yap
    const hasFilters = filters.genre.trim() || filters.year.trim() || filters.minRating.trim()
    if (searchQuery.trim() || hasFilters) {
      searchRefetch()
      setActiveTab('search')
    }
  }

  return (
    <div className="search-page">
      <div className="container">
        <h1>Ara & Keşfet</h1>

        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Kitap veya film ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="search-type-select"
          >
            <option value="all">Tümü</option>
            <option value="movie">Filmler</option>
            <option value="book">Kitaplar</option>
          </select>
          <button type="submit" className="search-button">Ara</button>
          <button 
            type="button" 
            className="filter-button"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Filtreleri Gizle' : 'Filtreler'}
          </button>
        </form>

        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>Tür:</label>
              <input
                type="text"
                placeholder="Örn: Action, Drama"
                value={filters.genre}
                onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label>Yıl:</label>
              <input
                type="number"
                placeholder="Örn: 2020"
                value={filters.year}
                onChange={(e) => {
                  setFilters({ ...filters, year: e.target.value })
                  // Yıl girildiğinde otomatik arama yap (eğer yıl geçerliyse)
                  if (e.target.value.trim() && e.target.value.length === 4) {
                    setTimeout(() => {
                      const hasFilters = e.target.value.trim() || filters.genre.trim() || filters.minRating.trim()
                      if (hasFilters || searchQuery.trim()) {
                        searchRefetch()
                        setActiveTab('search')
                      }
                    }, 500) // 500ms debounce
                  }
                }}
                onKeyPress={(e) => {
                  // Enter tuşuna basıldığında arama yap
                  if (e.key === 'Enter') {
                    handleSearch(e)
                  }
                }}
              />
            </div>
            <div className="filter-group">
              <label>Min. Puan:</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="Örn: 7.5"
                value={filters.minRating}
                onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
              />
            </div>
            <button 
              type="button"
              className="clear-filters-button"
              onClick={() => setFilters({ genre: '', year: '', minRating: '' })}
            >
              Filtreleri Temizle
            </button>
          </div>
        )}

        <div className="tabs">
          <button
            className={activeTab === 'search' ? 'active' : ''}
            onClick={() => setActiveTab('search')}
          >
            Arama Sonuçları
          </button>
          <button
            className={activeTab === 'popular' ? 'active' : ''}
            onClick={() => setActiveTab('popular')}
          >
            En Popülerler
          </button>
          <button
            className={activeTab === 'top-rated' ? 'active' : ''}
            onClick={() => setActiveTab('top-rated')}
          >
            En Yüksek Puanlılar
          </button>
        </div>

        <div className="results-section">
          {activeTab === 'search' && (
            <div>
              {searchLoading ? (
                <p>Aranıyor...</p>
              ) : searchResults ? (
                <div>
                  {searchResults.movies?.length > 0 && (
                    <div className="results-group">
                      <h2>Filmler</h2>
                      <div className="results-grid">
                        {searchResults.movies.map((movie) => (
                          <Link
                            key={movie.id}
                            to={`/movie/${movie.id}`}
                            className="result-card"
                          >
                            <img src={movie.poster_url || '/placeholder.png'} alt={movie.title} />
                            <h3>{movie.title}</h3>
                            {movie.release_date && (
                              <p className="result-year">{new Date(movie.release_date).getFullYear()}</p>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {searchResults.books?.length > 0 && (
                    <div className="results-group">
                      <h2>Kitaplar</h2>
                      <div className="results-grid">
                        {searchResults.books.map((book) => (
                          <Link
                            key={book.id}
                            to={`/book/${book.id}`}
                            className="result-card"
                          >
                            <img src={book.cover_url || book.poster_url || '/placeholder.png'} alt={book.title} />
                            <h3>{book.title}</h3>
                            {book.published_date && (
                              <p>{typeof book.published_date === 'string' && book.published_date.includes('-') 
                                ? new Date(book.published_date).getFullYear() 
                                : book.published_date.split('-')[0] || book.published_date}</p>
                              )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!searchResults.movies?.length && !searchResults.books?.length) && (
                    <p>Sonuç bulunamadı.</p>
                  )}
                </div>
              ) : (
                <p>Arama yapmak için yukarıdaki formu kullanın.</p>
              )}
            </div>
          )}

          {activeTab === 'popular' && (
            <div>
              {popularLoading ? (
                <p>Yükleniyor...</p>
              ) : (
                <>
                  {popularData?.movies?.length > 0 && (
                    <div className="results-group">
                      <h2>Popüler Filmler</h2>
                      <div className="results-grid">
                        {popularData.movies.map((movie) => (
                          <Link
                            key={movie.id}
                            to={`/movie/${movie.tmdb_id || movie.id}`}
                            className="result-card"
                          >
                            <img src={movie.poster_url || '/placeholder.png'} alt={movie.title} />
                            <h3>{movie.title}</h3>
                            {movie.release_date && (
                              <p className="result-year">{new Date(movie.release_date).getFullYear()}</p>
                            )}
                            {(() => {
                              const rating = parseFloat(movie.average_rating)
                              return !isNaN(rating) && rating > 0 ? (
                                <p className="result-rating">⭐ {rating.toFixed(1)}/10 ({movie.total_ratings || 0} oy)</p>
                              ) : null
                            })()}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {popularData?.books?.length > 0 && (
                    <div className="results-group">
                      <h2>Popüler Kitaplar</h2>
                      <div className="results-grid">
                        {popularData.books.map((book) => (
                          <Link
                            key={book.id}
                            to={`/book/${book.google_books_id || book.id}`}
                            className="result-card"
                          >
                            <img src={book.cover_url || '/placeholder.png'} alt={book.title} />
                            <h3>{book.title}</h3>
                            {book.published_date && (
                              <p className="result-year">
                                {typeof book.published_date === 'string' && book.published_date.includes('-') 
                                  ? new Date(book.published_date).getFullYear() 
                                  : book.published_date.split('-')[0] || book.published_date}
                              </p>
                            )}
                            {(() => {
                              const rating = parseFloat(book.average_rating)
                              return !isNaN(rating) && rating > 0 ? (
                                <p className="result-rating">⭐ {rating.toFixed(1)}/10 ({book.total_ratings || 0} oy)</p>
                              ) : null
                            })()}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!popularData?.movies?.length && !popularData?.books?.length && !popularLoading) && (
                    <p>Henüz popüler içerik bulunmuyor.</p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'top-rated' && (
            <div>
              {topRatedLoading ? (
                <p>Yükleniyor...</p>
              ) : (
                <>
                  {topRatedData?.movies?.length > 0 && (
                    <div className="results-group">
                      <h2>En Yüksek Puanlı Filmler</h2>
                      <div className="results-grid">
                        {topRatedData.movies.map((movie) => (
                          <Link
                            key={movie.id}
                            to={`/movie/${movie.tmdb_id || movie.id}`}
                            className="result-card"
                          >
                            <img src={movie.poster_url || '/placeholder.png'} alt={movie.title} />
                            <h3>{movie.title}</h3>
                            {movie.release_date && (
                              <p className="result-year">{new Date(movie.release_date).getFullYear()}</p>
                            )}
                            {(() => {
                              const rating = parseFloat(movie.average_rating)
                              return !isNaN(rating) && rating > 0 ? (
                                <p className="result-rating">⭐ {rating.toFixed(1)}/10 ({movie.total_ratings || 0} oy)</p>
                              ) : null
                            })()}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {topRatedData?.books?.length > 0 && (
                    <div className="results-group">
                      <h2>En Yüksek Puanlı Kitaplar</h2>
                      <div className="results-grid">
                        {topRatedData.books.map((book) => (
                          <Link
                            key={book.id}
                            to={`/book/${book.google_books_id || book.id}`}
                            className="result-card"
                          >
                            <img src={book.cover_url || '/placeholder.png'} alt={book.title} />
                            <h3>{book.title}</h3>
                            {book.published_date && (
                              <p className="result-year">
                                {typeof book.published_date === 'string' && book.published_date.includes('-') 
                                  ? new Date(book.published_date).getFullYear() 
                                  : book.published_date.split('-')[0] || book.published_date}
                              </p>
                            )}
                            {(() => {
                              const rating = parseFloat(book.average_rating)
                              return !isNaN(rating) && rating > 0 ? (
                                <p className="result-rating">⭐ {rating.toFixed(1)}/10 ({book.total_ratings || 0} oy)</p>
                              ) : null
                            })()}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!topRatedData?.movies?.length && !topRatedData?.books?.length && !topRatedLoading) && (
                    <p>Henüz puanlanmış içerik bulunmuyor.</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchPage

