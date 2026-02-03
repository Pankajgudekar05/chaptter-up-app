import express from 'express';
import {
  signup,
  signin,
  logout,
  logoutAllDevices,
  getUserDetails,
  getAllUsers,
  updateUserDetails
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.post('/logout', authenticate, logout);
router.post('/logout-all-devices', authenticate, logoutAllDevices);
router.get('/get-details/:userId', authenticate, getUserDetails);
router.get('/get-all-details', authenticate, getAllUsers);
router.put('/update-details/:userId', authenticate, upload.single('avatar'), updateUserDetails);

export default router;
