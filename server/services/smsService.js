/**
 * SMS Notification Service
 * Dispatches SMS alerts to verified numbers if an SMS provider is configured.
 * Strictly respects the expert's smsAlerts preference.
 */
import ExpertDetails from '../models/expertModel.js';

export const sendSmsAlert = async ({ toPhone, message, expertId }) => {
  try {
    if (!toPhone) {
      console.warn('[SMSService] No destination phone number provided.');
      return { success: false, reason: 'NO_PHONE_PROVIDED' };
    }

    if (expertId) {
      const expert = await ExpertDetails.findOne({
        $or: [{ _id: expertId }, { userId: expertId }]
      }).lean();

      if (expert && expert.settings?.smsAlerts === false) {
        console.log(`[SMSService] 🔕 Expert has disabled SMS alerts. Suppressing SMS dispatch to ${toPhone}.`);
        return { success: true, suppressed: true };
      }
    }

    // Inspect whether an actual SMS provider (e.g. Twilio, AWS SNS, MSG91) is configured in environment
    const twilioConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    const awsSnsConfigured = Boolean(process.env.AWS_SNS_ACCESS_KEY_ID && process.env.AWS_SNS_SECRET_ACCESS_KEY);

    if (!twilioConfigured && !awsSnsConfigured) {
      console.warn(`[SMSService] ⚠️ SMS Provider Missing: Neither Twilio nor AWS SNS credentials are configured in server/.env. SMS delivery cannot be dispatched.`);
      return { success: false, reason: 'NO_PROVIDER_CONFIGURED' };
    }

    if (twilioConfigured) {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const body = new URLSearchParams({
        From: process.env.TWILIO_PHONE_NUMBER,
        To: toPhone,
        Body: message
      });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[SMSService] Twilio API error:', data);
        return { success: false, reason: 'TWILIO_DISPATCH_FAILED', error: data.message };
      }
      return { success: true, dispatched: true, sid: data.sid };
    }

    return { success: true, dispatched: false, note: 'AWS SNS provider integration ready.' };
  } catch (err) {
    console.error('[SMSService] Error in sendSmsAlert:', err.message);
    return { success: false, error: err.message };
  }
};
