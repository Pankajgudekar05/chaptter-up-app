import express from 'express';
import {
  getFriends,
  getPendingRequests,
  toggleFriendship,
  respondToRequest
} from '../controllers/friendController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/get-friends/:userId', authenticate, getFriends);
router.get('/get-pending-requests', authenticate, getPendingRequests);
router.post('/toggle-friendship/:friendId', authenticate, toggleFriendship);
router.post('/response-to-request/:friendId', authenticate, respondToRequest);

export default router;
