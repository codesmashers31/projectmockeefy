import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../lib/axios";
import {
  Award,
  ChevronRight,
  Download,
  X,
  Briefcase,
  CheckCircle2,
  Calendar,
  Loader2,
  Sparkles,
  ShieldCheck,
  FileCheck,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import CertificatesSkeleton from "../components/CertificatesSkeleton";
import mockeefyLogo from "../assets/logo/mockeefylogo.png";

type ReviewInfo = {
  overallRating?: number;
  technicalRating?: number;
  communicationRating?: number;
  feedback?: string;
  strengths?: string[];
  weaknesses?: string[];
  createdAt?: string;
};

type Session = {
  id: string;
  sessionId: string;
  expert: string;
  profileImage?: string | null;
  company?: string | null;
  role?: string | null;
  topic?: string | null;
  startTime?: string;
  endTime?: string;
  category?: string;
  status: string;
  expertReview?: ReviewInfo | null;
  candidateReview?: ReviewInfo | null;
};

// Certificate Template matching the official Mockefy Certificate of Completion design
// Styled with standard web hex colors to guarantee 100% vector-crisp PDF capture without modern CSS parser collisions
const CertificateTemplate = ({
  userName,
  domain = "IT",
  expertName,
  issueDateStr,
  certId,
  isMaster = false
}: {
  userName: string;
  domain?: string;
  expertName?: string;
  issueDateStr: string;
  certId: string;
  isMaster?: boolean;
}) => {
  const displayDomain = (domain || "IT").toUpperCase();

  return (
    <div
      className="relative overflow-hidden select-none box-border"
      style={{
        width: "1000px",
        height: "707px",
        backgroundColor: "#FFFFFF",
        color: "#0A2540",
        fontFamily: "'Source Sans 3', 'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* SVG Decorative Background: Corners, Waves, Borders */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: "1000px", height: "707px" }}
        viewBox="0 0 1000 707"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="certGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="35%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#AA7C11" />
            <stop offset="100%" stopColor="#E2B755" />
          </linearGradient>
          <linearGradient id="certNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B2545" />
            <stop offset="100%" stopColor="#06182B" />
          </linearGradient>
        </defs>

        {/* 1. TOP-LEFT CORNER DECORATION */}
        <path d="M 0,260 Q 180,240 260,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M 0,290 Q 200,260 290,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.45" />
        <path d="M 0,320 Q 220,280 320,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.3" />
        <path d="M 0,350 Q 240,300 350,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.18" />

        {/* Navy and Gold geometric corner polygons */}
        <polygon points="0,0 230,0 0,230" fill="url(#certNavyGrad)" />
        <polygon points="0,0 155,0 0,210" fill="#06182B" />
        <polygon points="0,215 15,225 225,15 215,0 195,0 0,195" fill="url(#certGoldGrad)" />
        <polygon points="0,110 110,0 75,0 0,75" fill="url(#certGoldGrad)" opacity="0.35" />

        {/* 2. BOTTOM-RIGHT CORNER DECORATION (Mirrored) */}
        <g transform="translate(1000, 707) rotate(180)">
          <path d="M 0,260 Q 180,240 260,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M 0,290 Q 200,260 290,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.45" />
          <path d="M 0,320 Q 220,280 320,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M 0,350 Q 240,300 350,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.18" />

          <polygon points="0,0 230,0 0,230" fill="url(#certNavyGrad)" />
          <polygon points="0,0 155,0 0,210" fill="#06182B" />
          <polygon points="0,215 15,225 225,15 215,0 195,0 0,195" fill="url(#certGoldGrad)" />
          <polygon points="0,110 110,0 75,0 0,75" fill="url(#certGoldGrad)" opacity="0.35" />
        </g>

        {/* 3. DUAL REFINED BORDER FRAME */}
        <rect x="26" y="26" width="948" height="655" fill="none" stroke="#0A2540" strokeWidth="1.5" />

        {/* Inner stepped/notched gold and navy border */}
        <path
          d="M 54,38 L 946,38 L 946,54 L 962,54 L 962,653 L 946,653 L 946,669 L 54,669 L 54,653 L 38,653 L 38,54 L 54,54 Z"
          fill="none"
          stroke="url(#certGoldGrad)"
          strokeWidth="1.2"
        />
        <path
          d="M 57,41 L 943,41 L 943,57 L 959,57 L 959,650 L 943,650 L 943,666 L 57,666 L 57,650 L 41,650 L 41,57 L 57,57 Z"
          fill="none"
          stroke="#0A2540"
          strokeWidth="0.6"
          opacity="0.4"
        />
      </svg>

      {/* Main Content Layout */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between px-16 box-border text-center" style={{ paddingTop: "74px", paddingBottom: "38px" }}>
        {/* Top: Mockeefy Logo, Name, Verified Badge & Tagline */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-2.5">
            {/* Official Mockeefy 3D Logo Mark */}
            <img
              src={mockeefyLogo}
              alt="Mockeefy"
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "11px",
                objectFit: "contain",
                display: "block",
              }}
            />
            {/* Brand Name */}
            <span
              style={{
                fontSize: "31px",
                fontWeight: 900,
                color: "#0755E8",
                letterSpacing: "-0.5px",
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                lineHeight: 1,
              }}
            >
              Mockeefy
            </span>
            {/* Professional Verified Accreditation Rosette Seal */}
            <div
              title="Official Verified Accreditation"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: "3px",
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="certBadgeGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="35%" stopColor="#E5C068" />
                    <stop offset="70%" stopColor="#C59B27" />
                    <stop offset="100%" stopColor="#8C6510" />
                  </linearGradient>
                  <linearGradient id="certBadgeNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0B2545" />
                    <stop offset="100%" stopColor="#06182B" />
                  </linearGradient>
                </defs>
                {/* 12-point scalloped security rosette */}
                <path
                  d="M12 1.2l1.6 1.8 2.4-.3 1 2.2 2.4.7.2 2.4 2 1.5-.7 2.3 1.4 2-1.4 2 .7 2.3-2 1.5-.2 2.4-2.4.7-1 2.2-2.4-.3L12 22.8l-1.6 1.8-2.4-.3-1-2.2-2.4-.7-.2-2.4-2-1.5.7-2.3-1.4-2 1.4-2-.7-2.3 2-1.5.2-2.4 2.4-.7 1-2.2 2.4.3L12 1.2z"
                  fill="url(#certBadgeGoldGrad)"
                  stroke="#AA7C11"
                  strokeWidth="0.5"
                />
                {/* Deep Royal Navy Medallion Core */}
                <circle cx="12" cy="12" r="8" fill="url(#certBadgeNavyGrad)" stroke="#FDE68A" strokeWidth="0.8" />
                {/* Subtle Inner Security Ring */}
                <circle cx="12" cy="12" r="6.8" fill="none" stroke="#D4AF37" strokeWidth="0.6" strokeDasharray="1.5 1" opacity="0.85" />
                {/* Polished Gold Checkmark */}
                <path
                  d="M8.5 12.2l2.3 2.3 4.7-4.8"
                  stroke="#FDE68A"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "13px" }}>
            PRACTICE . IMPROVE . SUCCEED.
          </div>
        </div>

        {/* Center: Certificate of Completion & Recipient */}
        <div className="my-auto w-full text-center space-y-3.5 py-1" style={{ marginTop: "auto", marginBottom: "auto" }}>
          {/* Main Title */}
          <div className="space-y-2">
            <h1
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "40px",
                fontWeight: 700,
                color: "#0A2540",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              CERTIFICATE <span style={{ fontSize: "24px", fontWeight: 400, opacity: 0.85 }}>OF</span> COMPLETION
            </h1>

            {/* Divider with Center Diamond */}
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto" style={{ maxWidth: "340px", margin: "6px auto" }}>
              <div style={{ height: "1px", backgroundColor: "#0A2540", opacity: 0.35, flex: 1 }} />
              <div style={{ width: "6px", height: "6px", backgroundColor: "#0A2540", transform: "rotate(45deg)" }} />
              <div style={{ height: "1px", backgroundColor: "#0A2540", opacity: 0.35, flex: 1 }} />
            </div>
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.28em", color: "#475569", textTransform: "uppercase", paddingTop: "4px" }}>
            THIS CERTIFIES THAT
          </div>

          {/* Recipient Name */}
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "36px",
              fontWeight: 700,
              color: "#0A2540",
              letterSpacing: "0.02em",
            }}
          >
            {userName}
          </div>

          {/* Achievement Description mentioning Domain */}
          <p
            style={{
              fontSize: "12.5px",
              color: "#475569",
              maxWidth: "640px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            {isMaster ? (
              <span>
                Successfully completed the comprehensive{" "}
                <strong style={{ color: "#0A2540", fontWeight: 700 }}>Mockeefy Master Interview Readiness Program</strong>,
                demonstrating superior technical expertise, problem-solving, and professional interview readiness across domains.
              </span>
            ) : (
              <span>
                Successfully completed a structured mock interview in the{" "}
                <strong style={{ color: "#0A2540", fontWeight: 700 }}>{displayDomain}</strong> domain,
                demonstrating dedication to improving interview skills and professional growth.
              </span>
            )}
          </p>

          {/* Domain Ribbon Banner with Gold Accents */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div style={{ width: "60px", height: "1.5px", backgroundColor: "#D4AF37" }} />
            <div
              style={{
                position: "relative",
                padding: "7px 28px",
                borderRadius: "9999px",
                backgroundColor: "#06182B",
                border: "1px solid #D4AF37",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.18em", color: "#FFFFFF", textTransform: "uppercase" }}>
                {isMaster ? "MASTER INTERVIEW EXCELLENCE" : `${displayDomain} PROFESSIONAL MOCK INTERVIEW SESSION`}
              </span>
            </div>
            <div style={{ width: "60px", height: "1.5px", backgroundColor: "#D4AF37" }} />
          </div>
        </div>

        {/* Bottom: Issued By (Date & Expert) + Medallion Seal + Director Signature */}
        <div className="flex items-end justify-between px-10 pb-3 relative z-20">
          {/* Left: Issued By & Date */}
          <div className="flex flex-col items-start text-left" style={{ width: "250px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              MOCKEEFY CERTIFICATE ISSUED BY :
            </span>
            <span style={{ fontSize: "12px", fontWeight: 900, color: "#0A2540", marginTop: "4px" }}>
              {expertName || "Verified Mockeefy Expert"}
            </span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#334155", marginTop: "2px" }}>
              Issued on {issueDateStr}
            </span>
            <div style={{ width: "180px", height: "1px", backgroundColor: "#0A2540", opacity: 0.35, marginTop: "8px" }} />
          </div>

          {/* Right: Director Signature */}
          <div className="flex flex-col items-center text-center" style={{ width: "240px" }}>
            <svg width="128" height="36" viewBox="0 0 140 40">
              <path
                d="M 10,26 C 25,8 32,4 45,20 C 55,33 60,7 75,23 C 85,33 105,10 125,22"
                fill="none"
                stroke="#0A2540"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 28,20 Q 68,18 135,14"
                fill="none"
                stroke="#0A2540"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ width: "180px", height: "1px", backgroundColor: "#0A2540", opacity: 0.35, marginTop: "4px" }} />
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "6px" }}>
              DIRECTOR SIGNATURE
            </span>
          </div>
        </div>

        {/* Certificate ID on bottom edge */}
        <div style={{ position: "absolute", bottom: "8px", left: "64px", fontSize: "8px", fontFamily: "monospace", fontWeight: 600, color: "#94A3B8" }}>
          ID: {certId}
        </div>
      </div>
    </div>
  );
};

