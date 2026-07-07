import crypto from 'crypto';
import PayoutRequest from '../models/PayoutRequest.js';
import WebhookLog from '../models/WebhookLog.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Wallet from '../models/Wallet.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const body = req.body; // Assuming express.json() is used

  // Verify Signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature || '');

  const isSignatureValid = expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

  if (!isSignatureValid) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  const event = body.event;
  const payload = body.payload;

  // Idempotency Check
  const eventId = req.headers['x-razorpay-event-id'];
  const existingLog = await WebhookLog.findOne({ razorpayEventId: eventId });
  if (existingLog) {
    return res.status(200).json({ message: 'Event already processed' });
  }

  try {
    const payoutPayload = payload.payout.entity;
    const payoutReqId = payoutPayload.reference_id; // we passed our internal ID here

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

          // Mark wallet freeze transaction as complete if necessary, or create success ledger
          const wallet = await Wallet.findOne({ userId: payoutReq.expertId }).session(session);
          if (wallet) {
            wallet.frozenBalance -= payoutReq.amount;
            await wallet.save({ session });
          }

        } else if (event === 'payout.failed' || event === 'payout.reversed' || event === 'payout.rejected') {
          payoutReq.status = event === 'payout.reversed' ? 'REVERSED' : 'FAILED';
          payoutReq.failureReason = payoutPayload.failure_reason;
          await payoutReq.save({ session });

          // Unfreeze funds
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

    // Log the webhook
    await WebhookLog.create({
      razorpayEventId: eventId,
      event: event,
      payload: body,
      status: 'SUCCESS'
    });

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    await WebhookLog.create({
      razorpayEventId: eventId,
      event: event,
      payload: body,
      status: 'FAILED',
      error: error.message
    }).catch(e => console.error("Could not save failed webhook log", e));

    res.status(500).json({ message: 'Internal server error processing webhook' });
  }
};
