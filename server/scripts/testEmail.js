import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cleanVal = (val) => (val ? String(val).trim().replace(/^["']|["']$/g, '') : '');

const host = cleanVal(process.env.SMTP_HOST) || 'smtpout.secureserver.net';
const port = Number(cleanVal(process.env.SMTP_PORT)) || 465;
const secure = process.env.SMTP_SECURE !== undefined ? cleanVal(process.env.SMTP_SECURE) === 'true' : port === 465;
const user = cleanVal(process.env.SMTP_USER || process.env.EMAIL_USER);
const pass = cleanVal(process.env.SMTP_PASS || process.env.EMAIL_PASS);
const service = cleanVal(process.env.EMAIL_SERVICE);
const from = cleanVal(process.env.EMAIL_FROM) || user || 'info@mockeefy.com';

const targetEmail = process.argv[2] || user || 'test@example.com';

console.log('====================================================');
console.log('   MOCKEEFY SMTP EMAIL DIAGNOSTIC & TEST TOOL       ');
console.log('====================================================');
console.log(`SMTP Service:   ${service || '(Custom Host)'}`);
console.log(`SMTP Host:      ${host}`);
console.log(`SMTP Port:      ${port}`);
console.log(`SMTP Secure:    ${secure}`);
console.log(`SMTP User:      ${user || '❌ (MISSING)'}`);
console.log(`SMTP Pass:      ${pass ? `Set (${pass.length} chars)` : '❌ (MISSING)'}`);
console.log(`From Address:   ${from}`);
console.log(`Recipient:      ${targetEmail}`);
console.log('====================================================\n');

if (!user || !pass) {
    console.error('❌ ERROR: SMTP_USER or SMTP_PASS is missing in server/.env!');
    console.error('Please configure SMTP_USER and SMTP_PASS before running this test.');
    process.exit(1);
}

const transportOptions = {
    pool: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
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

const transporter = nodemailer.createTransport(transportOptions);

async function run() {
    console.log('1️⃣  Connecting to SMTP server & verifying credentials...');
    try {
        await transporter.verify();
        console.log('✅ Connection and credentials verified successfully!\n');
    } catch (err) {
        console.error('❌ SMTP Verification Failed:');
        console.error(`   Message:       ${err.message}`);
        console.error(`   Code:          ${err.code}`);
        console.error(`   Response Code: ${err.responseCode}\n`);

        if (err.code === 'EAUTH' || err.responseCode === 535) {
            console.error('👉 Cause: 535 Authentication Failed.');
            console.error('   The username or password provided does not match what the email server expects.');
            console.error('   Possible solutions:');
            console.error('   - For GoDaddy: Verify the password by logging into https://email.secureserver.net');
            console.error('   - For Gmail: Use a 16-character App Password (not your Google account password)');
            console.error('   - For Office365: Ensure SMTP AUTH is enabled on the mailbox.');
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
            console.error('👉 Cause: Cannot reach SMTP server.');
            console.error('   Check if SMTP_HOST or SMTP_PORT is correct or blocked by firewall.');
        }
        process.exit(1);
    }

    console.log(`2️⃣  Sending test email to: ${targetEmail}...`);
    try {
        const info = await transporter.sendMail({
            from: `"Mockeefy Test" <${from}>`,
            to: targetEmail,
            subject: 'Mockeefy Email Test ✔',
            html: `
                <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 8px;">
                    <h2 style="color: #0755E8;">Mockeefy Email Service is Working!</h2>
                    <p>This is a test email dispatched from Mockeefy server at <strong>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</strong>.</p>
                    <p>All SMTP settings are configured properly.</p>
                </div>
            `,
        });
        console.log(`✅ Test email successfully sent! Message ID: ${info.messageId}`);
        console.log('🎉 Email service is fully operational.\n');
    } catch (sendErr) {
        console.error('❌ Failed to dispatch test email:');
        console.error(sendErr);
        process.exit(1);
    }
}

run();
