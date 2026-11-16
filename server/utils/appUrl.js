import dotenv from 'dotenv';
dotenv.config();

/**
 * Authoritative production application base URL resolver.
 * Ensures notifications and emails never send localhost links in production environments.
 */
export const getAppBaseUrl = () => {
    // Configured APP_BASE_URL takes precedence
    const envBase = process.env.APP_BASE_URL;
    if (envBase && envBase.trim()) {
        const clean = envBase.trim().replace(/\/$/, '');
        if (!clean.includes('localhost') || process.env.ALLOW_LOCALHOST_EMAILS === 'true') {
            return clean;
        }
    }
    const configured = process.env.CLIENT_URL || process.env.APP_URL || process.env.FRONTEND_URL || process.env.BASE_URL;
    if (configured && configured.trim()) {
        const clean = configured.trim().replace(/\/$/, '');
        if (clean.includes('localhost') && process.env.ALLOW_LOCALHOST_EMAILS !== 'true') {
            return 'https://mockeefy.com';
        }
        return clean;
    }
    return 'https://mockeefy.com';
};

/**
 * Formats canonical meeting room link:
 * Uses expert's configured Google Meet link if valid, or Mockeefy's native Live Meeting room route (/live-meeting/:sessionId).
 */
export const getMeetingUrl = (sessionId, customLink = null) => {
    if (customLink && /^https?:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(String(customLink).trim())) {
        return String(customLink).trim();
    }
    const base = getAppBaseUrl();
    return sessionId ? `${base}/live-meeting/${sessionId}` : `${base}/my-sessions`;
};

/**
 * Candidate bookings dashboard link.
 */
export const getCandidateSessionsUrl = () => {
    return `${getAppBaseUrl()}/my-sessions`;
};

/**
 * Expert sessions management and candidate dossier link.
 */
export const getExpertSessionsUrl = () => {
    return `${getAppBaseUrl()}/dashboard/sessions`;
};
