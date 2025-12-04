import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import './ContentDetailPage.css'

const ContentDetailPage = () => {
  const { contentType, contentId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  // Safety check for auth context
  if (authLoading === undefined) {
    console.error('[ContentDetailPage] Auth context not available')
  }
  const queryClient = useQueryClient()

  // Show immediate feedback that component is rendering
  if (!contentType || !contentId) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <div className="container">
          <h1>Hata</h1>
          <p>Geçersiz URL parametreleri</p>
          <p>contentType: {contentType || 'yok'}, contentId: {contentId || 'yok'}</p>
        </div>
      </div>
    )
  }

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#f5f5f5', minHeight: '100vh', textAlign: 'center' }}>
        <div className="container">
          <p>Kimlik doğrulanıyor...</p>
        </div>
      </div>
    )
  }

  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [showCustomListMenu, setShowCustomListMenu] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [editingReviewText, setEditingReviewText] = useState('')
  const [userLists, setUserLists] = useState({
    watched: false,
    to_watch: false,
    read: false,
    to_read: false
  })

  const { data: content, isLoading, error, isError } = useQuery(
    ['content', contentType, contentId],
    async () => {
      try {
        const url = `/api/${contentType}s/${contentId}`
        const response = await axios.get(url)
        return response.data
      } catch (err) {
        console.error('[ContentDetailPage] Content fetch error:', err)
        throw err
      }
    },
    {
      retry: 1,
      retryDelay: 1000,
      enabled: !!contentType && !!contentId
    }
  )

  const { data: reviews } = useQuery(
    ['reviews', contentType, contentId],
    async () => {
      try {
        const response = await axios.get(`/api/reviews/${contentType}/${contentId}`)
        return response.data
      } catch (err) {
        console.error('Reviews fetch error:', err)
        // Don't throw - reviews are optional
        return { reviews: [], total: 0 }
      }
    },
    {
      enabled: !!contentType && !!contentId && !!content
    }
  )

  const { data: userCustomLists } = useQuery(
    ['customLists', user?.id],
    async () => {
      if (!user) return []
      const response = await axios.get(`/api/lists/custom/${user.id}`)
      return response.data
    },
    { enabled: !!user }
  )

  const { data: userRating } = useQuery(
    ['userRating', contentType, contentId],
    async () => {
      try {
        const response = await axios.get(`/api/ratings/user/${contentType}/${contentId}`)
        return response.data
      } catch (err) {
        // User might not have rated yet, return null
        return null
      }
    },
    { enabled: !!user && !!contentType && !!contentId }
  )

  // Get user's lists for this content
  const { data: userListsData } = useQuery(
    ['userLists', contentType, contentId],
    async () => {
      if (!user || !content) return null
      const listTypes = contentType === 'movie' 
        ? ['watched', 'to_watch'] 
        : ['read', 'to_read']
      
      const lists = {}
      for (const listType of listTypes) {
        try {
          const response = await axios.get(`/api/lists/user/${user.id}/${listType}`)
          const hasContent = response.data.some(
            item => item.content_type === contentType && item.content_id === content.id
          )
          lists[listType] = hasContent
        } catch (error) {
          lists[listType] = false
        }
      }
      return lists
    },
    { enabled: !!user && !!content }
  )

  useEffect(() => {
    if (userListsData) {
      setUserLists(userListsData)
    }
  }, [userListsData])

  useEffect(() => {
    if (userRating?.rating) {
      setRating(userRating.rating)
    }
  }, [userRating])

  const ratingMutation = useMutation(
    (newRating) => axios.post('/api/ratings', {
      content_type: contentType,
      content_id: content.id,
      rating: newRating
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['content', contentType, contentId])
        queryClient.invalidateQueries(['userRating', contentType, contentId])
      }
    }
  )

  const reviewMutation = useMutation(
    () => axios.post('/api/reviews', {
      content_type: contentType,
      content_id: content?.id,
      review_text: reviewText
    }),
    {
      onSuccess: () => {
        setReviewText('')
        queryClient.invalidateQueries(['reviews', contentType, contentId])
        queryClient.invalidateQueries(['content', contentType, contentId])
      }
    }
  )

  const updateReviewMutation = useMutation(
    ({ reviewId, review_text }) => axios.put(`/api/reviews/${reviewId}`, {
      review_text
    }),
    {
      onSuccess: () => {
        setEditingReviewId(null)
        setEditingReviewText('')
        queryClient.invalidateQueries(['reviews', contentType, contentId])
      }
    }
  )

  const deleteReviewMutation = useMutation(
    (reviewId) => axios.delete(`/api/reviews/${reviewId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reviews', contentType, contentId])
        queryClient.invalidateQueries(['content', contentType, contentId])
      }
    }
  )

  const addToListMutation = useMutation(
    ({ listType }) => {
      const isInList = userLists[listType]
      if (isInList) {
        // Remove from list
        return axios.delete('/api/lists/user-list', {
          data: {
            content_type: contentType,
            content_id: content?.id,
            list_type: listType
          }
        })
      } else {
        // Add to list
        return axios.post('/api/lists/user-list', {
          content_type: contentType,
          content_id: content?.id,
          list_type: listType
        })
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userLists', contentType, contentId])
        queryClient.invalidateQueries(['userLists', user?.id])
      }
    }
  )

  const addToCustomListMutation = useMutation(
    (listId) => axios.post(`/api/lists/custom/${listId}/add`, {
      content_type: contentType,
      content_id: content?.id
    }),
    {
      onSuccess: () => {
        setShowCustomListMenu(false)
        queryClient.invalidateQueries(['customLists', user?.id])
      }
    }
  )

  const handleRating = (value) => {
    setRating(value)
    ratingMutation.mutate(value)
  }

  const handleAddReview = () => {
    if (reviewText.trim()) {
      reviewMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <p>Yükleniyor...</p>
        <p style={{ color: 'gray', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          {contentType === 'movie' ? 'Film' : 'Kitap'} bilgileri getiriliyor...
        </p>
        <p style={{ color: 'gray', fontSize: '0.8rem', marginTop: '1rem' }}>
          ID: {contentId}, Tip: {contentType}
        </p>
      </div>
    )
  }
  
  if (error) {
    console.error('Content detail error:', error)
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      contentType,
      contentId
    })
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Hata</h1>
        <p style={{ color: 'red', marginTop: '1rem' }}>
          İçerik yüklenirken bir hata oluştu: {error.response?.data?.message || error.message}
        </p>
        <p style={{ color: 'gray', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Durum Kodu: {error.response?.status || 'Bilinmiyor'}
        </p>
        <p style={{ color: 'gray', fontSize: '0.9rem' }}>
          İçerik Tipi: {contentType}, ID: {contentId}
        </p>
        {error.response?.status === 404 && (
          <p style={{ color: 'orange', marginTop: '1rem' }}>
            Bu {contentType === 'movie' ? 'film' : 'kitap'} bulunamadı. Lütfen arama sayfasından tekrar deneyin.
          </p>
        )}
        <p style={{ color: 'gray', fontSize: '0.9rem', marginTop: '1rem' }}>
          Backend penceresindeki hata mesajlarını kontrol edin.
        </p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Sayfayı Yenile
          </button>
          <button 
            onClick={() => navigate('/search')} 
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Arama Sayfasına Dön
          </button>
        </div>
      </div>
    )
  }
  if (!content) {
    // If still loading, show loading state
    if (isLoading) {
      return (
        <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Yükleniyor...</p>
        </div>
      )
    }
    // If error occurred, error state is already handled above
    // If no error but no content, show not found
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>İçerik Bulunamadı</h1>
        <p style={{ color: 'gray' }}>
          {contentType === 'movie' ? 'Film' : 'Kitap'} (ID: {contentId}) bulunamadı.
        </p>
        <button onClick={() => navigate('/search')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Arama Sayfasına Dön
        </button>
      </div>
    )
  }

  const posterUrl = contentType === 'movie' ? content.poster_url : content.cover_url
  const title = content.title || 'Başlık Yok'
  const overview = contentType === 'movie' ? content.overview : content.description
  const releaseDate = contentType === 'movie' ? content.release_date : content.published_date

  // Safe JSON parse helper function - handles all cases
  const safeParseJSON = (value) => {
    // Handle null/undefined
    if (value === null || value === undefined) return []
    
    // If already an array, return it
    if (Array.isArray(value)) return value
    
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      // If empty string, return empty array
      if (value.trim() === '') return []
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(value)
        // If parsed result is an array, return it
        if (Array.isArray(parsed)) return parsed
        // If parsed result is a string (double-encoded), return as array
        if (typeof parsed === 'string') return [parsed]
        // Otherwise wrap in array
        return [parsed]
      } catch (e) {
        // If it's not valid JSON, treat it as a single string value
        console.warn('[ContentDetailPage] Failed to parse JSON, treating as string:', value.substring(0, 50), e.message)
        return [value]
      }
    }
    
    // For any other type, wrap in array
    return [value]
  }

  return (
    <div className="content-detail-page" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem 0' }}>
      <div className="container" style={{ padding: '0 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="content-header" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <img src={posterUrl || '/placeholder.png'} alt={title} className="content-poster-large" />
          <div className="content-info">
            <h1>{title}</h1>
            {releaseDate && (
              <p className="release-date">
                {contentType === 'movie' ? 'Yayın Tarihi' : 'Yayın Tarihi'}: {new Date(releaseDate).getFullYear()}
              </p>
            )}
            {content.average_rating > 0 && (
              <div className="platform-rating">
                <span className="rating-value">{content.average_rating}/10</span>
                <span className="rating-count">({content.total_ratings} oy)</span>
              </div>
            )}
            {overview && <p className="overview">{overview}</p>}
          </div>
        </div>

        {user && (
          <div className="user-actions">
            <div className="rating-section">
              <label>Puanınız:</label>
              <div className="rating-input">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <button
                    key={value}
                    className={`rating-btn ${rating >= value ? 'active' : ''}`}
                    onClick={() => handleRating(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="list-buttons">
              {contentType === 'movie' ? (
                <>
                  <button 
                    className={userLists.watched ? 'active' : ''}
                    onClick={() => addToListMutation.mutate({ listType: 'watched' })}
                  >
                    {userLists.watched ? '✓ İzledim' : 'İzledim'}
                  </button>
                  <button 
                    className={userLists.to_watch ? 'active' : ''}
                    onClick={() => addToListMutation.mutate({ listType: 'to_watch' })}
                  >
                    {userLists.to_watch ? '✓ İzlenecek' : 'İzlenecek'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className={userLists.read ? 'active' : ''}
                    onClick={() => addToListMutation.mutate({ listType: 'read' })}
                  >
                    {userLists.read ? '✓ Okudum' : 'Okudum'}
                  </button>
                  <button 
                    className={userLists.to_read ? 'active' : ''}
                    onClick={() => addToListMutation.mutate({ listType: 'to_read' })}
                  >
                    {userLists.to_read ? '✓ Okunacak' : 'Okunacak'}
                  </button>
                </>
              )}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowCustomListMenu(!showCustomListMenu)}>
                  Özel Listeye Ekle
                </button>
                {showCustomListMenu && (
                  <div className="custom-list-menu">
                    {userCustomLists?.length > 0 ? (
                      <>
                        {userCustomLists.map((list) => (
                          <button
                            key={list.id}
                            className="custom-list-item-btn"
                            onClick={() => addToCustomListMutation.mutate(list.id)}
                          >
                            {list.name}
                          </button>
                        ))}
                        <button
                          className="create-list-btn"
                          onClick={() => {
                            setShowCustomListMenu(false)
                            // Navigate to profile to create new list
                            navigate(`/profile/${user.id}`)
                          }}
                        >
                          + Yeni Liste Oluştur
                        </button>
                      </>
                    ) : (
                      <div className="no-lists-message">
                        <p>Henüz özel listeniz yok.</p>
                        <button
                          onClick={() => {
                            setShowCustomListMenu(false)
                            navigate(`/profile/${user.id}`)
                          }}
                        >
                          İlk Listeni Oluştur
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Genel Bakış
          </button>
          <button
            className={activeTab === 'reviews' ? 'active' : ''}
            onClick={() => setActiveTab('reviews')}
          >
            Yorumlar ({reviews?.total || 0})
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-details">
              {contentType === 'movie' && (
                <>
                  {content.runtime && <p><strong>Süre:</strong> {content.runtime} dakika</p>}
                  {content.directors && (
                    <p><strong>Yönetmen:</strong> {safeParseJSON(content.directors).join(', ')}</p>
                  )}
                  {content.genres && (
                    <p><strong>Türler:</strong> {safeParseJSON(content.genres).join(', ')}</p>
                  )}
                </>
              )}
              {contentType === 'book' && (
                <>
                  {content.authors && (
                    <p><strong>Yazar(lar):</strong> {safeParseJSON(content.authors).join(', ')}</p>
                  )}
                  {content.page_count && <p><strong>Sayfa Sayısı:</strong> {content.page_count}</p>}
                  {content.categories && (
                    <p><strong>Kategoriler:</strong> {safeParseJSON(content.categories).join(', ')}</p>
                  )}
                  {content.publisher && <p><strong>Yayınevi:</strong> {content.publisher}</p>}
                </>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-section">
              {user && (
                <div className="add-review">
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Yorumunuzu yazın..."
                    rows="4"
                  />
                  <button onClick={handleAddReview}>Gönder</button>
                </div>
              )}

              <div className="reviews-list">
                {reviews?.reviews?.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-header">
                      <span className="review-author">{review.username}</span>
                      <span className="review-date">
                        {new Date(review.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      {user && user.id === review.user_id && (
                        <div className="review-actions">
                          {editingReviewId === review.id ? (
                            <>
                              <button onClick={() => {
                                updateReviewMutation.mutate({
                                  reviewId: review.id,
                                  review_text: editingReviewText
                                })
                              }}>Kaydet</button>
                              <button onClick={() => {
                                setEditingReviewId(null)
                                setEditingReviewText('')
                              }}>İptal</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => {
                                setEditingReviewId(review.id)
                                setEditingReviewText(review.review_text)
                              }}>Düzenle</button>
                              <button onClick={() => {
                                if (window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
                                  deleteReviewMutation.mutate(review.id)
                                }
                              }}>Sil</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {editingReviewId === review.id ? (
                      <textarea
                        value={editingReviewText}
                        onChange={(e) => setEditingReviewText(e.target.value)}
                        rows="4"
                        className="edit-review-textarea"
                      />
                    ) : (
                      <p className="review-text">{review.review_text}</p>
                    )}
                  </div>
                ))}
                {(!reviews?.reviews || reviews.reviews.length === 0) && (
                  <p>Henüz yorum yok.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContentDetailPage

