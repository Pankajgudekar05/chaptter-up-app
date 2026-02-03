import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { testConnection } from './src/config/database.js';
import { requestLogger } from './src/middleware/logger.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';

import userRoutes from './src/routes/userRoutes.js';
import postRoutes from './src/routes/postRoutes.js';
import commentRoutes from './src/routes/commentRoutes.js';
import likeRoutes from './src/routes/likeRoutes.js';
import friendRoutes from './src/routes/friendRoutes.js';
import otpRoutes from './src/routes/otpRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(requestLogger);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Postway Social Media API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      posts: '/api/posts',
      comments: '/api/comments',
      likes: '/api/likes',
      friends: '/api/friends',
      otp: '/api/otp'
    }
  });
});

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/otp', otpRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`✓ Server is running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API Base URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
