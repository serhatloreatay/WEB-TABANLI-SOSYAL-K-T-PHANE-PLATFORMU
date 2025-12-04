import { useState, useEffect } from 'react'
import { useInfiniteQuery } from 'react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import ActivityCard from '../components/ActivityCard'
import './HomePage.css'

const HomePage = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery(
    'feed',
    async ({ pageParam = 1 }) => {
      const response = await axios.get('/api/feed', {
        params: { page: pageParam, limit: 15 }
      })
      return response.data
    },
    {
      getNextPageParam: (lastPage) => {
        return lastPage.hasMore ? lastPage.page + 1 : undefined
      }
    }
  )

  useEffect(() => {
    const handleScroll = () => {
      // Sayfanın sonuna 200px kala yükle (daha erken yükleme için)
      const scrollPosition = window.innerHeight + document.documentElement.scrollTop
      const documentHeight = document.documentElement.offsetHeight
      
      if (scrollPosition >= documentHeight - 200) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) return <div className="container"><p>Yükleniyor...</p></div>
  if (error) {
    console.error('Feed error:', error)
    return (
      <div className="container">
        <h1>Ana Sayfa</h1>
        <div className="feed">
          <p style={{ color: 'red' }}>Hata: {error.message}</p>
          <p style={{ color: 'gray', fontSize: '0.9rem' }}>
            Backend penceresindeki hata mesajlarını kontrol edin.
          </p>
        </div>
      </div>
    )
  }

  const activities = data?.pages?.flatMap(page => page.activities || []) || []

  return (
    <div className="home-page">
      <div className="container">
        <h1>Ana Sayfa</h1>
        <div className="feed">
          {activities.length > 0 ? (
            <>
              {activities.map((activity) => (
                <ActivityCard key={`${activity.activity_type}-${activity.activity_id}`} activity={activity} />
              ))}
              
              {/* Loading indicator */}
              {isFetchingNextPage && (
                <div className="loading-more">
                  <div className="loading-spinner"></div>
                  <p>Daha fazla yükleniyor...</p>
                </div>
              )}
              
              {/* Load More Button */}
              {hasNextPage && !isFetchingNextPage && (
                <div className="load-more-container">
                  <button 
                    className="load-more-btn"
                    onClick={() => fetchNextPage()}
                  >
                    Daha Fazla Yükle
                  </button>
                </div>
              )}
              
              {/* End of feed message */}
              {!hasNextPage && activities.length > 0 && (
                <div className="end-of-feed">
                  <p>✨ Tüm aktiviteler yüklendi</p>
                  <p className="end-of-feed-subtitle">Daha fazla aktivite için takip ettiğiniz kullanıcıların aktivitelerini bekleyin</p>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                Henüz aktivite yok.
              </p>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Takip ettiğiniz kullanıcıların aktiviteleri veya kendi aktiviteleriniz burada görünecek.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#999' }}>
                İlk aktiviteyi oluşturmak için: <Link to="/search" style={{ color: '#007bff' }}>Ara & Keşfet</Link> sayfasından bir film veya kitap bulun, puanlayın veya yorumlayın.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage

