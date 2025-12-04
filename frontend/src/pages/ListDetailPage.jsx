import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import './ListDetailPage.css'

const ListDetailPage = () => {
  const { listId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: listInfo, isLoading: listLoading, error: listError } = useQuery(
    ['listInfo', listId],
    async () => {
      const response = await axios.get(`/api/lists/custom/${listId}/info`)
      return response.data
    },
    { enabled: !!listId }
  )

  const { data: listItems, isLoading: itemsLoading, error: itemsError } = useQuery(
    ['listItems', listId],
    async () => {
      const response = await axios.get(`/api/lists/custom/${listId}/items`)
      return response.data
    },
    { enabled: !!listId }
  )

  if (listLoading || itemsLoading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Yükleniyor...</p>
      </div>
    )
  }

  if (listError) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Hata</h1>
        <p style={{ color: 'red' }}>Liste yüklenirken bir hata oluştu: {listError.message}</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Geri Dön
        </button>
      </div>
    )
  }

  if (!listInfo) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Liste Bulunamadı</h1>
        <p>Bu liste mevcut değil veya erişim izniniz yok.</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Geri Dön
        </button>
      </div>
    )
  }

  return (
    <div className="list-detail-page">
      <div className="container">
        <div className="list-header">
          <button onClick={() => navigate(-1)} className="back-button">
            ← Geri
          </button>
          <div className="list-info">
            <h1>{listInfo.name}</h1>
            {listInfo.description && <p className="list-description">{listInfo.description}</p>}
            <p className="list-meta">
              {listItems?.length || 0} {listItems?.length === 1 ? 'içerik' : 'içerik'}
            </p>
          </div>
        </div>

        {itemsError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            <p>İçerikler yüklenirken bir hata oluştu: {itemsError.message}</p>
          </div>
        ) : listItems && listItems.length > 0 ? (
          <div className="library-grid">
            {listItems.map((item) => (
              <Link
                key={`${item.content_type}-${item.content_id}`}
                to={`/${item.content_type}/${item.content_id}`}
                className="library-item"
              >
                <img src={item.poster_url || '/placeholder.png'} alt={item.title} />
                <h4>{item.title}</h4>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            <p>Bu listede henüz içerik yok.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#999' }}>
              Film veya kitap detay sayfasından bu listeye içerik ekleyebilirsiniz.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ListDetailPage

