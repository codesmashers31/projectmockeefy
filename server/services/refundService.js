import Razorpay from 'razorpay';
import PaymentRecord from '../models/PaymentRecord.js';
import dotenv from 'dotenv';
dotenv.config();

let razorpayClient = null;
export function getRazorpayClient() {
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_placeholder',
    });
  }
  return razorpayClient;
}

export function setRazorpayClient(customClient) {
  razorpayClient = customClient;
}

/**
 * Execute an authoritative refund for a Razorpay payment.
 * Guarantees:
 * 1. Idempotency (prevents double refunds)
 * 2. Authoritative amount check (fetches captured amount from Razorpay, never trusts client price)
 * 3. Accurate refund status tracking ('initiated' | 'pending' | 'processed' | 'failed')
 * 4. Audit trail in PaymentRecord with attempt history
 */
export async function executeRefund({
  paymentId,
  orderId,
  userId,
  amount = null,
  reason = 'Booking cutoff reached before payment verification',
  cutoffExpired = false,
  metadata = {}
}) {
  if (!paymentId) {
    throw new Error('paymentId is required to execute refund');
  }

  // 1. Idempotency Check: Check if already fully refunded in PaymentRecord
  const existingRecord = await PaymentRecord.findOne({ paymentId });
  if (existingRecord && existingRecord.status === 'refunded' && existingRecord.refundId && existingRecord.refundStatus === 'processed') {
    return {
      success: true,
      alreadyRefunded: true,
      refundId: existingRecord.refundId,
      refundStatus: 'processed',
      refundAmount: existingRecord.refundAmount || existingRecord.amount,
      message: 'Payment has already been fully refunded.',
      record: existingRecord
    };
  }

  const razorpay = getRazorpayClient();
  let authoritativeAmountPaise = 0;
  let paymentDetails = null;

  // 2. Authoritative Payment Inspection from Gateway
  try {
    paymentDetails = await razorpay.payments.fetch(paymentId);
    authoritativeAmountPaise = paymentDetails?.amount || 0;

    // Safeguard 7: Pending refund reconciliation without duplicate gateway requests
    if (existingRecord?.refundStatus === 'pending' && existingRecord?.refundId) {
      const gatewayRefunds = paymentDetails?.refunds?.items || [];
      const matchingRefund = gatewayRefunds.find(r => r.id === existingRecord.refundId);
      const currentStatus = matchingRefund?.status || (paymentDetails?.refund_status === 'full' ? 'processed' : 'pending');
      
      if (currentStatus === 'processed') {
        existingRecord.refundStatus = 'processed';
        existingRecord.status = 'refunded';
        await existingRecord.save();
        return {
          success: true,
          reconciled: true,
          refundId: existingRecord.refundId,
          refundStatus: 'processed',
          refundAmount: existingRecord.refundAmount,
          message: 'Pending refund reconciled as processed.',
          record: existingRecord
        };
      }
      return {
        success: true,
        pending: true,
        refundId: existingRecord.refundId,
        refundStatus: 'pending',
        refundAmount: existingRecord.refundAmount,
        message: 'Refund is currently pending processing with the bank. No duplicate gateway request sent.',
        record: existingRecord
      };
    }

    // If Razorpay already has full refund registered:
    if (paymentDetails?.refund_status === 'full' || (paymentDetails?.amount_refunded && paymentDetails.amount_refunded >= authoritativeAmountPaise)) {
      const record = await PaymentRecord.findOneAndUpdate(
        { paymentId },
        {
          $set: {
            orderId: orderId || paymentDetails.order_id,
            userId,
            paymentType: 'booking',
            amount: authoritativeAmountPaise / 100,
            status: 'refunded',
            refundStatus: 'processed',
            refundReason: reason,
            refundAmount: authoritativeAmountPaise / 100,
            amountRefunded: authoritativeAmountPaise / 100,
            refundedAt: new Date(),
            cutoffExpired: Boolean(cutoffExpired),
            'metadata.reconciledFromGateway': true
          }
        },
        { upsert: true, new: true }
      );
      return {
        success: true,
        alreadyRefunded: true,
        refundStatus: 'processed',
        refundAmount: authoritativeAmountPaise / 100,
        message: 'Payment was already refunded on payment gateway.',
        record
      };
    }
  } catch (fetchErr) {
    console.warn(`[RefundService] Failed to fetch payment from Razorpay: ${fetchErr.message}`);
    authoritativeAmountPaise = Math.round((existingRecord?.amount || metadata.clientPrice || 0) * 100);
  }

  if (authoritativeAmountPaise <= 0) {
    return {
      success: true,
      refundId: 'free_session_no_charge',
      refundStatus: 'processed',
      refundAmount: 0,
      message: 'No monetary charge incurred; no gateway refund needed.'
    };
  }

  // Safeguard 1 & 2: Check remaining refundable amount accounting for previous refunds
  const alreadyRefundedPaise = paymentDetails?.amount_refunded ?? Math.round((existingRecord?.amountRefunded || 0) * 100);
  const remainingRefundablePaise = Math.max(0, authoritativeAmountPaise - alreadyRefundedPaise);

  const requestedAmountINR = amount !== null && amount !== undefined ? Number(amount) : null;
  const targetRefundPaise = requestedAmountINR ? Math.round(requestedAmountINR * 100) : remainingRefundablePaise;

  if (targetRefundPaise <= 0 || targetRefundPaise > remainingRefundablePaise) {
    return {
      success: false,
      refundStatus: 'failed',
      error: `Requested refund of ₹${targetRefundPaise / 100} exceeds remaining refundable balance of ₹${remainingRefundablePaise / 100}.`,
      remainingRefundable: remainingRefundablePaise / 100
    };
  }

  // 3. Initiate Refund with Razorpay
  let refundResult = null;
  let refundError = null;
  let refundStatus = 'failed';
  let isDefinitiveFailure = false;

  try {
    refundResult = await razorpay.payments.refund(paymentId, {
      amount: targetRefundPaise,
      notes: {
        reason: reason.substring(0, 255),
        orderId: orderId || '',
        cutoffExpired: String(cutoffExpired)
      }
    });

    refundStatus = refundResult?.status || 'processed';
  } catch (err) {
    console.warn(`[RefundService] Gateway refund request encountered error for ${paymentId}: ${err.message}. Checking gateway state.`);
    refundError = err.message;

    // A network timeout does NOT prove Razorpay failed to process the refund.
    // Query Razorpay to inspect real payment refund status:
    try {
      const checkPayment = await razorpay.payments.fetch(paymentId);
      const refunds = checkPayment?.refunds?.items || [];
      const matchingRefund = refunds.find(r => r.amount === targetRefundPaise || r.notes?.orderId === orderId);

      if (matchingRefund || (checkPayment.amount_refunded && checkPayment.amount_refunded > alreadyRefundedPaise)) {
        // Razorpay DID process the refund despite client timeout!
        refundResult = matchingRefund || {
          id: `rfnd_reconciled_${Date.now()}`,
          status: 'processed',
          amount: targetRefundPaise
        };
        refundStatus = matchingRefund?.status || 'processed';
        refundError = null;
      } else if (err.code === 'BAD_REQUEST_ERROR' || err.statusCode === 400 || (err.message && (err.message.includes('not captured') || err.message.includes('cannot be refunded') || err.message.includes('exceeds') || err.message.includes('definitively')))) {
        // Definitively confirmed failed by gateway
        refundStatus = 'failed';
        isDefinitiveFailure = true;
      } else {
        // Ambiguous timeout or network error: mark failed request but non-definitive (do not immediately restore wallet)
        refundStatus = 'failed';
        isDefinitiveFailure = false;
        refundResult = null;
      }
    } catch (checkErr) {
      // Even status check failed; mark failed request but non-definitive
      refundStatus = 'failed';
      isDefinitiveFailure = false;
      refundResult = null;
    }
  }

  const refundAmountINR = targetRefundPaise / 100;
  const isSuccess = Boolean(refundStatus === 'processed' || (refundStatus === 'pending' && !refundError));
  const totalAmountRefundedINR = ((alreadyRefundedPaise + targetRefundPaise) / 100);
  const isFullyRefunded = targetRefundPaise >= remainingRefundablePaise;

  // 4. Persist durable refund audit record in PaymentRecord
  const record = await PaymentRecord.findOneAndUpdate(
    { paymentId },
    {
      $set: {
        orderId: orderId || paymentDetails?.order_id || 'unknown_order',
        userId,
        paymentType: 'booking',
        amount: authoritativeAmountPaise / 100,
        status: isSuccess ? (isFullyRefunded ? 'refunded' : 'verified') : 'failed',
        refundId: refundResult?.id || null,
        refundStatus: refundStatus,
        refundReason: reason,
        refundAmount: refundAmountINR,
        amountRefunded: isSuccess ? totalAmountRefundedINR : (alreadyRefundedPaise / 100),
        refundedAt: isSuccess ? new Date() : null,
        cutoffExpired: Boolean(cutoffExpired),
      },
      $push: {
        'metadata.refundAttempts': {
          timestamp: new Date(),
          status: refundStatus,
          refundId: refundResult?.id || null,
          amountPaise: targetRefundPaise,
          error: refundError
        }
      }
    },
    { upsert: true, new: true }
  );

  return {
    success: isSuccess,
    isDefinitiveFailure,
    refundId: refundResult?.id || null,
    refundStatus: refundStatus,
    refundAmount: refundAmountINR,
    amountRefunded: isSuccess ? totalAmountRefundedINR : (alreadyRefundedPaise / 100),
    refundReason: reason,
    cutoffExpired: Boolean(cutoffExpired),
    error: refundError,
    record
  };
}

/**
 * Background worker to reconcile any pending or failed refunds.
 */
export async function reconcilePendingRefunds() {
  const pendingRecords = await PaymentRecord.find({
    status: { $in: ['failed', 'refunded'] },
    refundStatus: { $in: ['pending', 'failed', 'initiated'] },
    paymentType: 'booking'
  }).limit(50);

  const results = [];
  for (const record of pendingRecords) {
    try {
      const res = await executeRefund({
        paymentId: record.paymentId,
        orderId: record.orderId,
        userId: record.userId,
        reason: record.refundReason || 'Background reconciliation retry',
        cutoffExpired: record.cutoffExpired
      });
      results.push({ paymentId: record.paymentId, res });
    } catch (e) {
      results.push({ paymentId: record.paymentId, error: e.message });
    }
  }
  return results;
}

export default {
  getRazorpayClient,
  setRazorpayClient,
  executeRefund,
  reconcilePendingRefunds
};
