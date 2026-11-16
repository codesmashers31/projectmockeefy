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
  const slotKey = buildSlotKey(expertId, start, end);
  const reservedUntil = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  // 1. Check if a non-cancelled session already exists for this slot
  const existingSession = await Session.findOne({
    $or: [
      { slotLockKey: slotKey, status: { $nin: ['cancelled'] } },
      {
        expertId: expertId?._id || expertId,
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
  const activeReservation = await SlotReservation.findOne({
    slotKey,
    status: 'reserved',
    reservedUntil: { $gt: now },
    candidateId: { $ne: candidateId }
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
    { slotKey, candidateId },
    {
      $set: {
        expertId: expertId?._id || expertId,
        candidateId,
        startTime: start,
        endTime: end,
        slotKey,
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
    slotKey,
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
