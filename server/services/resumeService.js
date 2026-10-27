import path from 'path';
import fs from 'fs';
import cloudinary from '../config/cloudinary.js';

/**
 * Fetch binary buffer for a resume file from Cloudinary, local disk, or external URL.
 * Handles Cloudinary authenticated/private downloads for raw PDFs that fail public CDN delivery.
 */
export async function fetchResumeBuffer(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string') return null;

    // 1. Cloudinary raw resource
    if (fileUrl.includes('cloudinary.com')) {
        try {
            const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
            const publicId = match ? decodeURIComponent(match[1]) : null;

            if (publicId) {
                // Raw PDFs require private download URL with signature to bypass ACL restrictions
                const downloadUrl = cloudinary.utils.private_download_url(publicId, '', {
                    resource_type: 'raw',
                    type: 'upload'
                });

                const cloudRes = await fetch(downloadUrl);
                if (cloudRes.ok) {
                    const arr = await cloudRes.arrayBuffer();
                    return Buffer.from(arr);
                } else {
                    console.warn(`[ResumeService] Cloudinary private download returned HTTP ${cloudRes.status}`);
                }
            }
        } catch (cldErr) {
            console.error('[ResumeService] Cloudinary buffer fetch error:', cldErr?.message || cldErr);
        }
    }

    // 2. Local disk file
    if (fileUrl.startsWith('/') || fileUrl.startsWith('uploads')) {
        try {
            const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
            const absolutePath = path.join(process.cwd(), relativePath);
            if (fs.existsSync(absolutePath)) {
                return fs.readFileSync(absolutePath);
            }
        } catch (fsErr) {
            console.error('[ResumeService] Local file read error:', fsErr?.message || fsErr);
        }
    }

    // 3. External HTTP URL
    if (fileUrl.startsWith('http')) {
        try {
            const extRes = await fetch(fileUrl);
            if (extRes.ok) {
                const arr = await extRes.arrayBuffer();
                return Buffer.from(arr);
            }
        } catch (extErr) {
            console.error('[ResumeService] External URL fetch error:', extErr?.message || extErr);
        }
    }

    return null;
}

/**
 * Generate a complete, elegant, printable HTML resume if PDF file is missing or constructed via builder.
 */
