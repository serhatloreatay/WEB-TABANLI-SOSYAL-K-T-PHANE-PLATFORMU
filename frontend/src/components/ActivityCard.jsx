import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import './ActivityCard.css'

const ActivityCard = ({ activity }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  const { data: likeStatus } = useQuery(
    ['likeStatus', activity.activity_type, activity.activity_id],
    async () => {
      if (!user) return { liked: false }
      const response = await axios.get(`/api/likes/${activity.activity_type}/${activity.activity_id}/status`)
      return response.data
    },
    { enabled: !!user }
  )

  const { data: likeCount } = useQuery(
    ['likeCount', activity.activity_type, activity.activity_id],
    async () => {
      const response = await axios.get(`/api/likes/${activity.activity_type}/${activity.activity_id}/count`)
      return response.data
    }
  )

  const likeMutation = useMutation(
    () => axios.post(`/api/likes/${activity.activity_type}/${activity.activity_id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['likeStatus', activity.activity_type, activity.activity_id])
        queryClient.invalidateQueries(['likeCount', activity.activity_type, activity.activity_id])
      }
    }
  )

  const handleLike = () => {
    if (user) {
      likeMutation.mutate()
    }
  }

  const handleCommentClick = () => {
    if (user && activity.activity_type === 'review') {
      setShowCommentInput(!showCommentInput)
      // Yorum yap butonuna tıklanınca yorumları da göster
      if (!showComments) {
        setShowComments(true)
      }
    }
  }

  // Fetch comments for review activities
  // Query'yi her zaman enabled yapıyoruz ama sadece showComments true olduğunda render ediyoruz
  // Bu şekilde yorum eklendikten sonra invalidate edildiğinde otomatik refetch olur
  const { data: commentsData, refetch: refetchComments } = useQuery(
    ['reviewComments', activity.activity_id],
    async () => {
      if (activity.activity_type !== 'review') return { comments: [], total: 0 }
      const response = await axios.get(`/api/reviews/${activity.activity_id}/comments`)
      return response.data
    },
    { 
      enabled: activity.activity_type === 'review',
      refetchOnWindowFocus: false
    }
  )

  const commentMutation = useMutation(
    (commentText) => axios.post(`/api/reviews/${activity.activity_id}/comments`, {
      comment_text: commentText
    }),
    {
      onSuccess: async (response) => {
        console.log('Comment added successfully:', response.data)
        
        // Yorumları göster
        setShowComments(true)
        setShowCommentInput(false)
        setCommentText('')
        
        // Query'yi invalidate et ve refetch yap
        await queryClient.invalidateQueries(['reviewComments', activity.activity_id])
        
        // Refetch yap ve cache'i güncelle
        try {
          console.log('Refetching comments...')
          const result = await refetchComments()
          console.log('Refetch result:', result)
          
          // Refetch sonrası cache'i kontrol et ve güncelle
          if (result?.data) {
            console.log('Refetch data:', result.data)
            queryClient.setQueryData(['reviewComments', activity.activity_id], result.data)
          }
        } catch (error) {
          console.error('Error refetching comments:', error)
        }
      },
      onError: (error) => {
        console.error('Comment error:', error)
        console.error('Error response:', error.response)
        alert(error.response?.data?.message || 'Yorum gönderilirken bir hata oluştu')
        // Hata durumunda cache'i temizle ve refetch yap
        queryClient.invalidateQueries(['reviewComments', activity.activity_id])
        refetchComments().catch(err => console.error('Error refetching after error:', err))
      }
    }
  )

  const handleCommentSubmit = () => {
    if (commentText.trim().length > 0) {
      commentMutation.mutate(commentText.trim())
    }
  }

  const updateCommentMutation = useMutation(
    ({ commentId, comment_text }) => axios.put(`/api/reviews/${activity.activity_id}/comments/${commentId}`, {
      comment_text
    }),
    {
      onSuccess: async () => {
        setEditingCommentId(null)
        setEditingCommentText('')
        // Query'yi invalidate et ve refetch yap
        await queryClient.invalidateQueries(['reviewComments', activity.activity_id])
        try {
          await refetchComments()
        } catch (error) {
          console.error('Error refetching comments after update:', error)
        }
      },
      onError: (error) => {
        console.error('Update comment error:', error)
        alert(error.response?.data?.message || 'Yorum güncellenirken bir hata oluştu')
      }
    }
  )

  const deleteCommentMutation = useMutation(
    (commentId) => axios.delete(`/api/reviews/${activity.activity_id}/comments/${commentId}`),
    {
      onSuccess: async () => {
        // Query'yi invalidate et ve refetch yap
        await queryClient.invalidateQueries(['reviewComments', activity.activity_id])
        try {
          await refetchComments()
        } catch (error) {
          console.error('Error refetching comments after delete:', error)
        }
      },
      onError: (error) => {
        console.error('Delete comment error:', error)
        alert(error.response?.data?.message || 'Yorum silinirken bir hata oluştu')
      }
    }
  )

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.comment_text)
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const handleSaveEdit = () => {
    if (editingCommentText.trim().length > 0) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        comment_text: editingCommentText.trim()
      })
    }
  }

  const handleDeleteComment = (commentId) => {
    if (window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      deleteCommentMutation.mutate(commentId)
    }
  }
  const getTimeAgo = (date) => {
    const now = new Date()
    const activityDate = new Date(date)
    const diffInSeconds = Math.floor((now - activityDate) / 1000)

    if (diffInSeconds < 60) return 'Az önce'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün önce`
    return `${Math.floor(diffInSeconds / 2592000)} ay önce`
  }

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2)
    const hasHalfStar = (rating % 2) >= 1
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div className="rating-display-container">
        <div className="rating-stars">
          <span className="stars-filled">{'★'.repeat(fullStars)}</span>
          {hasHalfStar && <span className="star-half">☆</span>}
          <span className="stars-empty">{'☆'.repeat(emptyStars)}</span>
        </div>
        <span className="rating-number">{rating}/10</span>
      </div>
    )
  }

  // Helper function to truncate review text to 150-200 characters
  const getReviewExcerpt = (reviewText) => {
    if (!reviewText) return ''
    const maxLength = 180 // Ortalama 150-200 arası
    if (reviewText.length <= maxLength) return reviewText
    // Kelime bölünmesini önlemek için son boşluğu bul
    const truncated = reviewText.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    return lastSpace > 150 ? truncated.substring(0, lastSpace) : truncated
  }

  // Helper function to parse JSON fields (genres, directors, authors, categories)
  const parseJSONField = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [value]
      }
    }
    return []
  }

  // Get content metadata
  const getContentYear = () => {
    if (!activity.content_release_date) return null
    const date = new Date(activity.content_release_date)
    return isNaN(date.getTime()) ? null : date.getFullYear()
  }

  const getContentGenres = () => {
    const genres = parseJSONField(activity.content_genres)
    return genres.slice(0, 3).join(', ') // İlk 3 türü göster
  }

  const getContentCreators = () => {
    const creators = parseJSONField(activity.content_creators)
    if (activity.content_type === 'movie') {
      return creators.slice(0, 2).join(', ') // İlk 2 yönetmeni göster
    } else {
      return creators.slice(0, 2).join(', ') // İlk 2 yazarı göster
    }
  }

  return (
    <div className="activity-card">
      <div className="activity-header">
        <Link to={`/profile/${activity.user_id}`} className="user-avatar">
          <img src={activity.avatar_url || '/default-avatar.png'} alt={activity.username} />
        </Link>
        <div className="activity-info">
          <Link to={`/profile/${activity.user_id}`} className="username">
            {activity.username}
          </Link>
          <span className="action-text">
            {activity.activity_type === 'rating' 
              ? `bir ${activity.content_type === 'movie' ? 'filmi' : 'kitabı'} oyladı`
              : `bir ${activity.content_type === 'movie' ? 'film' : 'kitap'} hakkında yorum yaptı`}
          </span>
          <span className="activity-date">{getTimeAgo(activity.created_at)}</span>
        </div>
      </div>
      <div className="activity-body">
        <div className="content-poster-wrapper">
          <Link to={`/${activity.content_type}/${activity.content_id}`} className="content-poster">
            <img src={activity.content_poster || '/placeholder.png'} alt={activity.content_title} />
          </Link>
          {activity.activity_type === 'rating' && (
            <div className="rating-display-below-poster">
              {renderStars(activity.rating)}
            </div>
          )}
        </div>
        <div className="content-info">
          <Link to={`/${activity.content_type}/${activity.content_id}`} className="content-title">
            {activity.content_title}
          </Link>
          <div className="content-metadata">
            {getContentYear() && (
              <span className="content-year">{getContentYear()}</span>
            )}
            {getContentGenres() && (
              <span className="content-genres">{getContentGenres()}</span>
            )}
            {getContentCreators() && (
              <span className="content-creators">
                {activity.content_type === 'movie' ? 'Yönetmen: ' : 'Yazar: '}
                {getContentCreators()}
              </span>
            )}
            {(() => {
              const rating = parseFloat(activity.content_average_rating)
              return !isNaN(rating) && rating > 0 ? (
                <span className="content-rating">
                  ⭐ {rating.toFixed(1)}/10
                </span>
              ) : null
            })()}
          </div>
          {activity.activity_type === 'review' && (
            <div className="review-excerpt-container">
              <p className="review-excerpt">
                {getReviewExcerpt(activity.review_excerpt || activity.review_text || '')}
                {activity.review_text && activity.review_text.length > 180 && (
                  <Link to={`/${activity.content_type}/${activity.content_id}`} className="read-more">
                    ...daha fazlasını oku
                  </Link>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="activity-footer">
        <button 
          className={`like-btn ${likeStatus?.liked ? 'liked' : ''}`}
          onClick={handleLike}
          disabled={!user}
        >
          {likeStatus?.liked ? '✓ Beğendin' : 'Beğen'} {likeCount?.count > 0 && `(${likeCount.count})`}
        </button>
        {activity.activity_type === 'review' && (
          <button 
            className="comment-btn"
            onClick={() => {
              const newShowComments = !showComments
              setShowComments(newShowComments)
            }}
          >
            Yorumlar {commentsData?.total > 0 && `(${commentsData.total})`}
          </button>
        )}
        <button 
          className="comment-btn"
          onClick={handleCommentClick}
          disabled={!user || activity.activity_type !== 'review'}
          title={activity.activity_type !== 'review' ? 'Sadece yorumlara yorum yapılabilir' : ''}
        >
          Yorum Yap
        </button>
      </div>
      {showCommentInput && activity.activity_type === 'review' && (
        <div className="comment-input-section">
          <div className="comment-input-wrapper">
            {user && (
              <div className="comment-input-avatar">
                <img src={user.avatar_url || '/default-avatar.png'} alt={user.username} />
              </div>
            )}
            <div className="comment-input-content">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Yorumunuzu yazın..."
                rows="3"
                disabled={commentMutation.isLoading}
                className="comment-input-textarea"
              />
              <div className="comment-input-actions">
                <button 
                  className="comment-cancel-btn"
                  onClick={() => {
                    setShowCommentInput(false)
                    setCommentText('')
                  }}
                  disabled={commentMutation.isLoading}
                >
                  İptal
                </button>
                <button 
                  className="comment-submit-btn"
                  onClick={handleCommentSubmit}
                  disabled={commentMutation.isLoading || commentText.trim().length === 0}
                >
                  {commentMutation.isLoading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showComments && activity.activity_type === 'review' && (
        <div className="comments-section">
          {commentsData?.comments && commentsData.comments.length > 0 ? (
            <div className="comments-list">
              {commentsData.comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <Link to={`/profile/${comment.user_id}`} className="comment-avatar">
                      <img src={comment.avatar_url || '/default-avatar.png'} alt={comment.username} />
                    </Link>
                    <div className="comment-info">
                      <Link to={`/profile/${comment.user_id}`} className="comment-username">
                        {comment.username}
                      </Link>
                      <span className="comment-date">{getTimeAgo(comment.created_at)}</span>
                    </div>
                    {user && user.id === comment.user_id && editingCommentId !== comment.id && (
                      <div className="comment-actions">
                        <button
                          className="edit-comment-btn"
                          onClick={() => handleEditComment(comment)}
                          title="Yorumu düzenle"
                        >
                          ✎
                        </button>
                        <button
                          className="delete-comment-btn"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deleteCommentMutation.isLoading}
                          title="Yorumu sil"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="edit-comment-section">
                      <textarea
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        rows="3"
                        className="edit-comment-textarea"
                        disabled={updateCommentMutation.isLoading}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button
                          onClick={handleCancelEdit}
                          disabled={updateCommentMutation.isLoading}
                          className="cancel-edit-btn"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateCommentMutation.isLoading || editingCommentText.trim().length === 0}
                          className="save-edit-btn"
                        >
                          {updateCommentMutation.isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-text">{comment.comment_text}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-comments">Henüz yorum yok</div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActivityCard

