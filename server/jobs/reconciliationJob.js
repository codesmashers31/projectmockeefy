import cron from 'node-cron';
import PayoutRequest from '../models/PayoutRequest.js';
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import mongoose from 'mongoose';

// Run every 24 hours at midnight
export const initReconciliationJob = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Starting Razorpay reconciliation job...');
        
        try {
            // Find payouts stuck in PROCESSING for more than 24 hours
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const stuckPayouts = await PayoutRequest.find({
                status: 'PROCESSING',
                createdAt: { $lt: yesterday }
            });

            if (stuckPayouts.length === 0) {
                console.log('[Cron] No stuck payouts found.');
                return;
            }

            console.log(`[Cron] Found ${stuckPayouts.length} stuck payouts. Reversing to protect expert wallets.`);

            for (const payout of stuckPayouts) {
                const session = await mongoose.startSession();
                session.startTransaction();

                try {
                    // Mark as reversed
                    payout.status = 'REVERSED';
                    payout.failureReason = 'Reconciled: Timeout after 24 hours';
                    await payout.save({ session });

                    // Refund the wallet
                    const wallet = await Wallet.findOne({ userId: payout.expertId }).session(session);
                    if (wallet) {
                        wallet.frozenBalance -= payout.amount;
                        wallet.availableBalance += payout.amount;
                        await wallet.save({ session });

                        // Log the refund
                        await WalletTransaction.create([{
                            walletId: wallet._id,
                            userId: payout.expertId,
                            type: 'UNFREEZE',
                            amount: payout.amount,
                            referenceId: payout._id,
                            referenceModel: 'PayoutRequest',
                            status: 'COMPLETED',
                            description: 'Automatic refund for timed out Razorpay payout',
                            balanceAfter: wallet.availableBalance
                        }], { session });
                    }

                    await session.commitTransaction();
                    console.log(`[Cron] Successfully reconciled payout ${payout._id}`);
                } catch (err) {
                    await session.abortTransaction();
                    console.error(`[Cron] Failed to reconcile payout ${payout._id}`, err);
                } finally {
                    session.endSession();
                }
            }

        } catch (error) {
            console.error('[Cron] Error during reconciliation job:', error);
        }
    });
};