// Scalable, lightweight vector certificate thumbnail for direct visual preview inside certificate cards
const CertificateThumbnail = ({
  userName,
  domain = "IT",
  expertName,
  issueDateStr,
  certId,
  isMaster = false,
}: {
  userName: string;
  domain?: string;
  expertName?: string;
  issueDateStr: string;
  certId: string;
  isMaster?: boolean;
}) => {
  const displayDomain = (domain || "IT").toUpperCase();
  const safeId = (certId || "CERT").replace(/[^a-zA-Z0-9]/g, "_");

  return (
    <svg
      viewBox="0 0 1000 707"
      className="w-full h-full block select-none pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <defs>
        <linearGradient id={`thumbGoldGrad_${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#AA7C11" />
          <stop offset="100%" stopColor="#E2B755" />
        </linearGradient>
        <linearGradient id={`thumbNavyGrad_${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B2545" />
          <stop offset="100%" stopColor="#06182B" />
        </linearGradient>
        <linearGradient id={`thumbLogoGrad_${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D6EFD" />
          <stop offset="100%" stopColor="#0048BA" />
        </linearGradient>
      </defs>

      {/* Background fill */}
      <rect x="0" y="0" width="1000" height="707" fill="#FFFFFF" />

      {/* TOP-LEFT CORNER DECORATION */}
      <path d="M 0,260 Q 180,240 260,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M 0,290 Q 200,260 290,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.45" />
      <path d="M 0,320 Q 220,280 320,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.3" />
      <path d="M 0,350 Q 240,300 350,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.18" />

      <polygon points="0,0 230,0 0,230" fill={`url(#thumbNavyGrad_${safeId})`} />
      <polygon points="0,0 155,0 0,210" fill="#06182B" />
      <polygon points="0,215 15,225 225,15 215,0 195,0 0,195" fill={`url(#thumbGoldGrad_${safeId})`} />
      <polygon points="0,110 110,0 75,0 0,75" fill={`url(#thumbGoldGrad_${safeId})`} opacity="0.35" />

      {/* BOTTOM-RIGHT CORNER DECORATION (Mirrored) */}
      <g transform="translate(1000, 707) rotate(180)">
        <path d="M 0,260 Q 180,240 260,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.6" />
        <path d="M 0,290 Q 200,260 290,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.45" />
        <path d="M 0,320 Q 220,280 320,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.3" />
        <path d="M 0,350 Q 240,300 350,0" stroke="#BFDBFE" strokeWidth="1" fill="none" opacity="0.18" />

        <polygon points="0,0 230,0 0,230" fill={`url(#thumbNavyGrad_${safeId})`} />
        <polygon points="0,0 155,0 0,210" fill="#06182B" />
        <polygon points="0,215 15,225 225,15 215,0 195,0 0,195" fill={`url(#thumbGoldGrad_${safeId})`} />
        <polygon points="0,110 110,0 75,0 0,75" fill={`url(#thumbGoldGrad_${safeId})`} opacity="0.35" />
      </g>

      {/* DUAL BORDER FRAME */}
      <rect x="26" y="26" width="948" height="655" fill="none" stroke="#0A2540" strokeWidth="1.5" />
      <path
        d="M 54,38 L 946,38 L 946,54 L 962,54 L 962,653 L 946,653 L 946,669 L 54,669 L 54,653 L 38,653 L 38,54 L 54,54 Z"
        fill="none"
        stroke={`url(#thumbGoldGrad_${safeId})`}
        strokeWidth="1.2"
      />
      <path
        d="M 57,41 L 943,41 L 943,57 L 959,57 L 959,650 L 943,650 L 943,666 L 57,666 L 57,650 L 41,650 L 41,57 L 57,57 Z"
        fill="none"
        stroke="#0A2540"
        strokeWidth="0.6"
        opacity="0.4"
      />

      {/* HEADER LOGO & BRAND */}
      <g transform="translate(500, 74)">
        <image href={mockeefyLogo} x="-104" y="-3" width="38" height="38" />
        <text x="-58" y="27" textAnchor="start" fill="#0755E8" fontSize="29" fontWeight="900" fontFamily="sans-serif">Mockeefy</text>

        {/* 12-point scalloped gold rosette verified badge */}
        <g transform="translate(86, 17)">
          <path
            d="M 0,-12 L 2,-9.5 L 5,-10 L 5.5,-7 L 8.5,-5.5 L 8,-2.5 L 10.5,-0.5 L 9,2.5 L 10.5,5.5 L 8,7.5 L 8.5,10.5 L 5.5,9.5 L 5,12.5 L 2,10.5 L 0,13 L -2,10.5 L -5,12.5 L -5.5,9.5 L -8.5,10.5 L -8,7.5 L -10.5,5.5 L -9,2.5 L -10.5,-0.5 L -8,-2.5 L -8.5,-5.5 L -5.5,-7 L -5,-10 L -2,-9.5 Z"
            fill={`url(#thumbGoldGrad_${safeId})`}
            stroke="#AA7C11"
            strokeWidth="0.5"
          />
          <circle cx="0" cy="0.5" r="7.5" fill={`url(#thumbNavyGrad_${safeId})`} stroke="#FDE68A" strokeWidth="0.75" />
          <path d="M -3.2,0.5 L -1,2.8 L 3.5,-2" fill="none" stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <text x="0" y="57" textAnchor="middle" fill="#475569" fontSize="9.5" fontWeight="700" letterSpacing="1.5" fontFamily="sans-serif">PRACTICE . IMPROVE . SUCCEED.</text>
      </g>

      {/* MAIN TITLE & RECIPIENT */}
      <g transform="translate(500, 245)">
        <text x="0" y="0" textAnchor="middle" fill="#0A2540" fontSize="36" fontWeight="700" letterSpacing="2.5" fontFamily="Georgia, serif">
          CERTIFICATE OF COMPLETION
        </text>
        <line x1="-150" y1="18" x2="-10" y2="18" stroke="#0A2540" strokeWidth="1" opacity="0.35" />
        <polygon points="0,15 4,19 0,23 -4,19" fill="#0A2540" />
        <line x1="10" y1="18" x2="150" y2="18" stroke="#0A2540" strokeWidth="1" opacity="0.35" />

        <text x="0" y="44" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="700" letterSpacing="3" fontFamily="sans-serif">
          THIS CERTIFIES THAT
        </text>

        <text x="0" y="98" textAnchor="middle" fill="#0A2540" fontSize="34" fontWeight="700" fontFamily="Georgia, serif">
          {userName}
        </text>

        <text x="0" y="132" textAnchor="middle" fill="#475569" fontSize="12" fontFamily="sans-serif">
          {isMaster
            ? "Successfully completed the Mockeefy Master Interview Readiness Program"
            : `Successfully completed a structured mock interview in the ${displayDomain} domain`}
        </text>

        <g transform="translate(0, 172)">
          <line x1="-240" y1="0" x2="-170" y2="0" stroke="#D4AF37" strokeWidth="1.5" />
          <rect x="-165" y="-14" width="330" height="28" rx="14" fill="#06182B" stroke="#D4AF37" strokeWidth="1" />
          <text x="0" y="4.5" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="900" letterSpacing="1.8" fontFamily="sans-serif">
            {isMaster ? "MASTER INTERVIEW EXCELLENCE" : `${displayDomain} PROFESSIONAL MOCK INTERVIEW`}
          </text>
          <line x1="170" y1="0" x2="240" y2="0" stroke="#D4AF37" strokeWidth="1.5" />
        </g>
      </g>

      {/* FOOTER: Issued By + Seal + Signature */}
      <g transform="translate(0, 580)">
        <g transform="translate(100, 0)">
          <text x="0" y="0" fill="#475569" fontSize="9" fontWeight="700" letterSpacing="0.8" fontFamily="sans-serif">MOCKEEFY CERTIFICATE ISSUED BY :</text>
          <text x="0" y="18" fill="#0A2540" fontSize="12" fontWeight="900" fontFamily="sans-serif">{expertName || "Verified Mockeefy Expert"}</text>
          <text x="0" y="34" fill="#334155" fontSize="10" fontWeight="700" fontFamily="sans-serif">Issued on {issueDateStr}</text>
          <line x1="0" y1="46" x2="180" y2="46" stroke="#0A2540" strokeWidth="1" opacity="0.35" />
        </g>

        <g transform="translate(760, 0)">
          <path
            d="M 0,18 C 15,2 22,-2 35,12 C 45,23 50,2 62,15 C 72,23 90,4 110,14"
            fill="none"
            stroke="#0A2540"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M 18,12 Q 55,10 120,6" fill="none" stroke="#0A2540" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="0" y1="26" x2="160" y2="26" stroke="#0A2540" strokeWidth="1" opacity="0.35" />
          <text x="80" y="42" textAnchor="middle" fill="#475569" fontSize="9" fontWeight="700" letterSpacing="1.2" fontFamily="sans-serif">DIRECTOR SIGNATURE</text>
        </g>
      </g>

      <text x="64" y="694" fill="#94A3B8" fontSize="8" fontFamily="monospace" fontWeight="600">
        ID: {certId}
      </text>
    </svg>
  );
};

interface CertificatesPageProps {
  showSkeletons?: boolean;
}

export default function CertificatesPage({ showSkeletons = false }: CertificatesPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isMasterSelected, setIsMasterSelected] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingMaster, setDownloadingMaster] = useState(false);
  const pdfRenderRef = useRef<HTMLDivElement>(null);
  const [downloadTarget, setDownloadTarget] = useState<{
    session: Session | null;
    isMaster: boolean;
  } | null>(null);

  const getFormattedIssueDate = (session: Session) => {
    const rawDate = session.expertReview?.createdAt || session.startTime || new Date();
    const d = new Date(rawDate);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const completedSessions = useMemo(() => {
    return sessions
      .filter((s) => (s.status || "").toLowerCase() === "completed")
      .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
  }, [sessions]);

  const masterCertId = useMemo(() => {
    const userId = (user as any)?.id || (user as any)?._id || "USR";
    return `MCFY-MST-${userId.slice(-6).toUpperCase()}-${new Date().getFullYear()}`;
  }, [user]);

  const isMasterUnlocked = completedSessions.length >= 3;

  const downloadElementAsPDF = async (element: HTMLElement, filename: string) => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 1000,
      height: 707,
      windowWidth: 1000,
      windowHeight: 707,
      onclone: (clonedDoc) => {
        const container = clonedDoc.getElementById("pdf-capture-container");
        if (container) {
          container.style.position = "static";
          container.style.left = "0px";
          container.style.top = "0px";
          container.style.opacity = "1";
          container.style.display = "block";
          container.style.visibility = "visible";
        }
        const stage = clonedDoc.getElementById("pdf-capture-stage");
        if (stage) {
          stage.style.position = "static";
          stage.style.left = "0px";
          stage.style.top = "0px";
          stage.style.opacity = "1";
          stage.style.display = "block";
          stage.style.visibility = "visible";
        }
      },
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    pdf.addImage(imgData, "JPEG", 0, 0, 297, 210, undefined, "FAST");
    pdf.save(filename);
  };

  const handleDownloadPDF = async (sessionObj: Session) => {
    if (downloading) return;
    setDownloading(sessionObj.id);
    setDownloadTarget({ session: sessionObj, isMaster: false });

    try {
      // Give React 300ms to mount CertificateTemplate into pdfRenderRef
      await new Promise((resolve) => setTimeout(resolve, 300));

      const target = pdfRenderRef.current?.firstElementChild as HTMLElement | null;
      if (!target) {
        throw new Error("Unable to locate certificate template");
      }

      const name = user?.name || "Candidate";
      const filename = `${name.replace(/\s+/g, "_")}_${sessionObj.category || "Interview"}_Certificate.pdf`;
      await downloadElementAsPDF(target, filename);
      toast.success("Certificate downloaded successfully!");
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error(err?.message ? `Download error: ${err.message}` : "Failed to generate PDF. Please try previewing the certificate first.");
    } finally {
      setDownloading(null);
      setDownloadTarget(null);
    }
  };

  const handleDownloadMasterPDF = async () => {
    if (downloadingMaster) return;
    setDownloadingMaster(true);
    setDownloadTarget({ session: null, isMaster: true });

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const target = pdfRenderRef.current?.firstElementChild as HTMLElement | null;
      if (!target) {
        throw new Error("Unable to locate master certificate template");
      }

      const name = user?.name || "Candidate";
      const filename = `${name.replace(/\s+/g, "_")}_Master_Interview_Certificate.pdf`;
      await downloadElementAsPDF(target, filename);
      toast.success("Master Certificate downloaded successfully!");
    } catch (err: any) {
      console.error("Master PDF download error:", err);
      toast.error(err?.message ? `Download error: ${err.message}` : "Failed to generate Master Certificate PDF.");
    } finally {
      setDownloadingMaster(false);
      setDownloadTarget(null);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    completedSessions.forEach((s) => {
      const cat = s.category || "IT";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [completedSessions]);

  const filteredCertificates = useMemo(() => {
    if (selectedCategory === "all") return completedSessions;
    return completedSessions.filter(
      (s) => (s.category || "IT").toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [completedSessions, selectedCategory]);

  const PAGE_SIZE = 6;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredCertificates.length / PAGE_SIZE));
  const certificatesListRef = useRef<HTMLDivElement>(null);

  const scrollToCertificatesTop = () => {
    requestAnimationFrame(() => {
      if (certificatesListRef.current) {
        const navOffset = 84; // Clearance for the sticky navbar
        const rect = certificatesListRef.current.getBoundingClientRect();
        const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const targetScrollY = rect.top + currentScrollY - navOffset;
        window.scrollTo({
          top: Math.max(0, targetScrollY),
          behavior: "smooth",
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    scrollToCertificatesTop();
  };

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, filteredCertificates.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStartIdx = (page - 1) * PAGE_SIZE;
  const pageEndIdx = Math.min(filteredCertificates.length, pageStartIdx + PAGE_SIZE);
  const pagedCertificates = filteredCertificates.slice(pageStartIdx, pageEndIdx);

  useEffect(() => {
    const fetchSessions = async () => {
      const userId = (user as any)?.id || (user as any)?._id;
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`/api/sessions/candidate/${userId}`);
        const raw = Array.isArray(res.data) ? res.data : [];
        const mapped: Session[] = raw.map((s: any) => ({
          id: s._id || s.sessionId,
          sessionId: s.sessionId,
          expert: s.expertDetails?.name || s.expertId?.name || "Expert",
          profileImage: s.expertDetails?.profileImage || s.expertId?.profileImage || null,
          company: s.expertDetails?.company || s.expertId?.company || "Mockeefy",
          role: s.expertDetails?.currentRole || s.expertDetails?.role || s.expertId?.currentRole || s.expertId?.role || "Tech Expert",
          topic: s.topic || s.category,
          startTime: s.startTime,
          endTime: s.endTime,
          category: s.category || s.expertDetails?.category || "IT",
          status: (s.status || "").charAt(0).toUpperCase() + (s.status || "").slice(1),
          expertReview: s.expertReview || null,
          candidateReview: s.candidateReview || null,
        }));
        setSessions(mapped);
      } catch (e) {
        console.error(e);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  if (showSkeletons || loading) {
    return <CertificatesSkeleton />;
  }

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-6 md:p-8 overflow-hidden pb-12 font-sans text-left">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        {/* Header - Verified Certificates Title Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center border border-[#93B8FF] shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#0755E8]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight leading-none truncate">
                My Certificates
              </h1>
              <p className="text-xs font-semibold text-gray-500 mt-1 truncate">
                Official verified credentials conferred from completed mock interviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#93B8FF] bg-[#EAF2FF] text-[10px] font-black text-[#0755E8] uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Credentials</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs">
              Total: {completedSessions.length}
            </span>
          </div>
        </div>

        {/* Master Certificate Milestone Banner */}
        {completedSessions.length > 0 && (
          <div className="rounded-2xl border p-4 sm:p-5 relative overflow-hidden transition-all duration-200 bg-gradient-to-r from-[#06182B] via-[#0A2540] to-[#0B2A4A] text-white border-amber-500/30 shadow-md">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {isMasterUnlocked ? "Master Credential Conferred" : "Master Credential Track"}
                    </span>
                    <span className="text-slate-300 text-xs font-mono">
                      ID: {masterCertId}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Mockeefy Master Interview Excellence Credential
                  </h2>
                  <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
                    {isMasterUnlocked
                      ? `Conferred for completing ${completedSessions.length} sessions across multiple domains. Demonstrates comprehensive interview mastery.`
                      : `Complete 3 mock interview sessions to unlock the prestigious Mockeefy Master Interview Certificate (${completedSessions.length}/3 completed).`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                {isMasterUnlocked ? (
                  <>
                    <div
                      onClick={() => {
                        setSelectedSession(null);
                        setIsMasterSelected(true);
                      }}
                      className="hidden sm:block w-28 aspect-[1000/707] rounded-lg overflow-hidden border border-amber-400/40 shadow-sm shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      title="Click to preview Master Certificate"
                    >
                      <CertificateThumbnail
                        userName={user?.name || "Candidate"}
                        domain="Master"
                        expertName="Mockeefy Board of Directors"
                        issueDateStr={new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
                        certId={masterCertId}
                        isMaster={true}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSession(null);
                        setIsMasterSelected(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadMasterPDF}
                      disabled={downloadingMaster}
                      className="px-4 py-2 rounded-xl text-xs font-black text-[#06182B] bg-gradient-to-r from-[#FDE68A] via-[#D4AF37] to-[#E2B755] hover:brightness-105 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {downloadingMaster ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} strokeWidth={2.5} />
                          <span>Download Master PDF</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-full sm:w-48 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                      <span>Progress</span>
                      <span>{Math.round((completedSessions.length / 3) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (completedSessions.length / 3) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category Filter Tabs */}
        {completedSessions.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar touch-pan-x">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                selectedCategory === "all"
                  ? "bg-[#0755E8] text-white shadow-sm shadow-[#0755E8]/25"
                  : "bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0755E8] border border-slate-200 shadow-2xs"
              }`}
            >
              <span>All Certificates</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums transition-colors ${
                  selectedCategory === "all"
                    ? "bg-white/20 text-white"
                    : "bg-white text-slate-700 shadow-2xs border border-slate-200/60"
                }`}
              >
                {completedSessions.length}
              </span>
            </button>

            {categories.map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                    isActive
                      ? "bg-[#0755E8] text-white shadow-sm shadow-[#0755E8]/25"
                      : "bg-white hover:bg-blue-50 text-slate-700 hover:text-[#0755E8] border border-slate-200 shadow-2xs"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isActive ? "bg-emerald-400 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  <span>{cat.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-white text-slate-700 shadow-2xs border border-slate-200/60"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
          <div>
            {filteredCertificates.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/70 p-12 sm:p-16 text-center flex flex-col items-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#EAF2FF] border border-[#BFD7FE] flex items-center justify-center mb-4 text-[#0755E8] shadow-sm">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-gray-900 font-black text-base mb-1">No Certificates Found</h3>
                <p className="text-gray-500 font-medium text-xs max-w-sm mx-auto leading-relaxed">
                  {completedSessions.length === 0
                    ? "Complete mock interview sessions with verified industry experts to earn official verified Certificates of Completion."
                    : "No certificates found in this selected category."}
                </p>
                {completedSessions.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate('/find-mentor')}
                    className="mt-6 px-6 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Briefcase size={14} />
                    <span>Explore Interview Experts</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className="mt-6 px-5 py-2 border border-slate-200 hover:border-[#0755E8] hover:text-[#0755E8] text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    View All Certificates
                  </button>
                )}
              </div>
            ) : (
              <div ref={certificatesListRef} className="space-y-6 scroll-mt-24">
                {/* Certificate Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 sm:gap-6">
                  {pagedCertificates.map((session) => {
                    const isDownloading = downloading === session.id;
                    const formattedIssueDate = getFormattedIssueDate(session);
                    const certIdString = `MCFY-${(session.id || "CERT").slice(-8).toUpperCase()}`;

                    return (
                      <article
                        key={session.id}
                        className="group relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 hover:border-[#0755E8]/40 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_-6px_rgba(7,85,232,0.12)] transition-all duration-200 p-3.5 sm:p-4.5 flex flex-col justify-between h-full w-full text-left box-border"
                      >
                        <div className="space-y-3 flex-1 flex flex-col">
                          {/* Certificate Visual Thumbnail Preview with Reduced Compact Size */}
                          <div className="w-full flex items-center justify-center bg-slate-50/80 rounded-xl p-2 sm:p-2.5 border border-slate-100/80">
                            <div
                              onClick={() => {
                                setIsMasterSelected(false);
                                setSelectedSession(session);
                              }}
                              className="relative w-full max-w-[260px] sm:max-w-[290px] aspect-[1000/707] rounded-lg sm:rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs group/thumb cursor-pointer bg-white transition-all duration-200 hover:shadow-md hover:border-[#0755E8]/60 hover:scale-[1.02]"
                              title="Click to view full certificate preview"
                            >
                              <CertificateThumbnail
                                userName={user?.name || "Candidate"}
                                domain={session.category || "IT"}
                                expertName={session.expert}
                                issueDateStr={formattedIssueDate}
                                certId={certIdString}
                              />
                              
                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-[#06182B]/60 backdrop-blur-[1px] opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 text-white">
                                <span className="px-3 py-1 rounded-lg bg-white/20 border border-white/30 text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-md">
                                  <Eye size={13} />
                                  <span>Click to Preview</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 1. Header: Certificate Title & Recipient + Verification Tag */}
                          <div className="flex items-start justify-between gap-2.5 pt-0.5">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/60 flex items-center justify-center text-[#0755E8] shrink-0 shadow-2xs">
                                <Award className="w-5 h-5 text-[#0755E8]" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="font-black text-slate-900 text-sm sm:text-[15px] truncate group-hover:text-[#0755E8] transition-colors leading-tight">
                                  {session.category || "Professional"} Mock Interview Certificate
                                </h3>

                                <p className="text-xs font-semibold text-slate-500 truncate mt-1 leading-tight flex items-center gap-1.5">
                                  <span>Certificate of Completion</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-700 font-bold">{user?.name || "Candidate"}</span>
                                </p>
                              </div>
                            </div>

                            {/* Verified Credential Tag */}
                            <div className="shrink-0 pt-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-tight shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified Credential</span>
                              </span>
                            </div>
                          </div>

                          {/* 2. Structured Certificate Credential Details Box */}
                          <div className="bg-[#F8FAFC] group-hover:bg-[#F3F6FD]/70 border border-slate-200/70 group-hover:border-[#93B8FF]/40 rounded-2xl p-3 sm:p-3.5 space-y-2.5 transition-colors duration-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {/* Specialization / Category */}
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  Specialization
                                </span>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                                  <Briefcase className="w-3.5 h-3.5 text-[#0755E8] shrink-0" />
                                  <span className="truncate">{session.category || "IT"}</span>
                                </div>
                              </div>

                              {/* Issue Date */}
                              <div className="space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  Issue Date
                                </span>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                                  <Calendar className="w-3.5 h-3.5 text-[#0755E8] shrink-0" />
                                  <span className="truncate">{formattedIssueDate}</span>
                                </div>
                              </div>
                            </div>

                            {/* Evaluator & Issuer Row */}
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0 flex items-center gap-1.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                                  Conferred by:
                                </span>
                                <span className="font-bold text-slate-800 truncate">
                                  {session.expert}
                                </span>
                                <span className="text-slate-400 font-normal truncate">
                                  ({session.company || "Mockeefy"})
                                </span>
                              </div>

                              {session.expertReview?.overallRating && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black shrink-0">
                                  ★ {session.expertReview.overallRating}/5 Score
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3. Certificate Action Row */}
                        <div className="w-full pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10.5px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80 truncate">
                              ID: {certIdString}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setIsMasterSelected(false);
                                setSelectedSession(session);
                              }}
                              className="px-3 py-2 border border-slate-200 hover:border-[#0755E8] hover:text-[#0755E8] hover:bg-[#EAF2FF]/40 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPDF(session)}
                              disabled={isDownloading}
                              className="px-3.5 py-2 border border-slate-200 hover:border-[#0755E8] hover:text-[#0755E8] text-slate-700 hover:bg-[#EAF2FF]/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-white cursor-pointer shadow-2xs disabled:opacity-60"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 size={13} className="animate-spin text-[#0755E8]" />
                                  <span>Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <Download size={13} strokeWidth={2.5} />
                                  <span>Download PDF</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination footer (desktop) */}
                {filteredCertificates.length > PAGE_SIZE && (
                  <div className="hidden md:flex items-center justify-between pt-5 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-gray-500">
                      Showing <span className="text-gray-800 tabular-nums">{pageStartIdx + 1}</span>–<span className="text-gray-800 tabular-nums">{pageEndIdx}</span> of{" "}
                      <span className="text-gray-800 tabular-nums">{filteredCertificates.length}</span> certificates
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-black hover:border-[#0755E8] hover:text-[#0755E8] disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-all cursor-pointer"
                      >
                        Prev
                      </button>
                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-black text-slate-800 tabular-nums">
                        Page {page} of {totalPages}
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-black hover:border-[#0755E8] hover:text-[#0755E8] disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-all cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {/* Pagination footer (mobile) */}
                {filteredCertificates.length > PAGE_SIZE && (
                  <div className="md:hidden pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    <div className="text-xs font-bold text-slate-700 tabular-nums">
                      {pageStartIdx + 1}-{pageEndIdx} of {filteredCertificates.length}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

      {/* Certificate View Modal */}
      {(selectedSession || isMasterSelected) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-950/75 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto border border-slate-200/80">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="font-black text-gray-900 flex items-center gap-2 text-base">
                <Award className="text-[#0755E8]" />
                {isMasterSelected ? "Master Certificate Preview" : "Verified Mockeefy Certificate of Completion"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setIsMasterSelected(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-3 sm:p-6 bg-slate-100/70 flex flex-col items-center gap-4 overflow-x-auto">
              <div className="w-full max-w-[1000px] shadow-2xl rounded-xl overflow-hidden border border-slate-200 bg-white">
                <div className="w-full overflow-x-auto">
                  <CertificateTemplate
                    userName={user?.name || "Candidate"}
                    domain={isMasterSelected ? "Master" : (selectedSession?.category || "IT")}
                    expertName={
                      isMasterSelected
                        ? "Mockeefy Board of Directors"
                        : (selectedSession?.expert || "Verified Mockeefy Expert")
                    }
                    issueDateStr={
                      isMasterSelected
                        ? new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                        : (selectedSession ? getFormattedIssueDate(selectedSession) : new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }))
                    }
                    certId={isMasterSelected ? masterCertId : `MCFY-${(selectedSession?.id || "CERT").slice(-8).toUpperCase()}`}
                    isMaster={isMasterSelected}
                  />
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
              <button
                type="button"
                disabled={Boolean(downloading) || downloadingMaster}
                onClick={async () => {
                  if (isMasterSelected) {
                    await handleDownloadMasterPDF();
                  } else if (selectedSession) {
                    await handleDownloadPDF(selectedSession);
                  }
                }}
                className="px-5 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-60"
              >
                {Boolean(downloading) || downloadingMaster ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Generating Official PDF...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download Official PDF Certificate</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setIsMasterSelected(false);
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Off-Screen Capture Stage for Vector-Perfect A4 Landscape PDF */}
      <div
        id="pdf-capture-container"
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-99999px",
          left: "-99999px",
          width: "1000px",
          height: "707px",
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: -99999,
        }}
      >
        <div ref={pdfRenderRef} id="pdf-capture-stage" style={{ width: "1000px", height: "707px" }}>
          {downloadTarget && (
            <CertificateTemplate
              userName={user?.name || "Candidate"}
              domain={downloadTarget.isMaster ? "Master" : (downloadTarget.session?.category || "IT")}
              expertName={
                downloadTarget.isMaster
                  ? "Mockeefy Board of Directors"
                  : (downloadTarget.session?.expert || "Verified Mockeefy Expert")
              }
              issueDateStr={
                downloadTarget.isMaster
                  ? new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                  : (downloadTarget.session ? getFormattedIssueDate(downloadTarget.session) : "")
              }
              certId={
                downloadTarget.isMaster
                  ? masterCertId
                  : `MCFY-${(downloadTarget.session?.id || "").slice(-8).toUpperCase()}`
              }
              isMaster={downloadTarget.isMaster}
            />
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
