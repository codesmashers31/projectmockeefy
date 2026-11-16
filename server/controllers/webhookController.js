import crypto from 'crypto';
import PayoutRequest from '../models/PayoutRequest.js';
import WebhookLog from '../models/WebhookLog.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Wallet from '../models/Wallet.js';
import PaymentRecord from '../models/PaymentRecord.js';
import { creditWallet } from '../services/walletService.js';
import { getRazorpayClient } from '../services/refundService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export const razorpayWebhook = async (req, res) => {
  // Security Requirement: Fail-closed if webhook secret is missing or empty
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    console.error('[RazorpayWebhook] FATAL: RAZORPAY_WEBHOOK_SECRET is not configured. Rejecting webhook fail-closed.');
    return res.status(500).json({ message: 'Server configuration error: Webhook secret not configured' });
  }

  // Security Requirement: Require exact original raw request body
  if (!req.rawBody || !Buffer.isBuffer(req.rawBody) || req.rawBody.length === 0) {
    console.error('[RazorpayWebhook] FATAL: Original raw request buffer missing. Rejecting webhook fail-closed.');
    return res.status(400).json({ message: 'Webhook signature verification requires raw request buffer' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).json({ message: 'Missing x-razorpay-signature header' });
  }

  // Verify HMAC using timing-safe comparison
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  const isSignatureValid = expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

  if (!isSignatureValid) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  const body = req.body;
  const event = body.event;
  const payload = body.payload;

  // Idempotency Check
  const eventId = req.headers['x-razorpay-event-id'] || body.id;
  if (eventId) {
    const existingLog = await WebhookLog.findOne({ razorpayEventId: eventId });
    if (existingLog) {
      return res.status(200).json({ message: 'Event already processed' });
    }
  }

  try {
    // 1. Payout Webhooks
    if (payload?.payout?.entity) {
      const payoutPayload = payload.payout.entity;
      const payoutReqId = payoutPayload.reference_id;

      const payoutReq = await PayoutRequest.findById(payoutReqId);
      
      if (payoutReq) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
          if (event === 'payout.processed') {
            payoutReq.status = 'COMPLETED';
            payoutReq.utrNumber = payoutPayload.utr;
            payoutReq.bankReference = payoutPayload.bank_reference;
            await payoutReq.save({ session });

            const wallet = await Wallet.findOne({ userId: payoutReq.expertId }).session(session);
            if (wallet) {
              wallet.frozenBalance -= payoutReq.amount;
              await wallet.save({ session });
            }

          } else if (event === 'payout.failed' || event === 'payout.reversed' || event === 'payout.rejected') {
            payoutReq.status = event === 'payout.reversed' ? 'REVERSED' : 'FAILED';
            payoutReq.failureReason = payoutPayload.failure_reason;
            await payoutReq.save({ session });

            const wallet = await Wallet.findOne({ userId: payoutReq.expertId }).session(session);
            if (wallet) {
              wallet.frozenBalance -= payoutReq.amount;
              wallet.availableBalance += payoutReq.amount;
              await wallet.save({ session });

              await WalletTransaction.create([{
                walletId: wallet._id,
                userId: payoutReq.expertId,
                type: 'UNFREEZE',
                amount: payoutReq.amount,
                referenceId: payoutReq._id,
                referenceModel: 'PayoutRequest',
                status: 'COMPLETED',
                description: `Refund for failed payout: ${payoutPayload.failure_reason}`,
                balanceAfter: wallet.availableBalance
              }], { session });
            }
          }
          await session.commitTransaction();
        } catch (dbError) {
          await session.abortTransaction();
          throw dbError;
        } finally {
          session.endSession();
        }
      }
    }

    // 2. Payment Captured Webhooks (Authoritative Capture Evidence)
    if (event === 'payment.captured' && payload?.payment?.entity) {
      const paymentEntity = payload.payment.entity;
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const amountINR = paymentEntity.amount / 100;

      let authoritativeCapturedAt = null;
      let timestampSource = null;

      // Rule: Use payment entity captured_at when available
      if (typeof paymentEntity.captured_at === 'number' && paymentEntity.captured_at > 0) {
        authoritativeCapturedAt = new Date(paymentEntity.captured_at * 1000);
        timestampSource = 'RAZORPAY_PAYMENT_CAPTURED_AT';
      }

      const existingRecord = await PaymentRecord.findOne({ paymentId });
      if (existingRecord) {
        const bookingCutoff = existingRecord.metadata?.bookingCutoff ? new Date(existingRecord.metadata.bookingCutoff) : null;
        
        // If captured_at was not in webhook payload, fetch payment entity from Razorpay API
        if (!authoritativeCapturedAt) {
          try {
            const razorpay = getRazorpayClient();
            const fetched = await razorpay.payments.fetch(paymentId);
            if (typeof fetched.captured_at === 'number' && fetched.captured_at > 0) {
              authoritativeCapturedAt = new Date(fetched.captured_at * 1000);
              timestampSource = 'RAZORPAY_PAYMENT_CAPTURED_AT';
            } else if (bookingCutoff && fetched.created_at && (fetched.created_at * 1000 >= bookingCutoff.getTime())) {
              authoritativeCapturedAt = new Date(fetched.created_at * 1000);
              timestampSource = 'CREATED_AFTER_CUTOFF';
            }
          } catch (fetchErr) {
            console.warn(`[Webhook] Could not fetch payment ${paymentId}: ${fetchErr.message}`);
          }
        }

        // Check webhook event timestamp:
        // A verified payment.captured event proves capture occurred no later than event timestamp.
        // If event timestamp is before cutoff, it establishes capture was before cutoff!
        const eventTime = body.created_at ? new Date(body.created_at * 1000) : null;
        if (!authoritativeCapturedAt && eventTime && bookingCutoff) {
          if (eventTime.getTime() < bookingCutoff.getTime()) {
            authoritativeCapturedAt = eventTime;
            timestampSource = 'WEBHOOK_PROVEN_BEFORE_CUTOFF';
          }
        }

        if (existingRecord.status === 'awaiting_reconciliation') {
          if (authoritativeCapturedAt && bookingCutoff) {
            if (authoritativeCapturedAt.getTime() >= bookingCutoff.getTime()) {
              // Captured at or after cutoff: credit candidate wallet
              const creditRes = await creditWallet({
                userId: existingRecord.userId,
                amount: existingRecord.amount || amountINR,
                paymentId,
                orderId,
                reason: 'CUTOFF_EXPIRED_CREDIT',
                description: `Authoritative webhook verified payment captured at or after cutoff`
              });
              existingRecord.status = 'verified';
              existingRecord.walletCredited = true;
              existingRecord.walletTransactionId = creditRes.transaction?._id;
              existingRecord.reconciliationStatus = 'reconciled';
              existingRecord.cutoffExpired = true;
              existingRecord.paymentCapturedAt = authoritativeCapturedAt;
              existingRecord.providerEventTimestamp = authoritativeCapturedAt;
              existingRecord.serverReceiptTimestamp = new Date();
              existingRecord.timestampSource = timestampSource;
              await existingRecord.save();
            } else {
              // Captured before cutoff: confirm verification
              existingRecord.status = 'verified';
              existingRecord.reconciliationStatus = 'reconciled';
              existingRecord.paymentCapturedAt = authoritativeCapturedAt;
              existingRecord.providerEventTimestamp = authoritativeCapturedAt;
              existingRecord.serverReceiptTimestamp = new Date();
              existingRecord.timestampSource = timestampSource;
              await existingRecord.save();
            }
          } else {
            console.log(`[Webhook] Payment ${paymentId} capture timing remains ambiguous. Preserving awaiting_reconciliation.`);
          }
        }
      }
    }

    // 3. Payment Authorized Webhook: Must NOT override capture decision
    if (event === 'payment.authorized' && payload?.payment?.entity) {
      const paymentId = payload.payment.entity.id;
      const existingRecord = await PaymentRecord.findOne({ paymentId });
      if (existingRecord && (existingRecord.status === 'verified' || existingRecord.walletCredited)) {
        console.log(`[Webhook] payment.authorized arrived after capture decision for ${paymentId}. Preserving capture status.`);
      }
    }

    // Log the webhook
    await WebhookLog.create({
      razorpayEventId: eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      event: event,
      payload: body,
      status: 'SUCCESS'
    });

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    if (eventId) {
      await WebhookLog.create({
        razorpayEventId: eventId,
        event: event,
        payload: body,
        status: 'FAILED',
        error: error.message
      }).catch(e => console.error("Could not save failed webhook log", e));
    }

    res.status(500).json({ message: 'Internal server error processing webhook' });
  }
};
