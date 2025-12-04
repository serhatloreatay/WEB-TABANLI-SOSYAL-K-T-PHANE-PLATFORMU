import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import ActivityCard from '../components/ActivityCard'
import './ProfilePage.css'

const UserActivities = ({ userId }) => {
  const { data, isLoading } = useQuery(
    ['userActivities', userId],
    async () => {
      const response = await axios.get(`/api/user-activities/${userId}`)
      return response.data
    }
  )

  if (isLoading) return <p>Yükleniyor...</p>
  
  if (!data?.activities || data.activities.length === 0) {
    return <p>Henüz aktivite yok.</p>
  }

  return (
    <div className="user-activities">
      {data.activities.map((activity) => (
        <ActivityCard key={`${activity.activity_type}-${activity.activity_id}`} activity={activity} />
      ))}
    </div>
  )
}

const ProfilePage = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: currentUser, updateUser } = useAuth()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('library')
  const [librarySubTab, setLibrarySubTab] = useState('watched')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ avatar_url: '', bio: '' })
  const [newListName, setNewListName] = useState('')
  const [showCreateListForm, setShowCreateListForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)

  const isOwnProfile = currentUser && parseInt(userId) === currentUser.id

  const { data: profileUser } = useQuery(
    ['user', userId],
    async () => {
      const response = await axios.get(`/api/users/${userId}`)
      return response.data
    }
  )

  const { data: followStatus } = useQuery(
    ['followStatus', userId],
    async () => {
      const response = await axios.get(`/api/follows/${userId}/status`)
      return response.data
    },
    { enabled: !isOwnProfile && !!currentUser }
  )

  const { data: watchedMovies } = useQuery(
    ['userList', userId, 'watched', 'movie'],
    async () => {
      const response = await axios.get(`/api/lists/user/${userId}/watched`)
      return response.data
    }
  )

  const { data: toWatchMovies } = useQuery(
    ['userList', userId, 'to_watch', 'movie'],
    async () => {
      const response = await axios.get(`/api/lists/user/${userId}/to_watch`)
      return response.data
    }
  )

  const { data: watchedBooks } = useQuery(
    ['userList', userId, 'read', 'book'],
    async () => {
      const response = await axios.get(`/api/lists/user/${userId}/read`)
      return response.data
    }
  )

  const { data: toReadBooks } = useQuery(
    ['userList', userId, 'to_read', 'book'],
    async () => {
      const response = await axios.get(`/api/lists/user/${userId}/to_read`)
      return response.data
    }
  )


  const { data: customLists } = useQuery(
    ['customLists', userId],
    async () => {
      const response = await axios.get(`/api/lists/custom/${userId}`)
      return response.data
    }
  )

  const { data: followersData } = useQuery(
    ['followers', userId],
    async () => {
      const response = await axios.get(`/api/follows/${userId}/followers`)
      return response.data
    },
    { enabled: showFollowersModal }
  )

  const { data: followingData } = useQuery(
    ['following', userId],
    async () => {
      const response = await axios.get(`/api/follows/${userId}/following`)
      return response.data
    },
    { enabled: showFollowingModal }
  )

  const followMutation = useMutation(
    () => axios.post(`/api/follows/${userId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['followStatus', userId])
        queryClient.invalidateQueries(['user', userId])
      }
    }
  )

  const unfollowMutation = useMutation(
    () => axios.delete(`/api/follows/${userId}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['followStatus', userId])
        queryClient.invalidateQueries(['user', userId])
      }
    }
  )

  const uploadAvatarMutation = useMutation(
    async (file) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const response = await axios.post(`/api/users/${userId}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      console.log('Avatar upload response:', response.data)
      return response.data
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['user', userId])
        // Update AuthContext if it's the current user's profile
        if (isOwnProfile && updateUser && data.avatar_url) {
          updateUser({ avatar_url: data.avatar_url })
        }
        setEditForm(prev => ({ ...prev, avatar_url: data.avatar_url }))
        setSelectedFile(null)
        setAvatarPreview(null)
        setIsUploading(false)
      },
      onError: (error) => {
        console.error('Avatar upload error:', error)
        console.error('Error response:', error.response)
        setIsUploading(false)
        alert('Avatar yüklenirken bir hata oluştu: ' + (error.response?.data?.message || error.message))
      }
    }
  )

  const updateProfileMutation = useMutation(
    (data) => {
      return axios.put(`/api/users/${userId}`, data)
    },
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(['user', userId])
        // Update AuthContext if it's the current user's profile
        if (isOwnProfile && updateUser && response.data?.user) {
          updateUser({
            avatar_url: response.data.user.avatar_url,
            bio: response.data.user.bio
          })
        }
        setIsEditing(false)
        setSelectedFile(null)
        setAvatarPreview(null)
        setIsUploading(false)
        alert('Profil başarıyla güncellendi!')
      },
      onError: (error) => {
        console.error('Profile update error:', error)
        console.error('Error response:', error.response)
        setIsUploading(false)
        alert('Profil güncellenirken bir hata oluştu: ' + (error.response?.data?.message || error.message))
      }
    }
  )

  const createListMutation = useMutation(
    (name) => axios.post('/api/lists/custom', { name }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customLists', userId])
        setNewListName('')
        setShowCreateListForm(false)
      }
    }
  )

  const handleEdit = () => {
    setEditForm({
      avatar_url: profileUser?.avatar_url || '',
      bio: profileUser?.bio || ''
    })
    setIsEditing(true)
    setSelectedFile(null)
    setAvatarPreview(null)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        alert('Sadece resim dosyaları yüklenebilir (JPEG, JPG, PNG, GIF, WEBP)')
        return
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır')
        return
      }
      setSelectedFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    // If a file is selected, upload it first
    if (selectedFile) {
      setIsUploading(true)
      try {
        const result = await uploadAvatarMutation.mutateAsync(selectedFile)
        // Update editForm with the new avatar URL
        const updatedForm = { ...editForm, avatar_url: result.avatar_url }
        // Then update profile with bio and new avatar URL
        await updateProfileMutation.mutateAsync(updatedForm)
      } catch (error) {
        console.error('Avatar upload error:', error)
        alert('Avatar yüklenirken bir hata oluştu: ' + (error.response?.data?.message || error.message))
        setIsUploading(false)
        return
      }
    } else {
      // If no file selected, just update profile with bio and existing avatar_url
      try {
        await updateProfileMutation.mutateAsync(editForm)
      } catch (error) {
        console.error('Profile update error:', error)
        // Error is already handled in onError callback
      }
    }
  }

  const handleCreateList = () => {
    if (newListName.trim()) {
      createListMutation.mutate(newListName)
    }
  }

  if (!profileUser) return <div className="container">Yükleniyor...</div>

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-header">
          <img
            src={profileUser.avatar_url || '/default-avatar.png'}
            alt={profileUser.username}
            className="profile-avatar"
          />
          <div className="profile-info">
            <h1>{profileUser.username}</h1>
            {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}
            {profileUser.stats && (
              <div className="profile-stats">
                <span>{profileUser.stats.total_ratings} Puan</span>
                <span>{profileUser.stats.total_reviews} Yorum</span>
                <span 
                  className="clickable-stat" 
                  onClick={() => setShowFollowersModal(true)}
                  title="Takipçileri görüntüle"
                >
                  {profileUser.stats.followers_count} Takipçi
                </span>
                <span 
                  className="clickable-stat" 
                  onClick={() => setShowFollowingModal(true)}
                  title="Takip edilenleri görüntüle"
                >
                  {profileUser.stats.following_count} Takip
                </span>
              </div>
            )}
          </div>
          <div className="profile-actions">
            {isOwnProfile ? (
              <>
                {!isEditing ? (
                  <>
                    <button onClick={handleEdit}>Profili Düzenle</button>
                    <button onClick={() => setShowCreateListForm(true)}>Yeni Özel Liste Oluştur</button>
                  </>
                ) : (
                  <>
                    <div className="avatar-upload-section">
                      <label htmlFor="avatar-upload" className="avatar-upload-label">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" className="avatar-preview" />
                        ) : (
                          <div className="avatar-upload-placeholder">
                            <span>📷</span>
                            <span>Fotoğraf Seç</span>
                          </div>
                        )}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      {selectedFile && (
                        <p className="file-name">{selectedFile.name}</p>
                      )}
                      <p className="upload-hint">veya</p>
                      <input
                        type="text"
                        placeholder="Avatar URL (isteğe bağlı)"
                        value={editForm.avatar_url}
                        onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                        style={{ marginTop: '0.5rem' }}
                      />
                    </div>
                    <textarea
                      placeholder="Biyografi"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows="3"
                    />
                    <button 
                      onClick={handleSave} 
                      disabled={isUploading}
                    >
                      {isUploading ? 'Yükleniyor...' : 'Kaydet'}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditing(false)
                        setSelectedFile(null)
                        setAvatarPreview(null)
                      }}
                      disabled={isUploading}
                    >
                      İptal
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  if (followStatus?.isFollowing) {
                    unfollowMutation.mutate()
                  } else {
                    followMutation.mutate()
                  }
                }}
              >
                {followStatus?.isFollowing ? 'Takipten Çık' : 'Takip Et'}
              </button>
            )}
          </div>
        </div>

        {isOwnProfile && showCreateListForm && (
          <div className="create-list-form">
            <input
              type="text"
              placeholder="Liste adı"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <button onClick={handleCreateList}>Oluştur</button>
            <button onClick={() => {
              setShowCreateListForm(false)
              setNewListName('')
            }}>İptal</button>
          </div>
        )}

        <div className="profile-tabs">
          <button
            className={activeTab === 'library' ? 'active' : ''}
            onClick={() => setActiveTab('library')}
          >
            Kütüphane
          </button>
          <button
            className={activeTab === 'custom-lists' ? 'active' : ''}
            onClick={() => setActiveTab('custom-lists')}
          >
            Özel Listeler
          </button>
          <button
            className={activeTab === 'activities' ? 'active' : ''}
            onClick={() => setActiveTab('activities')}
          >
            Aktiviteler
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'library' && (
            <div className="library-tabs">
              <div className="library-tab-buttons">
                <button 
                  className={librarySubTab === 'watched' ? 'active' : ''}
                  onClick={() => setLibrarySubTab('watched')}
                >
                  İzlediklerim
                </button>
                <button 
                  className={librarySubTab === 'to-watch' ? 'active' : ''}
                  onClick={() => setLibrarySubTab('to-watch')}
                >
                  İzlenecekler
                </button>
                <button 
                  className={librarySubTab === 'read' ? 'active' : ''}
                  onClick={() => setLibrarySubTab('read')}
                >
                  Okuduklarım
                </button>
                <button 
                  className={librarySubTab === 'to-read' ? 'active' : ''}
                  onClick={() => setLibrarySubTab('to-read')}
                >
                  Okunacaklar
                </button>
              </div>
              <div className="library-content">
                {librarySubTab === 'watched' && (
                  <div className="library-grid">
                    {watchedMovies?.length > 0 ? (
                      watchedMovies.map((item) => (
                        <Link
                          key={`movie-${item.content_id}`}
                          to={`/movie/${item.content_id}`}
                          className="library-item"
                        >
                          <img src={item.poster_url || '/placeholder.png'} alt={item.title} />
                          <h4>{item.title}</h4>
                          {item.release_date && (
                            <p>{new Date(item.release_date).getFullYear()}</p>
                          )}
                        </Link>
                      ))
                    ) : (
                      <p>Henüz izlenen film yok.</p>
                    )}
                  </div>
                )}
                {librarySubTab === 'to-watch' && (
                  <div className="library-grid">
                    {toWatchMovies?.length > 0 ? (
                      toWatchMovies.map((item) => (
                        <Link
                          key={`movie-${item.content_id}`}
                          to={`/movie/${item.content_id}`}
                          className="library-item"
                        >
                          <img src={item.poster_url || '/placeholder.png'} alt={item.title} />
                          <h4>{item.title}</h4>
                          {item.release_date && (
                            <p>{new Date(item.release_date).getFullYear()}</p>
                          )}
                        </Link>
                      ))
                    ) : (
                      <p>Henüz izlenecek film yok.</p>
                    )}
                  </div>
                )}
                {librarySubTab === 'read' && (
                  <div className="library-grid">
                    {watchedBooks?.length > 0 ? (
                      watchedBooks.map((item) => (
                        <Link
                          key={`book-${item.content_id}`}
                          to={`/book/${item.content_id}`}
                          className="library-item"
                        >
                          <img src={item.poster_url || '/placeholder.png'} alt={item.title} />
                          <h4>{item.title}</h4>
                          {item.release_date && (
                            <p>{typeof item.release_date === 'string' && item.release_date.includes('-')
                              ? new Date(item.release_date).getFullYear()
                              : item.release_date.split('-')[0] || item.release_date}</p>
                            )}
                        </Link>
                      ))
                    ) : (
                      <p>Henüz okunan kitap yok.</p>
                    )}
                  </div>
                )}
                {librarySubTab === 'to-read' && (
                  <div className="library-grid">
                    {toReadBooks?.length > 0 ? (
                      toReadBooks.map((item) => (
                        <Link
                          key={`book-${item.content_id}`}
                          to={`/book/${item.content_id}`}
                          className="library-item"
                        >
                          <img src={item.poster_url || '/placeholder.png'} alt={item.title} />
                          <h4>{item.title}</h4>
                          {item.release_date && (
                            <p>{typeof item.release_date === 'string' && item.release_date.includes('-')
                              ? new Date(item.release_date).getFullYear()
                              : item.release_date.split('-')[0] || item.release_date}</p>
                            )}
                        </Link>
                      ))
                    ) : (
                      <p>Henüz okunacak kitap yok.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'custom-lists' && (
            <div className="custom-lists">
              {customLists?.map((list) => (
                <div key={list.id} className="custom-list-item">
                  <h3>{list.name}</h3>
                  {list.description && <p>{list.description}</p>}
                  <Link to={`/list/${list.id}`}>Görüntüle</Link>
                </div>
              ))}
              {(!customLists || customLists.length === 0) && (
                <p>Henüz özel liste oluşturulmamış.</p>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="activities">
              <h3>Son Aktiviteler</h3>
              <UserActivities userId={userId} />
            </div>
          )}
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Takipçiler</h2>
              <button className="modal-close" onClick={() => setShowFollowersModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {followersData?.followers && followersData.followers.length > 0 ? (
                <div className="users-list">
                  {followersData.followers.map((follower) => (
                    <div key={follower.id} className="user-item">
                      <Link 
                        to={`/profile/${follower.id}`}
                        onClick={() => setShowFollowersModal(false)}
                        className="user-link"
                      >
                        <img 
                          src={follower.avatar_url || '/default-avatar.png'} 
                          alt={follower.username}
                          className="user-avatar"
                        />
                        <div className="user-info">
                          <h3>{follower.username}</h3>
                          {follower.bio && <p className="user-bio">{follower.bio}</p>}
                          <div className="user-stats-small">
                            <span>{follower.total_ratings} Puan</span>
                            <span>{follower.total_reviews} Yorum</span>
                            <span>{follower.followers_count} Takipçi</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Henüz takipçi yok.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Takip Edilenler</h2>
              <button className="modal-close" onClick={() => setShowFollowingModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {followingData?.following && followingData.following.length > 0 ? (
                <div className="users-list">
                  {followingData.following.map((user) => (
                    <div key={user.id} className="user-item">
                      <Link 
                        to={`/profile/${user.id}`}
                        onClick={() => setShowFollowingModal(false)}
                        className="user-link"
                      >
                        <img 
                          src={user.avatar_url || '/default-avatar.png'} 
                          alt={user.username}
                          className="user-avatar"
                        />
                        <div className="user-info">
                          <h3>{user.username}</h3>
                          {user.bio && <p className="user-bio">{user.bio}</p>}
                          <div className="user-stats-small">
                            <span>{user.total_ratings} Puan</span>
                            <span>{user.total_reviews} Yorum</span>
                            <span>{user.followers_count} Takipçi</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Henüz kimse takip edilmiyor.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage

