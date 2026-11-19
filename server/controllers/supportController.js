import crypto from 'crypto';
import SupportTicket from '../models/SupportTicket.js';
import User from '../models/User.js';
import { syncDataChange, emitToAdmin } from '../services/socketService.js';

// Helper to generate a unique readable ticket ID like MCK-SUP-847291
function generateTicketId() {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `MCK-SUP-${randomNum}`;
}

/**
 * @desc   Create a new support ticket from user / help page
 * @route  POST /api/support/ticket
 * @access Public / Authenticated
 */
export const createTicket = async (req, res) => {
  try {
    const { topic, sessionId, message, email, name } = req.body;

    if (!topic || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic and message are required.',
      });
    }

    let userId = null;
    let userEmail = (email || '').trim().toLowerCase();
    let userName = (name || '').trim() || 'Candidate';
    let userType = 'candidate';

    // If authenticated via token / req.user
    if (req.user) {
      userId = req.user.userId || req.user.id || req.user._id || null;
      if (req.user.email) {
        userEmail = req.user.email.toLowerCase();
      }
      if (req.user.name) {
        userName = req.user.name;
      }
      if (req.user.userType) {
        userType = req.user.userType;
      }
    }

    // Fallback: look up user by email if not directly in req.user
    if (!userId && userEmail) {
      try {
        const foundUser = await User.findOne({ email: userEmail }).select('_id name userType');
        if (foundUser) {
          userId = foundUser._id;
          if (!userName || userName === 'Candidate') {
            userName = foundUser.name || 'Candidate';
          }
          if (foundUser.userType) {
            userType = foundUser.userType;
          }
        }
      } catch (err) {
        // Non-blocking lookup
      }
    }

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required to receive support.',
      });
    }

    // Ensure unique ticketId
    let ticketId = generateTicketId();
    let exists = await SupportTicket.findOne({ ticketId });
    while (exists) {
      ticketId = generateTicketId();
      exists = await SupportTicket.findOne({ ticketId });
    }

    const newTicket = await SupportTicket.create({
      ticketId,
      userId,
      userEmail,
      userName,
      userType,
      topic: topic.trim(),
      sessionId: (sessionId || '').trim(),
      message: message.trim(),
      status: 'open',
      priority: 'normal',
    });

    // Notify admins in real-time
    try {
      emitToAdmin('SUPPORT_TICKET_ALERT', newTicket);
      syncDataChange({
        type: 'SUPPORT_TICKET_CREATED',
        toAdmin: true,
        data: newTicket,
      });
    } catch (socketErr) {
      console.warn('[SupportController] Socket notification failed:', socketErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Your support ticket has been submitted to the Admin team.',
      data: newTicket,
    });
  } catch (error) {
    console.error('[SupportController] Error creating ticket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit support ticket. Please try again.',
      error: error.message,
    });
  }
};

/**
 * @desc   Get all support tickets for Admin Dashboard
 * @route  GET /api/support/admin/tickets
 * @access Private/Admin
 */
export const getAdminTickets = async (req, res) => {
  try {
    const { status, topic, search } = req.query;

    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (topic && topic !== 'all') {
      filter.topic = topic;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { ticketId: { $regex: q, $options: 'i' } },
        { userEmail: { $regex: q, $options: 'i' } },
        { userName: { $regex: q, $options: 'i' } },
        { sessionId: { $regex: q, $options: 'i' } },
        { message: { $regex: q, $options: 'i' } },
      ];
    }

    const [tickets, total, open, inProgress, resolved] = await Promise.all([
      SupportTicket.find(filter).sort({ createdAt: -1 }).lean(),
      SupportTicket.countDocuments({}),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
    ]);

    return res.status(200).json({
      success: true,
      data: tickets,
      counts: {
        total,
        open,
        inProgress,
        resolved,
      },
    });
  } catch (error) {
    console.error('[SupportController] Error fetching admin tickets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve support tickets.',
      error: error.message,
    });
  }
};

/**
 * @desc   Get counts of support tickets for sidebar badges
 * @route  GET /api/support/admin/counts
 * @access Private/Admin
 */
export const getAdminTicketCounts = async (req, res) => {
  try {
    const [open, inProgress, resolved, total] = await Promise.all([
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        open,
        inProgress,
        resolved,
        total,
      },
    });
  } catch (error) {
    console.error('[SupportController] Error fetching counts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket counts.',
      error: error.message,
    });
  }
};

/**
 * @desc   Update ticket status, priority, and admin notes
 * @route  PATCH /api/support/admin/tickets/:id
 * @access Private/Admin
 */
export const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
    }

    if (status) {
      ticket.status = status;
      if (status === 'resolved') {
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = req.user?.userId || req.user?.id || null;
      } else {
        ticket.resolvedAt = null;
        ticket.resolvedBy = null;
      }
    }

    if (priority) {
      ticket.priority = priority;
    }

    if (typeof adminNotes === 'string') {
      ticket.adminNotes = adminNotes.trim();
    }

    await ticket.save();

    // Broadcast update to sync other admin sessions
    syncDataChange({
      type: 'SUPPORT_TICKET_UPDATED',
      toAdmin: true,
      data: ticket,
    });

    return res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully.',
      data: ticket,
    });
  } catch (error) {
    console.error('[SupportController] Error updating ticket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update ticket.',
      error: error.message,
    });
  }
};

/**
 * @desc   Delete a ticket
 * @route  DELETE /api/support/admin/tickets/:id
 * @access Private/Admin
 */
export const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findByIdAndDelete(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found.',
      });
    }

    syncDataChange({
      type: 'SUPPORT_TICKET_UPDATED',
      toAdmin: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket deleted successfully.',
    });
  } catch (error) {
    console.error('[SupportController] Error deleting ticket:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete ticket.',
      error: error.message,
    });
  }
};
