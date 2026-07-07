import express from 'express';
import * as sessionController from '../controllers/sessionController.js';
import { protect, admin, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin / Dev Seed routes (Protected + Admin only)
router.post('/dev/seed/test-session', protect, admin, sessionController.devSeedSession);
router.post('/seed', protect, admin, sessionController.seedSession);
router.get('/all', protect, admin, sessionController.getAllSessions);

// User-specific routes (Protected)
router.get('/user/:userId/role/:role', protect, sessionController.getUserSessions);
router.post('/:sessionId/join', protect, sessionController.joinSession);
router.patch('/:sessionId/meeting-link', protect, sessionController.updateMeetingLink);
router.post('/:sessionId/complete', protect, sessionController.completeSession);
router.get('/:sessionId', protect, sessionController.getSession);
router.get('/candidate/:candidateId', protect, sessionController.getSessionsByCandidate);
router.get('/expert/:expertId', optionalProtect, sessionController.getSessionsByExpert);
router.get('/:sessionId/reviews', protect, sessionController.getSessionReviews);
router.post('/:sessionId/review', protect, sessionController.submitReview);
router.post('/:sessionId/request-feedback', protect, sessionController.requestFeedback);
router.post('/', protect, sessionController.createSession);

export default router;
