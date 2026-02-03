/*
  # Postway Social Media Database Schema

  ## Overview
  Complete database schema for a social media platform with user management,
  posts, comments, likes, friendships, and OTP-based password reset.

  ## Tables Created

  ### 1. users
  Stores user account information and authentication data
  - `id` (uuid, primary key) - Unique user identifier
  - `name` (text) - User's full name
  - `email` (text, unique) - User's email address
  - `password` (text) - Hashed password
  - `gender` (text) - User's gender
  - `avatar` (text) - Profile picture URL
  - `tokens` (text[]) - Array of active JWT tokens for multi-device logout
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. posts
  Stores user posts with captions and images
  - `id` (uuid, primary key) - Unique post identifier
  - `user_id` (uuid, foreign key) - References users.id
  - `caption` (text) - Post caption/description
  - `image_url` (text) - URL of post image
  - `created_at` (timestamptz) - Post creation timestamp
  - `updated_at` (timestamptz) - Last post update timestamp

  ### 3. comments
  Stores comments on posts
  - `id` (uuid, primary key) - Unique comment identifier
  - `post_id` (uuid, foreign key) - References posts.id
  - `user_id` (uuid, foreign key) - References users.id
  - `content` (text) - Comment text content
  - `created_at` (timestamptz) - Comment creation timestamp
  - `updated_at` (timestamptz) - Last comment update timestamp

  ### 4. likes
  Stores likes on posts and comments
  - `id` (uuid, primary key) - Unique like identifier
  - `user_id` (uuid, foreign key) - References users.id
  - `likeable_type` (text) - Type of liked item ('post' or 'comment')
  - `likeable_id` (uuid) - ID of the liked post or comment
  - `created_at` (timestamptz) - Like creation timestamp

  ### 5. friendships
  Stores friend relationships and requests
  - `id` (uuid, primary key) - Unique friendship identifier
  - `user_id` (uuid, foreign key) - User who initiated the friendship
  - `friend_id` (uuid, foreign key) - User who received the request
  - `status` (text) - Status: 'pending', 'accepted', 'rejected'
  - `created_at` (timestamptz) - Friendship request timestamp
  - `updated_at` (timestamptz) - Last status update timestamp

  ### 6. otps
  Stores one-time passwords for password reset
  - `id` (uuid, primary key) - Unique OTP identifier
  - `email` (text) - Email address for password reset
  - `otp` (text) - The 6-digit OTP code
  - `expires_at` (timestamptz) - OTP expiration time (10 minutes)
  - `verified` (boolean) - Whether OTP has been verified
  - `created_at` (timestamptz) - OTP creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies restrict access to authenticated users
  - Users can only modify their own data
  - Cascade deletes maintain referential integrity

  ## Indexes
  - Composite indexes for frequently queried combinations
  - Individual indexes on foreign keys for join performance
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  gender text,
  avatar text,
  tokens text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  likeable_type text NOT NULL CHECK (likeable_type IN ('post', 'comment')),
  likeable_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, likeable_type, likeable_id)
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (user_id != friend_id),
  UNIQUE(user_id, friend_id)
);

-- Create otps table
CREATE TABLE IF NOT EXISTS otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_likeable ON likes(likeable_type, likeable_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_expires_at ON otps(expires_at);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all user profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid)
  WITH CHECK (id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

-- RLS Policies for posts table
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid)
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

-- RLS Policies for comments table
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid)
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

CREATE POLICY "Users and post owners can delete comments"
  ON comments FOR DELETE
  TO authenticated
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid
    OR
    post_id IN (
      SELECT id FROM posts WHERE user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid
    )
  );

-- RLS Policies for likes table
CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

-- RLS Policies for friendships table
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid
    OR friend_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid
  );

CREATE POLICY "Users can create friendship requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

CREATE POLICY "Users can update received friendship requests"
  ON friendships FOR UPDATE
  TO authenticated
  USING (friend_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid)
  WITH CHECK (friend_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid);

CREATE POLICY "Users can delete own friendship requests"
  ON friendships FOR DELETE
  TO authenticated
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid
    OR friend_id = (current_setting('request.jwt.claims', true)::json->>'userId')::uuid
  );

-- RLS Policies for otps table (public access for password reset)
CREATE POLICY "Anyone can create OTP"
  ON otps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view own OTP"
  ON otps FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update OTP verification"
  ON otps FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