export function generatePrintableResumeHtml({ candidate, resume, session = {} }) {
    const candidateName = candidate?.name || session.candidateName || resume?.personalInfo?.name || "Candidate";
    const email = candidate?.email || resume?.personalInfo?.email || "";
    const phone = candidate?.personalInfo?.phone || resume?.personalInfo?.phone || "";
    const location = [
        candidate?.personalInfo?.city || resume?.personalInfo?.city,
        candidate?.personalInfo?.state || resume?.personalInfo?.state,
        candidate?.personalInfo?.country
    ].filter(Boolean).join(', ');

    const linkedin = candidate?.personalInfo?.linkedin || resume?.personalInfo?.linkedin || "";
    const github = candidate?.personalInfo?.github || resume?.personalInfo?.github || "";
    const portfolio = candidate?.personalInfo?.portfolio || resume?.personalInfo?.portfolio || "";

    const rawSkills = [
        ...(resume?.skills?.technical || []),
        ...(resume?.skills?.soft || []),
        ...(candidate?.skills?.technical || []),
        ...(candidate?.skills?.soft || []),
        ...(session.topics || [])
    ];
    const skills = Array.from(new Set(rawSkills.filter(Boolean)));

    const experience = (resume?.experience && resume.experience.length > 0)
        ? resume.experience
        : (candidate?.experience || []);

    const education = (resume?.education && resume.education.length > 0)
        ? resume.education
        : (candidate?.education || []);

    const projects = resume?.projects || [];
    const bio = resume?.personalInfo?.bio || candidate?.personalInfo?.bio || "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${candidateName} - Resume | Mockeefy</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; line-height: 1.6; }
        .page { max-width: 840px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.03); padding: 48px; border: 1px solid #e2e8f0; }
        .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0755E8; padding-bottom: 24px; margin-bottom: 28px; }
        .name { font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .title-sub { font-size: 14px; font-weight: 700; color: #0755E8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .contact { font-size: 13px; color: #64748b; margin-top: 10px; display: flex; flex-wrap: wrap; gap: 14px; }
        .contact-item { display: inline-flex; align-items: center; gap: 4px; }
        .actions { display: flex; gap: 10px; }
        .btn { background: #0755E8; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(7,85,232,0.25); text-decoration: none; transition: background 0.15s ease; }
        .btn:hover { background: #0544be; }
        .section { margin-bottom: 26px; }
        .section-title { font-size: 13px; font-weight: 800; color: #0755E8; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 14px; }
        .bio { font-size: 14px; color: #475569; margin-bottom: 14px; line-height: 1.6; }
        .item { margin-bottom: 16px; }
        .item-header { display: flex; justify-content: space-between; align-items: baseline; }
        .item-title { font-size: 15px; font-weight: 700; color: #0f172a; }
        .item-sub { font-size: 13px; color: #64748b; font-weight: 500; }
        .item-desc { font-size: 13px; color: #475569; margin-top: 6px; line-height: 1.5; }
        .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
        .skill-tag { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; border: 1px solid #bfdbfe; }
        .verified-badge { display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #a7f3d0; margin-top: 10px; }
        @media print {
            body { background: white; padding: 0; }
            .page { border: none; box-shadow: none; padding: 0; max-width: 100%; }
            .actions { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="top-bar">
            <div>
                <h1 class="name">${candidateName}</h1>
                <div class="title-sub">Verified Candidate Profile</div>
                <div class="contact">
                    ${email ? `<span class="contact-item">✉ ${email}</span>` : ''}
                    ${phone ? `<span class="contact-item">☎ ${phone}</span>` : ''}
                    ${location ? `<span class="contact-item">📍 ${location}</span>` : ''}
                    ${linkedin ? `<span class="contact-item">🔗 LinkedIn</span>` : ''}
                    ${github ? `<span class="contact-item">💻 GitHub</span>` : ''}
                </div>
                <div class="verified-badge">✓ Verified Mockeefy Session Candidate</div>
            </div>
            <div class="actions">
                <button class="btn" onclick="window.print()">🖨 Print / Save as PDF</button>
            </div>
        </div>

        ${bio ? `
        <div class="section">
            <div class="section-title">Summary & Objective</div>
            <p class="bio">${bio}</p>
        </div>` : ''}

        <div class="section">
            <div class="section-title">Skills & Competencies</div>
            <div class="skills-grid">
                ${skills.length > 0 ? skills.map(s => `<span class="skill-tag">${s}</span>`).join('') : '<span style="color:#94a3b8;font-size:13px;">Technical skills listed on profile.</span>'}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Work Experience</div>
            ${experience.length > 0 ? experience.map(exp => `
                <div class="item">
                    <div class="item-header">
                        <div class="item-title">${exp.position || 'Software Engineer'}</div>
                        <div class="item-sub">${exp.startDate ? new Date(exp.startDate).getFullYear() : ''} - ${exp.current ? 'Present' : (exp.endDate ? new Date(exp.endDate).getFullYear() : 'Present')}</div>
                    </div>
                    <div class="item-sub" style="color: #0755E8; font-weight: 600;">${exp.company || 'Organization'}</div>
                    ${exp.description ? `<p class="item-desc">${exp.description}</p>` : ''}
                </div>
            `).join('') : '<p style="color:#64748b;font-size:13px;">Candidate preparing for technical mock interviews.</p>'}
        </div>

        <div class="section">
            <div class="section-title">Education</div>
            ${education.length > 0 ? education.map(edu => `
                <div class="item">
                    <div class="item-header">
                        <div class="item-title">${edu.degree || 'Degree'}${edu.field ? ' in ' + edu.field : ''}</div>
                        <div class="item-sub">${edu.endYear || edu.startYear || ''}</div>
                    </div>
                    <div class="item-sub">${edu.institution || 'University / Institution'}</div>
                </div>
            `).join('') : '<p style="color:#64748b;font-size:13px;">Education details recorded in candidate profile.</p>'}
        </div>

        ${projects.length > 0 ? `
        <div class="section">
            <div class="section-title">Key Projects</div>
            ${projects.map(proj => `
                <div class="item">
                    <div class="item-header">
                        <div class="item-title">${proj.title}</div>
                        ${proj.link ? `<div class="item-sub"><a href="${proj.link}" target="_blank" style="color:#0755E8;">View Project</a></div>` : ''}
                    </div>
                    ${proj.description ? `<p class="item-desc">${proj.description}</p>` : ''}
                </div>
            `).join('')}
        </div>` : ''}
    </div>
</body>
</html>`;
}
