import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is always loaded from server/.env regardless of current working directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cleanVal = (val) => (val ? String(val).trim().replace(/^["']|["']$/g, '') : '');

/**
 * Dynamically build the transporter using current environment configuration.
 */
export const getTransporter = () => {
    const host = cleanVal(process.env.SMTP_HOST) || "smtpout.secureserver.net";
    const port = Number(cleanVal(process.env.SMTP_PORT)) || 465;
    const secure = process.env.SMTP_SECURE !== undefined
        ? cleanVal(process.env.SMTP_SECURE) === "true"
        : port === 465;
    const user = cleanVal(process.env.SMTP_USER || process.env.EMAIL_USER);
    const pass = cleanVal(process.env.SMTP_PASS || process.env.EMAIL_PASS);
    const service = cleanVal(process.env.EMAIL_SERVICE);

    const transportOptions = {
        pool: false,
        auth: {
            user,
            pass,
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
    };

    if (service) {
        transportOptions.service = service;
    } else {
        transportOptions.host = host;
        transportOptions.port = port;
        transportOptions.secure = secure;
    }

    return nodemailer.createTransport(transportOptions);
};

/**
 * Test & verify SMTP connection status
 */
export const verifyEmailConnection = async () => {
    try {
        const user = cleanVal(process.env.SMTP_USER || process.env.EMAIL_USER);
        const pass = cleanVal(process.env.SMTP_PASS || process.env.EMAIL_PASS);
        const host = cleanVal(process.env.SMTP_HOST) || "smtpout.secureserver.net";
        const port = Number(cleanVal(process.env.SMTP_PORT)) || 465;

        if (!user || !pass) {
            console.warn(`[EmailService] ⚠️ SMTP credentials missing! SMTP_USER or SMTP_PASS is empty in server/.env`);
            return { success: false, error: "Missing credentials in server/.env" };
        }

        const transporter = getTransporter();
        await transporter.verify();
        console.log(`[EmailService] ✅ SMTP Transporter verified successfully (${host}:${port} as ${user}). Ready to send emails.`);
        return { success: true };
    } catch (error) {
        console.error(`[EmailService] ⚠️ SMTP Verification Failed:`, {
            message: error.message,
            code: error.code,
            responseCode: error.responseCode,
        });
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.warn(`[EmailService] ⚠️ Authentication Failed (535): Please update SMTP_USER and SMTP_PASS in server/.env.`);
        }
        return { success: false, error: error.message, code: error.code };
    }
};

/**
 * Generic email sending function
 */
export const sendEmail = async ({ to, subject, html }, retryCount = 1) => {
    try {
        if (!to) {
            console.warn("[EmailService] No recipient email specified, skipping email send.");
            return false;
        }

        const user = cleanVal(process.env.SMTP_USER || process.env.EMAIL_USER);
        const pass = cleanVal(process.env.SMTP_PASS || process.env.EMAIL_PASS);

        if (!user || !pass) {
            console.warn(`[EmailService] ⚠️ Cannot send email to ${to}: SMTP credentials missing in server/.env.`);
            return false;
        }

        console.log(`[EmailService] Attempting to send email to: ${to} | Subject: "${subject}"`);

        const fromAddress = cleanVal(process.env.EMAIL_FROM) || user || "info@mockeefy.com";
        const mailOptions = {
            from: `"Mockeefy" <${fromAddress}>`,
            to,
            subject,
            html,
        };

        const transporter = getTransporter();
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] ✅ Email sent successfully to ${to}. MessageID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EmailService] Error sending email to ${to}:`, {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
        });

        // Retry once on transient network or timeout error
        if (retryCount > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ESOCKET' || (error.message && error.message.includes('Timeout')))) {
            console.log(`[EmailService] 🔄 Retrying email to ${to} in 1.5s... (${retryCount} retry left)`);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return sendEmail({ to, subject, html }, retryCount - 1);
        }

        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.warn(`[EmailService] ⚠️ SMTP Authentication Failed (${error.message}). Please check SMTP_USER and SMTP_PASS (or App Password) in server/.env.`);
        }
        return false;
    }
};

/**
 * Format date & time nicely in IST / user friendly format
 */
export const formatSessionDateTime = (startTime, endTime) => {
    try {
        const start = new Date(startTime);
        const end = new Date(endTime);

        const dateStr = start.toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const startTimeStr = start.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        const endTimeStr = end.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });

        return {
            dateStr,
            timeSlotStr: `${startTimeStr} - ${endTimeStr} (IST)`,
        };
    } catch (e) {
        return {
            dateStr: String(startTime),
            timeSlotStr: `${String(startTime)} - ${String(endTime)}`,
        };
    }
};

/**
 * Send Professional Email Directly to Interview Expert when a Candidate Books & Pays for a Session
 */
export const sendBookingNotificationToExpert = async ({
    expertEmail,
    expertName,
    candidateName,
    candidateEmail,
    candidatePhone,
    candidateLocation,
    startTime,
    endTime,
    date,
    timeSlot,
    duration = 30,
    topics,
    level,
    category,
    amountPaid,
    paymentStatus = "Paid & Verified",
    paymentId,
    orderId,
    notes,
    meetingLink,
    sessionId,
}) => {
    if (!expertEmail) {
        console.warn("[EmailService] No expert email provided for booking notification.");
        return false;
    }

    // Format Date & Time if not pre-formatted
    let formattedDate = date;
    let formattedTimeSlot = timeSlot;
    if (!formattedDate || !formattedTimeSlot) {
        const dt = formatSessionDateTime(startTime, endTime);
        formattedDate = formattedDate || dt.dateStr;
        formattedTimeSlot = formattedTimeSlot || dt.timeSlotStr;
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const meetingUrl = meetingLink || `${clientUrl}/live-meeting/${sessionId}`;
    const dashboardUrl = `${clientUrl}/expert/dashboard`;
    const resolvedTopics = Array.isArray(topics) ? topics.join(", ") : (topics || "Mock Interview Session");
    const safeAmount = (amountPaid !== undefined && amountPaid !== null) ? Number(amountPaid).toLocaleString("en-IN") : "0";

    const subject = `🎯 Mock Interview Booked: ${candidateName || "Candidate"} has scheduled a session with you on ${formattedDate} (${formattedTimeSlot}) | Mockeefy`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Mock Interview Booking</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 620px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0755E8 0%, #03399E 100%); padding: 36px 36px 32px 36px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <!-- Pill Badge -->
                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 20px; padding: 4px 14px; margin-bottom: 14px;">
                      <span style="color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;">MOCKEEFY • NEW BOOKING ALLOCATION</span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px; line-height: 1.25;">
                      Mock Interview Scheduled! 🎉
                    </h1>
                    <p style="color: #dbeafe; font-size: 14px; margin: 0; line-height: 1.5; font-weight: 400;">
                      A candidate has successfully booked and completed payment for an allocated mock interview with you.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px 28px 36px;">
              <!-- Greeting -->
              <p style="font-size: 15px; color: #0f172a; margin: 0 0 10px 0; font-weight: 600;">
                Hello ${expertName || "Interview Expert"},
              </p>
              <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
                A new 1-on-1 mock interview session has been booked on Mockeefy. The candidate's payment has been processed and verified. The allocated meeting slot and complete candidate details are provided below.
              </p>

              <!-- CARD 1: Scheduled Date & Slot Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0755E8;">
                      📅 Allocated Meeting Date &amp; Slot
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="38%" style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Meeting Date:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 700;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Allocated Time Slot:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0755E8; font-weight: 800;">${formattedTimeSlot}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Duration:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 600;">${duration} Minutes</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Domain / Track:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 600;">${category || "Technical Track"}</td>
                      </tr>
                      ${level ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Target Level:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 600;">${level}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Interview Goal / Topic:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 600;">${resolvedTopics}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CARD 2: Candidate / Applicant Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
                      👤 Candidate / Applicant Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="38%" style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Applicant Name:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 700;">${candidateName || "Candidate"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Email Address:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0755E8; font-weight: 600;">
                          <a href="mailto:${candidateEmail}" style="color: #0755E8; text-decoration: none;">${candidateEmail}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Contact Phone:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 600;">
                          ${candidatePhone && candidatePhone !== "Not provided" ? `<a href="tel:${candidatePhone}" style="color: #0f172a; text-decoration: none; font-weight: 600;">${candidatePhone}</a>` : "Not provided"}
                        </td>
                      </tr>
                      ${candidateLocation ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Location:</td>
                        <td style="padding: 6px 0; font-size: 13.5px; color: #0f172a; font-weight: 600;">${candidateLocation}</td>
                      </tr>
                      ` : ''}
                      ${notes ? `
                      <tr>
                        <td style="padding: 8px 0 4px 0; font-size: 13px; color: #64748b; font-weight: 600; vertical-align: top;">Applicant Notes / Goals:</td>
                        <td style="padding: 8px 0 4px 0; font-size: 13px; color: #334155; line-height: 1.5; font-style: italic; background-color: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px dashed #cbd5e1;">${notes}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CARD 3: Payment Confirmation & Receipt -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                    <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #16a34a;">
                      💳 Payment Receipt &amp; Status
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="38%" style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Payment Status:</td>
                        <td style="padding: 6px 0;">
                          <span style="display: inline-block; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                            ✓ ${paymentStatus}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Amount Paid:</td>
                        <td style="padding: 6px 0; font-size: 17px; color: #0f172a; font-weight: 800;">₹${safeAmount}</td>
                      </tr>
                      ${paymentId && paymentId !== "N/A" ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Transaction ID:</td>
                        <td style="padding: 6px 0; font-size: 12px; color: #475569; font-family: monospace;">${paymentId}</td>
                      </tr>
                      ` : ''}
                      ${orderId && orderId !== "N/A" ? `
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Order ID:</td>
                        <td style="padding: 6px 0; font-size: 12px; color: #475569; font-family: monospace;">${orderId}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Session Ref:</td>
                        <td style="padding: 6px 0; font-size: 12px; color: #475569; font-family: monospace;">${sessionId || "N/A"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${meetingUrl}" target="_blank" style="display: inline-block; background: #0755E8; color: #ffffff; padding: 13px 28px; border-radius: 12px; font-size: 13.5px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(7, 85, 232, 0.25); margin: 4px;">
                      🎥 Join Meeting Room
                    </a>
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; background: #ffffff; color: #334155; padding: 13px 24px; border-radius: 12px; font-size: 13.5px; font-weight: 700; text-decoration: none; border: 1px solid #cbd5e1; margin: 4px;">
                      📋 Open Dashboard
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <p style="font-size: 11.5px; color: #64748b; margin: 0; line-height: 1.5;">
                      Meeting URL: <a href="${meetingUrl}" target="_blank" style="color: #0755E8; text-decoration: underline; word-break: break-all;">${meetingUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expert Preparation Tips -->
              <div style="background-color: #eff6ff; border-left: 4px solid #0755E8; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="font-size: 12.5px; font-weight: 700; color: #1e3a8a; margin: 0 0 6px 0;">
                  💡 Instructions for Interview Experts:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #334155; line-height: 1.6;">
                  <li>Please join the meeting link 2 minutes before the scheduled time slot.</li>
                  <li>Review the applicant's details and notes above to customize your technical interview questions.</li>
                  <li>After the mock interview, provide your evaluation and constructive feedback on the dashboard.</li>
                </ul>
              </div>

              <p style="font-size: 13px; color: #475569; margin: 0 0 4px 0;">
                Warm regards,
              </p>
              <p style="font-size: 14px; color: #0f172a; font-weight: 700; margin: 0;">
                The Mockeefy Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 36px; text-align: center;">
              <p style="font-size: 11.5px; color: #64748b; margin: 0 0 4px 0;">
                This automated notification was generated after a completed payment on Mockeefy.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} Mockeefy Technologies Pvt. Ltd. All rights reserved. • <a href="mailto:support@mockeefy.com" style="color: #0755E8; text-decoration: none;">support@mockeefy.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return sendEmail({
        to: expertEmail,
        subject,
        html,
    });
};

/**
 * Send Booking Confirmation to the Candidate
 */
export const sendBookingNotificationToCandidate = async ({
    candidateEmail,
    candidateName,
    expertName,
    date,
    timeSlot,
    duration = 60,
    topics,
    amountPaid,
    paymentId,
    meetingLink,
    sessionId,
}) => {
    if (!candidateEmail) return false;

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const meetingUrl = meetingLink || `${clientUrl}/live-meeting/${sessionId}`;
    const sessionsUrl = `${clientUrl}/my-sessions`;
    const safeAmount = (amountPaid !== undefined && amountPaid !== null) ? Number(amountPaid).toLocaleString("en-IN") : "0";

    const subject = `🎉 Your Mock Interview with ${expertName} is Confirmed! | Mockeefy`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0755E8 0%, #03399E 100%); padding: 32px; text-align: left;">
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">Booking Confirmed! 🎉</h1>
              <p style="color: #dbeafe; font-size: 13.5px; margin: 0;">Your 1-on-1 mock interview is scheduled.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <p style="font-size: 15px; color: #0f172a; margin: 0 0 10px 0; font-weight: 600;">Hello ${candidateName || "Candidate"},</p>
              <p style="font-size: 13.5px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                Your mock interview session with <strong>${expertName}</strong> has been successfully booked and paid.
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
                <p style="margin: 4px 0; font-size: 13px;"><strong>Date:</strong> ${date}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Time Slot:</strong> ${timeSlot}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Duration:</strong> ${duration} Minutes</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Interview Expert:</strong> ${expertName}</p>
                <p style="margin: 4px 0; font-size: 13px;"><strong>Amount Paid:</strong> ₹${safeAmount} (Paid)</p>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${meetingUrl}" target="_blank" style="display: inline-block; background: #0755E8; color: #ffffff; padding: 12px 26px; border-radius: 10px; font-size: 13.5px; font-weight: 700; text-decoration: none; margin-right: 8px;">Join Meeting Room</a>
                <a href="${sessionsUrl}" target="_blank" style="display: inline-block; background: #ffffff; color: #334155; padding: 12px 22px; border-radius: 10px; font-size: 13.5px; font-weight: 700; text-decoration: none; border: 1px solid #cbd5e1;">View Bookings</a>
              </div>

              <p style="font-size: 12.5px; color: #64748b; line-height: 1.5; margin: 0;">
                Best regards,<br><strong>Mockeefy Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return sendEmail({
        to: candidateEmail,
        subject,
        html,
    });
};

export const notifyReviewReceived = async (expertName, candidateEmail, sessionTopic, reviewData) => {
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Session Feedback Received</h2>
            <p>Hello,</p>
            <p>Your mock interview session on <strong>${sessionTopic}</strong> has been reviewed by <strong>${expertName}</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Overall Rating:</strong> ${reviewData.overallRating} / 5</p>
                <p><strong>Technical:</strong> ${reviewData.technicalRating} / 5</p>
                <p><strong>Communication:</strong> ${reviewData.communicationRating} / 5</p>
                <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 10px 0;">
                <p><strong>Feedback:</strong></p>
                <p style="white-space: pre-wrap;">${reviewData.feedback}</p>
            </div>

            <p>Log in to your dashboard to view the full detailed report.</p>
            <br>
            <p>Best regards,<br>Mockeefy Team</p>
        </div>
    `;

    return sendEmail({
        to: candidateEmail,
        subject: `New Feedback from ${expertName} - Mockeefy`,
        html,
    });
};
