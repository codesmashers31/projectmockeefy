import express from 'express';
import {
  createTicket,
  getAdminTickets,
  getAdminTicketCounts,
  updateTicket,
  deleteTicket,
} from '../controllers/supportController.js';
import { protect, admin, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Candidate / User support submission (public or authenticated)
router.post('/ticket', optionalProtect, createTicket);

// Admin endpoints
router.get('/admin/tickets', protect, admin, getAdminTickets);
router.get('/admin/counts', protect, admin, getAdminTicketCounts);
router.patch('/admin/tickets/:id', protect, admin, updateTicket);
router.delete('/admin/tickets/:id', protect, admin, deleteTicket);

export default router;
