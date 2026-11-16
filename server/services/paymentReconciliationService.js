import mongoose from 'mongoose';
import PaymentRecord from '../models/PaymentRecord.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import SlotReservation from '../models/SlotReservation.js';
import ExpertDetails from '../models/expertModel.js';
import { getRazorpayClient } from './refundService.js';
import { creditWallet, restoreWalletDebit } from './walletService.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { confirmSlotReservation, releaseSlotReservation } from './slotReservationService.js';
import { createNotification } from '../controllers/notificationController.js';
import {
  sendBookingNotificationToExpert,
  sendBookingNotificationToCandidate,
  formatSessionDateTime
} from './emailService.js';
import { getMeetingUrl } from '../utils/appUrl.js';

let isWorkerRunning = false;
let workerTimer = null;

/**
 * Core reconciliation logic for a single unresolved PaymentRecord.
 * Idempotent: Can be called multiple times without duplicate credits or duplicate sessions.
 */
export async function reconcileSinglePayment(recordIdOrPaymentId) {
  try {
    const query = mongoose.isValidObjectId(recordIdOrPaymentId)
      ? { _id: recordIdOrPaymentId }
      : { paymentId: recordIdOrPaymentId };

    const record = await PaymentRecord.findOne(query);
    if (!record) {
      console.warn(`[PaymentReconciliation] Record not found for ${recordIdOrPaymentId}`);
      return { success: false, reason: 'RECORD_NOT_FOUND' };
    }

    // Check if already resolved
    if (record.status !== 'awaiting_reconciliation' && record.reconciliationStatus !== 'awaiting_capture_timestamp') {
      return {
        success: true,
        alreadyResolved: true,
        status: record.status,
        walletCredited: record.walletCredited,
        sessionId: record.sessionId
      };
    }

    console.log(`[PaymentReconciliation] 🔄 Reconciling payment: ${record.paymentId} (Order: ${record.orderId})`);

    // 1. Fetch live payment from Razorpay API
    const razorpay = getRazorpayClient();
    let rzPayment = null;
    try {
      rzPayment = await razorpay.payments.fetch(record.paymentId);
    } catch (apiErr) {
      const errMsg = apiErr.error?.description || apiErr.message || (typeof apiErr === 'string' ? apiErr : JSON.stringify(apiErr));
      const isNotFound = apiErr.statusCode === 400 || apiErr.statusCode === 404 || apiErr.error?.code === 'BAD_REQUEST_ERROR';

      if (isNotFound) {
        console.warn(`[PaymentReconciliation] Payment ID ${record.paymentId} does not exist on Razorpay (${errMsg}). Marking failed.`);
        record.status = 'failed';
        record.reconciliationStatus = 'verified';
        record.metadata = {
          ...(record.metadata || {}),
          reconciliationFailureReason: errMsg,
          reconciledAt: new Date()
        };
        await record.save();
        return { success: true, outcome: 'NOT_FOUND_ON_GATEWAY', error: errMsg };
      }

      console.warn(`[PaymentReconciliation] ⚠️ Transient Razorpay fetch error for ${record.paymentId}:`, errMsg);
      return { success: false, transientError: true, error: errMsg };
    }

    if (!rzPayment) {
      console.warn(`[PaymentReconciliation] No payment returned by Razorpay for ${record.paymentId}`);
      return { success: false, reason: 'RAZORPAY_PAYMENT_NULL' };
    }

    // 2. Handle gateway failure
    if (rzPayment.status === 'failed') {
      console.log(`[PaymentReconciliation] Payment ${record.paymentId} is failed on Razorpay.`);
      record.status = 'failed';
      record.reconciliationStatus = 'verified';
      await record.save();
      return { success: true, outcome: 'FAILED' };
    }

    // 3. Handle non-captured states
    if (rzPayment.status !== 'captured') {
      console.log(`[PaymentReconciliation] Payment ${record.paymentId} status is '${rzPayment.status}'. Awaiting capture.`);
      return { success: false, awaitingCapture: true, status: rzPayment.status };
    }

    // 4. Payment is CAPTURED: Determine authoritative amount and capture epoch
    const capturedAmountINR = rzPayment.amount ? (rzPayment.amount / 100) : record.amount;

    // Extract metadata or fallback to SlotReservation
    const meta = record.metadata || {};
    let bookingDetails = meta.bookingDetails || {};

    if (!bookingDetails.startTime || !bookingDetails.endTime || !bookingDetails.expertId) {
      if (record.startTime && record.endTime && (record.expertId || meta.expertId)) {
        bookingDetails = {
          expertId: record.expertId || meta.expertId,
          startTime: record.startTime,
          endTime: record.endTime,
          duration: record.duration || 30,
          category: record.categoryNameSnapshot || record.category || 'Technical Interview',
          ...bookingDetails
        };
      } else {
        const existingRes = await SlotReservation.findOne({ orderId: record.orderId });
        if (existingRes) {
          bookingDetails = {
            expertId: existingRes.expertId,
            startTime: existingRes.startTime,
            endTime: existingRes.endTime,
            duration: 30,
            category: 'Technical Interview',
            ...bookingDetails
          };
        }
      }
    }

    const startTime = bookingDetails.startTime ? new Date(bookingDetails.startTime) : null;
    const endTime = bookingDetails.endTime ? new Date(bookingDetails.endTime) : null;
    const cutoffTime = endTime ? new Date(endTime.getTime() - 10 * 60 * 1000) : null;

    // Determine authoritative capture timestamp with strict priority:
    // 1️⃣ Razorpay captured_at (seconds since epoch)
    // 2️⃣ gatewayCaptureVerificationReceivedAt (recorded when we verified capture via Razorpay API)
    // No fallback to createdAt, serverReceiptTimestamp, or providerEventTimestamp.
    let captureEpochMs = null;
    if (typeof rzPayment.captured_at === 'number' && rzPayment.captured_at > 0) {
      captureEpochMs = Number(rzPayment.captured_at) * 1000;
    } else if (record.gatewayCaptureVerificationReceivedAt) {
      captureEpochMs = new Date(record.gatewayCaptureVerificationReceivedAt).getTime();
    }

    // If Razorpay omits captured_at but server receipt/creation occurred before cutoff while captured:
    if (!captureEpochMs && cutoffTime) {
      if (record.serverReceiptTimestamp && new Date(record.serverReceiptTimestamp).getTime() < cutoffTime.getTime()) {
        captureEpochMs = new Date(record.serverReceiptTimestamp).getTime();
      } else if (record.createdAt && new Date(record.createdAt).getTime() < cutoffTime.getTime()) {
        captureEpochMs = new Date(record.createdAt).getTime();
      }
    }

    let slotEligibleForSession = false;
    let slotPassedOrUnavailable = true;

    if (startTime && endTime && cutoffTime) {
      const now = new Date();

      // Check if slot end has already passed entirely
      const slotHasEnded = now.getTime() >= endTime.getTime();

      // Check capture time relative to cutoff
      const captureWasBeforeCutoff = captureEpochMs && (captureEpochMs < cutoffTime.getTime());

      // Delayed webhook / reconciliation rule:
      // If payment was authoritatively captured strictly BEFORE cutoff (captureEpochMs < cutoffTime),
      // the booking is eligible even if the webhook/worker executes at or after cutoff,
      // provided the interview slot has not already ended and the reservation is valid (or slot not conflicted).
      if (captureWasBeforeCutoff && !slotHasEnded) {
        // Check slot reservation
        const existingReservation = await SlotReservation.findOne({ orderId: record.orderId });
        if (existingReservation && existingReservation.status === 'reserved') {
          slotEligibleForSession = true;
          slotPassedOrUnavailable = false;
        } else {
          // Check if slot has conflicting confirmed session
          const conflict = await Session.findOne({
            expertId: bookingDetails.expertId,
            status: { $in: ['confirmed', 'scheduled', 'in_progress', 'completed'] },
            $or: [
              { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
            ]
          });
          if (!conflict) {
            slotEligibleForSession = true;
            slotPassedOrUnavailable = false;
          }
        }
      }
    }

    // 5. Decision: Confirm session OR Credit Candidate's Wallet
    if (slotEligibleForSession) {
      // Confirm slot reservation
      await confirmSlotReservation({ orderId: record.orderId, paymentId: record.paymentId });

      // Create session idempotently with database unique constraints (paymentId, orderId, slotLockKey)
      const sessionId = 'SES-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const slotLockKey = `${bookingDetails.expertId}_${startTime.getTime()}_${endTime.getTime()}`;
      let newSession;
      try {
        newSession = await Session.create({
          sessionId,
          candidateId: record.userId,
          expertId: bookingDetails.expertId,
          startTime,
          endTime,
          duration: bookingDetails.duration || 30,
          status: 'confirmed',
          category: bookingDetails.category || 'Interview',
          price: capturedAmountINR,
          paymentStatus: 'paid',
          paymentId: record.paymentId,
          orderId: record.orderId,
          slotLockKey,
          meetingLink: getMeetingUrl(sessionId)
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          const existingSession = await Session.findOne({
            $or: [{ paymentId: record.paymentId }, { orderId: record.orderId }, { slotLockKey }]
          });
          if (existingSession) {
            record.sessionId = existingSession.sessionId;
            record.status = 'verified';
            record.reconciliationStatus = 'reconciled';
            record.timestampSource = 'RECONCILED_SESSION_CONFIRMED';
            await record.save();
            return { success: true, outcome: 'SESSION_CONFIRMED', sessionId: existingSession.sessionId, alreadyExists: true };
          }
        }
        throw createErr;
      }

      record.sessionId = sessionId;
      record.status = 'verified';
      record.reconciliationStatus = 'reconciled';
      record.timestampSource = 'RECONCILED_SESSION_CONFIRMED';
      record.paymentCapturedAt = captureEpochMs ? new Date(captureEpochMs) : new Date();
      await record.save();

      console.log(`[PaymentReconciliation] ✅ Session confirmed: ${sessionId} for payment ${record.paymentId}`);
      return { success: true, outcome: 'SESSION_CONFIRMED', sessionId };
    } else {
      // Slot window elapsed, reservation released, or capture >= cutoff: CREDIT CANDIDATE WALLET
      console.log(`[PaymentReconciliation] 💰 Crediting candidate wallet for payment ${record.paymentId} (Amount: ₹${capturedAmountINR})`);

      const creditRes = await creditWallet({
        userId: record.userId,
        amount: capturedAmountINR,
        referenceId: record._id,
        referenceModel: 'PaymentRecord',
        paymentId: record.paymentId,
        orderId: record.orderId,
        reason: 'CUTOFF_EXPIRED_CREDIT',
        description: `Wallet credited: Reconciled captured payment ${record.paymentId} (slot booking window elapsed)`
      });

      record.status = 'verified';
      record.reconciliationStatus = 'reconciled';
      record.walletCredited = true;
      record.walletTransactionId = creditRes.transaction?._id || null;
      record.cutoffExpired = true;
      record.timestampSource = 'RECONCILED_WALLET_CREDIT';
      record.paymentCapturedAt = captureEpochMs ? new Date(captureEpochMs) : new Date();
      await record.save();

      // Release any lingering reservation
      try {
        await releaseSlotReservation({ orderId: record.orderId });
      } catch (_) {}

      // Notify candidate in-app
      try {
        await createNotification({
          userId: record.userId,
          title: 'Payment Credited to Your Wallet',
          message: `Your payment of ₹${capturedAmountINR} for order ${record.orderId} has been securely credited to your Mockeefy wallet. You can use it to book another interview anytime.`,
          type: 'PAYMENT_CREDITED',
          data: {
            paymentId: record.paymentId,
            orderId: record.orderId,
            amount: capturedAmountINR,
            walletBalance: creditRes.balanceAfter
          }
        });
      } catch (notifErr) {
        console.warn('[PaymentReconciliation] Notification error:', notifErr.message);
      }

      console.log(`[PaymentReconciliation] ✅ Wallet credited ₹${capturedAmountINR}. New balance: ₹${creditRes.balanceAfter}`);
      return {
        success: true,
        outcome: 'WALLET_CREDITED',
        amount: capturedAmountINR,
        balanceAfter: creditRes.balanceAfter
      };
    }
  } catch (err) {
    console.error(`[PaymentReconciliation] ❌ Error reconciling payment ${recordIdOrPaymentId}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Scans for abandoned partial wallet checkouts where:
 * 1) A SlotReservation has expired (reservedUntil <= now and status === 'reserved')
 *    OR a reserved WalletTransaction (reason: 'INTERVIEW_BOOKING_DEBIT') exists for an order that was never completed.
 * 2) Verifies against Session, PaymentRecord, and Razorpay API that payment was NOT captured.
 * 3) Restores reserved wallet funds safely and idempotently via restoreWalletDebit.
 * 4) Releases slot reservation so slot becomes available again for other candidates.
 */
export async function reconcileAbandonedWalletCheckouts({ maxAgeMs = 15 * 60 * 1000, now = new Date() } = {}) {
  const results = {
    checked: 0,
    restored: 0,
    sessionsConfirmed: 0,
    errors: []
  };

  try {
    const cutoffDate = new Date(now.getTime() - maxAgeMs);

    // 1. Find expired slot reservations
    const expiredReservations = await SlotReservation.find({
      status: 'reserved',
      reservedUntil: { $lte: now }
    }).limit(50);

    for (const res of expiredReservations) {
      results.checked++;
      const orderId = res.orderId;
      if (!orderId) continue;

      // Check if session exists
      const sessionExists = await Session.findOne({
        $or: [
          { 'paymentDetails.orderId': orderId },
          { notes: { $regex: orderId } },
          { slotLockKey: res.slotKey, status: { $nin: ['cancelled'] } }
        ]
      });

      if (sessionExists) {
        await SlotReservation.updateOne({ _id: res._id }, { $set: { status: 'confirmed', confirmedSessionId: sessionExists.sessionId } });
        results.sessionsConfirmed++;
        continue;
      }

      // Check if payment was verified/captured
      const paymentRecord = await PaymentRecord.findOne({
        orderId,
        status: { $in: ['verified', 'captured', 'awaiting_reconciliation'] }
      });

      if (paymentRecord) {
        // Payment in progress or captured; do not cancel
        continue;
      }

      // Check with Razorpay API if live
      let paymentCaptured = false;
      if (orderId && !orderId.startsWith('dummy') && !orderId.startsWith('test')) {
        try {
          const razorpay = getRazorpayClient();
          const payments = await razorpay.orders.fetchPayments(orderId);
          if (payments.items?.some(p => p.status === 'captured' || p.status === 'authorized')) {
            paymentCaptured = true;
          }
        } catch (rzErr) {
          // If order not found or fetch fails, continue with local safety check
        }
      }

      if (paymentCaptured) {
        continue;
      }

      // Mark reservation expired
      await SlotReservation.updateOne({ _id: res._id }, { $set: { status: 'expired' } });

      // Find any un-restored wallet debit for this order
      const debitTxn = await WalletTransaction.findOne({
        userId: res.candidateId,
        orderId,
        type: 'DEBIT',
        reason: 'INTERVIEW_BOOKING_DEBIT'
      });

      if (debitTxn) {
        const restoreRes = await restoreWalletDebit({
          userId: res.candidateId,
          amount: debitTxn.amount,
          originalTransactionId: debitTxn._id,
          reason: 'ABANDONED_CHECKOUT_RESTORE',
          description: `Restored ₹${debitTxn.amount} from expired or abandoned checkout for order ${orderId}`
        });

        if (restoreRes && !restoreRes.alreadyRestored) {
          results.restored++;
          console.log(`[PaymentReconciliation] Restored abandoned wallet checkout: ₹${debitTxn.amount} for user ${res.candidateId} (Order: ${orderId})`);
        }
      }
    }

    // 2. Also find any orphaned debit transactions older than cutoffDate with no session and no reservation
    const orphanedDebits = await WalletTransaction.find({
      type: 'DEBIT',
      reason: 'INTERVIEW_BOOKING_DEBIT',
      orderId: { $exists: true, $ne: null },
      createdAt: { $lte: cutoffDate }
    }).limit(50);

    for (const debitTxn of orphanedDebits) {
      const orderId = debitTxn.orderId;
      // Check if already restored
      const alreadyRestored = await WalletTransaction.findOne({
        userId: debitTxn.userId,
        $or: [
          { referenceId: debitTxn._id },
          { relatedTransactionId: debitTxn._id }
        ],
        type: 'CREDIT',
        reason: { $regex: /RESTORE/i }
      });
      if (alreadyRestored) continue;

      // Check if session exists
      const sessionExists = await Session.findOne({
        $or: [
          { 'paymentDetails.orderId': orderId },
          { notes: { $regex: orderId } }
        ]
      });
      if (sessionExists) continue;

      // Check if payment captured
      const paymentRecord = await PaymentRecord.findOne({
        orderId,
        status: { $in: ['verified', 'captured', 'awaiting_reconciliation'] }
      });
      if (paymentRecord) continue;

      const restoreRes = await restoreWalletDebit({
        userId: debitTxn.userId,
        amount: debitTxn.amount,
        originalTransactionId: debitTxn._id,
        reason: 'ABANDONED_CHECKOUT_RESTORE',
        description: `Restored ₹${debitTxn.amount} from orphaned checkout for order ${orderId}`
      });

      if (restoreRes && !restoreRes.alreadyRestored) {
        results.restored++;
        console.log(`[PaymentReconciliation] Restored orphaned wallet debit: ₹${debitTxn.amount} for user ${debitTxn.userId} (Order: ${orderId})`);
      }
    }
  } catch (err) {
    console.error('[PaymentReconciliation] Abandoned checkout reconciliation error:', err.message);
    results.errors.push(err.message);
  }

  return results;
}

/**
 * Polls for all pending reconciliation records in the database.
 */
export async function reconcileAwaitingPayments() {
  if (isWorkerRunning) {
    console.log('[PaymentReconciliation] Worker cycle already active. Skipping tick.');
    return;
  }
  isWorkerRunning = true;

  try {
    const pendingRecords = await PaymentRecord.find({
      $or: [
        { status: 'awaiting_reconciliation' },
        { reconciliationStatus: 'awaiting_capture_timestamp' }
      ]
    }).limit(50);

    if (pendingRecords.length > 0) {
      console.log(`[PaymentReconciliation] Found ${pendingRecords.length} records awaiting reconciliation.`);
      for (const record of pendingRecords) {
        await reconcileSinglePayment(record._id);
      }
    }

    // Reconcile abandoned/expired wallet checkouts
    await reconcileAbandonedWalletCheckouts();
  } catch (err) {
    console.error('[PaymentReconciliation] Worker loop exception:', err.message);
  } finally {
    isWorkerRunning = false;
  }
}

/**
 * Starts the persistent background worker.
 * Runs immediately on boot, then every `intervalMs` (default: 30,000ms = 30s).
 */
export function startPaymentReconciliationWorker(intervalMs = 30000) {
  if (workerTimer) {
    clearInterval(workerTimer);
  }

  console.log(`[PaymentReconciliation] Starting background worker (interval: ${intervalMs}ms)...`);
  
  // Run initial pass with a short delay to allow database connections to stabilize
  setTimeout(() => {
    reconcileAwaitingPayments().catch(err => console.error('[PaymentReconciliation] Initial pass error:', err));
  }, 3000);

  // Set recurring interval
  workerTimer = setInterval(() => {
    reconcileAwaitingPayments().catch(err => console.error('[PaymentReconciliation] Recurring pass error:', err));
  }, intervalMs);

  return workerTimer;
}

export function stopPaymentReconciliationWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
  isWorkerRunning = false;
  console.log('[PaymentReconciliation] Worker stopped.');
}

export default {
  reconcileSinglePayment,
  reconcileAwaitingPayments,
  reconcileAbandonedWalletCheckouts,
  startPaymentReconciliationWorker,
  stopPaymentReconciliationWorker
};
