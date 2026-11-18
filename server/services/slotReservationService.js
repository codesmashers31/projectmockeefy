import SlotReservation from '../models/SlotReservation.js';
import Session from '../models/Session.js';

export const buildSlotKey = (expertId, startTime, endTime) => {
  const eId = expertId?._id || expertId?.id || expertId;
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  return `${eId}_${startMs}_${endMs}`;
};

/**
 * Atomically reserve a slot during order creation.
 * If another candidate has an active reservation (not expired) or the slot is already booked, returns acquired: false.
 */
export async function acquireSlotReservation({ expertId, candidateId, startTime, endTime, orderId, ttlMinutes = 15 }) {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  const reservedUntil = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  // Canonical resolution of expert identifiers (User ID vs ExpertDetails ID)
  let expertUserId = expertId?._id || expertId?.id || expertId;
  let expertDetailsId = expertId?._id || expertId?.id || expertId;
  try {
    const ExpertDetails = (await import('../models/expertModel.js')).default;
    const mongoose = (await import('mongoose')).default;
    const q = mongoose.Types.ObjectId.isValid(expertUserId)
      ? { $or: [{ _id: new mongoose.Types.ObjectId(expertUserId) }, { userId: new mongoose.Types.ObjectId(expertUserId) }] }
      : { expertID: expertUserId };
    const expDoc = await ExpertDetails.findOne(q).lean();
    if (expDoc) {
      expertDetailsId = expDoc._id;
      expertUserId = expDoc.userId || expDoc._id;
    }
  } catch (_) {}

  const primarySlotKey = buildSlotKey(expertUserId, start, end);
  const altSlotKey = expertDetailsId && String(expertDetailsId) !== String(expertUserId)
    ? buildSlotKey(expertDetailsId, start, end)
    : primarySlotKey;
  const slotKeys = Array.from(new Set([primarySlotKey, altSlotKey].filter(Boolean)));

  // 1. Check if a non-cancelled session already exists for this slot
  const existingSession = await Session.findOne({
    $or: [
      {
        slotLockKey: { $in: slotKeys },
        status: { $nin: ['cancelled', 'Cancelled', 'CANCELLED', 'rejected', 'Rejected', 'REJECTED', 'declined', 'Declined', 'DECLINED', 'failed', 'Failed', 'FAILED', 'expired', 'Expired', 'EXPIRED'] }
      },
      {
        expertId: { $in: [expertDetailsId, expertUserId, expertId?._id || expertId].filter(Boolean) },
        status: { $in: ['confirmed', 'live', 'upcoming', 'Upcoming', 'pending'] },
        startTime: { $lt: end },
        endTime: { $gt: start }
      }
    ]
  });

  if (existingSession) {
    return {
      acquired: false,
      reason: 'This slot has already been booked by another candidate.',
      conflictType: 'session_exists'
    };
  }

  // 2. Check for active unexpired reservation by another user/order
  // Safely match both String and ObjectId representations of candidateId
  let excludeCandidateList = [];
  try {
    const mongoose = (await import('mongoose')).default;
    const candidateOid = mongoose.Types.ObjectId.isValid(candidateId) ? new mongoose.Types.ObjectId(candidateId) : null;
    const candidateStr = candidateId ? String(candidateId) : null;
    excludeCandidateList = [candidateOid, candidateStr].filter(Boolean);
  } catch (_) {
    excludeCandidateList = [candidateId].filter(Boolean);
  }

  const activeReservation = await SlotReservation.findOne({
    slotKey: { $in: slotKeys },
    status: 'reserved',
    reservedUntil: { $gt: now },
    candidateId: { $nin: excludeCandidateList }
  });

  if (activeReservation) {
    return {
      acquired: false,
      reason: 'This slot is currently reserved while another candidate completes checkout.',
      conflictType: 'active_reservation',
      reservedUntil: activeReservation.reservedUntil
    };
  }

  // 3. Upsert or record reservation for this candidate
  const reservation = await SlotReservation.findOneAndUpdate(
    { slotKey: primarySlotKey, candidateId },
    {
      $set: {
        expertId: expertDetailsId || expertUserId,
        candidateId,
        startTime: start,
        endTime: end,
        slotKey: primarySlotKey,
        orderId,
        status: 'reserved',
        reservedUntil,
        confirmedSessionId: null
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    acquired: true,
    reservation,
    slotKey: primarySlotKey,
    reservedUntil
  };
}

/**
 * Confirm a slot reservation when payment succeeds and session is created.
 */
export async function confirmSlotReservation({ orderId, sessionId, paymentId }) {
  return await SlotReservation.updateMany(
    { orderId },
    {
      $set: {
        status: 'confirmed',
        confirmedSessionId: sessionId,
        paymentId
      }
    }
  );
}

/**
 * Safely release an active slot reservation if payment fails, is cancelled, or cutoff expires.
 */
export async function releaseSlotReservation({ orderId, slotKey }) {
  const query = {};
  if (orderId) query.orderId = orderId;
  if (slotKey) query.slotKey = slotKey;
  if (Object.keys(query).length === 0) return null;

  return await SlotReservation.updateMany(
    query,
    {
      $set: {
        status: 'released'
      }
    }
  );
}

export default {
  buildSlotKey,
  acquireSlotReservation,
  confirmSlotReservation,
  releaseSlotReservation
};
