import express from 'express';
import { getLikes, toggleLike } from '../controllers/likeController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/:id', authenticate, getLikes);
router.post('/toggle/:id', authenticate, toggleLike);

export default router;
