import express from 'express';
import * as meetingController from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/join', protect, meetingController.joinMeeting);
router.post('/end', protect, meetingController.endMeeting);
router.get('/turn-credentials', protect, meetingController.getTurnCredentials);

export default router;
