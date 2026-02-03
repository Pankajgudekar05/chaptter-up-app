import express from 'express';
import {
  getComments,
  addComment,
  updateComment,
  deleteComment
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/:postId', authenticate, getComments);
router.post('/:postId', authenticate, addComment);
router.put('/:commentId', authenticate, updateComment);
router.delete('/:commentId', authenticate, deleteComment);

export default router;
