import express from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost
} from '../controllers/postController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/', authenticate, upload.single('image'), createPost);
router.get('/all', authenticate, getAllPosts);
router.get('/', authenticate, getUserPosts);
router.get('/:postId', authenticate, getPostById);
router.put('/:postId', authenticate, upload.single('image'), updatePost);
router.delete('/:postId', authenticate, deletePost);

export default router;
