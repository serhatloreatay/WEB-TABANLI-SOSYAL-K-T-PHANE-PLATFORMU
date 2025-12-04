-- Kitap ve Film Kütüphanesi Sosyal Platform Veritabanı Şeması
-- MySQL Database Schema

-- Kullanıcılar Tablosu
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- Filmler Tablosu (TMDb'den çekilecek)
CREATE TABLE IF NOT EXISTS movies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tmdb_id INT UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    overview TEXT,
    release_date DATE,
    poster_url VARCHAR(500),
    backdrop_url VARCHAR(500),
    runtime INT, -- dakika cinsinden
    genres JSON, -- ["Action", "Drama", ...]
    directors JSON, -- ["Director Name", ...]
    cast JSON, -- [{"name": "Actor", "character": "Character"}, ...]
    average_rating DECIMAL(3,1) DEFAULT 0.0,
    total_ratings INT DEFAULT 0,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_tmdb_id (tmdb_id),
    INDEX idx_title (title),
    INDEX idx_release_date (release_date),
    INDEX idx_average_rating (average_rating)
);

-- Kitaplar Tablosu (Google Books/Open Library'den çekilecek)
CREATE TABLE IF NOT EXISTS books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    google_books_id VARCHAR(100),
    open_library_id VARCHAR(100),
    isbn VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    published_date DATE,
    page_count INT,
    cover_url VARCHAR(500),
    authors JSON, -- ["Author Name", ...]
    categories JSON, -- ["Fiction", "Science", ...]
    publisher VARCHAR(255),
    average_rating DECIMAL(3,1) DEFAULT 0.0,
    total_ratings INT DEFAULT 0,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_google_books_id (google_books_id),
    INDEX idx_open_library_id (open_library_id),
    INDEX idx_isbn (isbn),
    INDEX idx_title (title),
    INDEX idx_average_rating (average_rating)
);

-- Puanlamalar Tablosu
CREATE TABLE IF NOT EXISTS ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content_type ENUM('movie', 'book') NOT NULL,
    content_id INT NOT NULL, -- movie_id veya book_id
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_content_rating (user_id, content_type, content_id),
    INDEX idx_user_id (user_id),
    INDEX idx_content (content_type, content_id),
    INDEX idx_rating (rating)
);

-- Yorumlar Tablosu
CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content_type ENUM('movie', 'book') NOT NULL,
    content_id INT NOT NULL,
    review_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_content (content_type, content_id),
    INDEX idx_created_at (created_at)
);

-- Kullanıcı Listeleri (İzlediklerim, İzlenecekler, Okuduklarım, Okunacaklar)
CREATE TABLE IF NOT EXISTS user_lists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    content_type ENUM('movie', 'book') NOT NULL,
    content_id INT NOT NULL,
    list_type ENUM('watched', 'to_watch', 'read', 'to_read') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_content_list (user_id, content_type, content_id, list_type),
    INDEX idx_user_id (user_id),
    INDEX idx_content (content_type, content_id),
    INDEX idx_list_type (list_type)
);

-- Özel Listeler Tablosu
CREATE TABLE IF NOT EXISTS custom_lists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_public (is_public)
);

-- Özel Liste Öğeleri Tablosu
CREATE TABLE IF NOT EXISTS custom_list_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    custom_list_id INT NOT NULL,
    content_type ENUM('movie', 'book') NOT NULL,
    content_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (custom_list_id) REFERENCES custom_lists(id) ON DELETE CASCADE,
    UNIQUE KEY unique_list_content (custom_list_id, content_type, content_id),
    INDEX idx_custom_list_id (custom_list_id),
    INDEX idx_content (content_type, content_id)
);

-- Takip İlişkileri Tablosu
CREATE TABLE IF NOT EXISTS follows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_follow (follower_id, following_id),
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id)
);

-- Beğeniler Tablosu (Yorumlara ve Puanlamalara)
CREATE TABLE IF NOT EXISTS likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    target_type ENUM('review', 'rating') NOT NULL,
    target_id INT NOT NULL, -- review_id veya rating_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_target_like (user_id, target_type, target_id),
    INDEX idx_user_id (user_id),
    INDEX idx_target (target_type, target_id)
);

-- Yorumlara Yapılan Yorumlar (Nested Comments)
CREATE TABLE IF NOT EXISTS review_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    review_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_review_id (review_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

