import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../lib/axios";
import {
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  Calendar,
  Download,
  Eye,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import CertificatesSkeleton from "../components/CertificatesSkeleton";

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

// Helper to calculate responsive font size for recipient name based on character count
const getRecipientNameFontSize = (name: string): string => {
  const len = (name || "").trim().length;
  if (len <= 14) return "48px";
  if (len <= 20) return "40px";
  if (len <= 28) return "32px";
  if (len <= 36) return "26px";
  return "22px";
};

/**
 * Formats the user's profile name for certificate display:
 * - Every word has its first character capitalized and remaining characters in lowercase
 * - Strips unnecessary or excessive spaces
 * - Strips legacy parenthetical role markers if present (e.g. "(user)")
 */
const formatCertificateName = (rawName?: string | null): string => {
  if (!rawName || typeof rawName !== "string") return "Candidate";

  // Remove any legacy parenthetical role indicators like (user), (candidate), (expert), etc.
  const stripped = rawName.replace(/\s*\((?:user|candidate|expert|coach|mentor|admin)\)\s*/gi, " ");

  // Normalize multi-spaces & trim
  const cleaned = stripped.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Candidate";

  return cleaned
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

// ============================================================================
// APPROVED CERTIFICATE TEMPLATE — DETERMINISTIC 1000 × 707 CANONICAL CANVAS
// LOCKED DESIGN: 100% MATCHES THE APPROVED REFERENCE IMAGE
// ============================================================================
const CertificateTemplate = ({
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
  const sessionText = isMaster
    ? "Successfully demonstrated comprehensive mastery across multiple technical domains, interview readiness, and elite communication."
    : `Successfully completed a structured mock interview in the ${displayDomain} domain, demonstrating dedication to improving interview skills and professional growth.`;

  const plaqueText = isMaster
    ? "MASTER INTERVIEW READINESS CERTIFICATION"
    : `${displayDomain} PROFESSIONAL MOCK INTERVIEW SESSION`;

  const recipientFontSize = getRecipientNameFontSize(userName);

  return (
    <div
      id="mockeefy-official-certificate"
      className="relative overflow-hidden select-none box-border"
      style={{
        width: "1000px",
        height: "707px",
        backgroundColor: "#FAF8F4",
        color: "#08172A",
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
    >
      {/* 1. MASTER ARCHITECTURAL VECTOR & BACKGROUND LAYER (1000 x 707) */}
      <svg
        className="absolute inset-0 pointer-events-none select-none"
        style={{ width: "1000px", height: "707px" }}
        viewBox="0 0 1000 707"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Gold Primary Linear Gradient */}
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9A7210" />
            <stop offset="18%" stopColor="#D4AF37" />
            <stop offset="42%" stopColor="#FFF9E6" />
            <stop offset="65%" stopColor="#D4AF37" />
            <stop offset="85%" stopColor="#AA7C11" />
            <stop offset="100%" stopColor="#785307" />
          </linearGradient>

          {/* 3D Gold Ribbon Sash Gradient (Top-Left) */}
          <linearGradient id="goldRibbonGradTL" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5A3A02" />
            <stop offset="12%" stopColor="#C5A059" />
            <stop offset="38%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="64%" stopColor="#EAB308" />
            <stop offset="85%" stopColor="#9A7210" />
            <stop offset="100%" stopColor="#5A3A02" />
          </linearGradient>

          {/* 3D Gold Ribbon Sash Gradient (Bottom-Right) */}
          <linearGradient id="goldRibbonGradBR" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5A3A02" />
            <stop offset="12%" stopColor="#C5A059" />
            <stop offset="38%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="64%" stopColor="#EAB308" />
            <stop offset="85%" stopColor="#9A7210" />
            <stop offset="100%" stopColor="#5A3A02" />
          </linearGradient>

          {/* Deep Midnight Navy Corner Block Gradient */}
          <linearGradient id="navyCornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030A14" />
            <stop offset="45%" stopColor="#08172A" />
            <stop offset="80%" stopColor="#0E233D" />
            <stop offset="100%" stopColor="#08172A" />
          </linearGradient>

          {/* Solid Radial Metallic Gold Core Disc */}
          <radialGradient id="medallionCore" cx="45%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#FFFDF0" />
            <stop offset="25%" stopColor="#FDE68A" />
            <stop offset="55%" stopColor="#D4AF37" />
            <stop offset="80%" stopColor="#9A7210" />
            <stop offset="100%" stopColor="#5A3A02" />
          </radialGradient>

          {/* Paper Vignette Subtle Depth */}
          <radialGradient id="paperVignette" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#FAF8F4" stopOpacity="0" />
            <stop offset="100%" stopColor="#F1ECE0" stopOpacity="0.32" />
          </radialGradient>

          {/* Drop Shadows */}
          <filter id="ribbonShadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="-2" dy="5" stdDeviation="6" floodColor="#08172A" floodOpacity="0.36" />
          </filter>
          <filter id="ribbonShadowBR" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="2" dy="-5" stdDeviation="6" floodColor="#08172A" floodOpacity="0.36" />
          </filter>
          <filter id="medallionShadow" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#08172A" floodOpacity="0.32" />
          </filter>
          <filter id="plaqueShadow" x="-15%" y="-20%" width="130%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#08172A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Paper Vignette Subtle Layer */}
        <rect width="1000" height="707" fill="url(#paperVignette)" />

        {/* Multi-Layered Architectural Frame */}
        <rect x="14" y="14" width="972" height="679" fill="none" stroke="url(#goldGrad)" strokeWidth="3.5" />
        <rect x="18" y="18" width="964" height="671" fill="none" stroke="#08172A" strokeWidth="0.8" opacity="0.65" />
        <rect x="23" y="23" width="954" height="661" fill="none" stroke="url(#goldGrad)" strokeWidth="1.2" />

        {/* Frame Midpoint Diamond Finials */}
        <polygon points="500,10 504,14 500,18 496,14" fill="url(#goldGrad)" />
        <polygon points="500,689 504,693 500,697 496,693" fill="url(#goldGrad)" />
        <polygon points="10,353.5 14,349.5 18,353.5 14,357.5" fill="url(#goldGrad)" />
        <polygon points="982,353.5 986,349.5 990,353.5 986,357.5" fill="url(#goldGrad)" />

        {/* Central Botanical Watermark Rosette */}
        <g transform="translate(500, 316)" opacity="0.048" stroke="#1D4ED8" fill="none" strokeWidth="0.8">
          <circle r="150" strokeDasharray="3,3" />
          <circle r="130" strokeDasharray="4,4" />
          <circle r="110" />
          <circle r="90" strokeDasharray="2,2" />
          <circle r="70" />
          <circle r="50" strokeDasharray="2,2" />
          <circle r="30" />
          <path d="M -150,0 L 150,0 M 0,-150 L 0,150 M -106,-106 L 106,106 M -106,106 L 106,-106" />
        </g>

        {/* Grand Botanical Laurel Watermark Wreath */}
        <g transform="translate(500, 345)" opacity="0.07" fill="#D4AF37" stroke="#9A7210" strokeWidth="0.5">
          <g transform="scale(-1, 1)">
            <path
              d="M 30,70 C 120,60 210,0 230,-120 C 240,-180 200,-230 160,-270"
              fill="none"
              stroke="#AA7C11"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path d="M 40,68 C 65,80 90,75 105,55 C 85,50 65,55 40,68 Z" />
            <path d="M 52,60 C 70,50 82,35 84,18 C 68,25 58,40 52,60 Z" />
            <path d="M 85,50 C 115,55 138,40 148,20 C 126,15 105,25 85,50 Z" />
            <path d="M 94,40 C 115,25 125,5 124,-18 C 108,-10 98,12 94,40 Z" />
            <path d="M 128,25 C 160,24 180,5 186,-18 C 162,-20 144,-7 128,25 Z" />
            <path d="M 132,12 C 150,-8 158,-30 148,-52 C 136,-40 132,-20 132,12 Z" />
            <path d="M 162,-10 C 192,-18 206,-42 204,-68 C 182,-62 170,-42 162,-10 Z" />
            <path d="M 160,-28 C 174,-52 176,-78 162,-100 C 152,-84 152,-62 160,-28 Z" />
            <path d="M 184,-55 C 212,-70 218,-98 210,-124 C 190,-112 182,-90 184,-55 Z" />
            <path d="M 176,-75 C 185,-102 180,-128 162,-148 C 156,-130 160,-108 176,-75 Z" />
            <path d="M 194,-108 C 218,-128 218,-156 204,-180 C 186,-164 182,-142 194,-108 Z" />
            <path d="M 178,-130 C 182,-158 170,-184 150,-202 C 148,-184 154,-162 178,-130 Z" />
            <path d="M 188,-165 C 206,-188 200,-214 182,-234 C 168,-218 168,-198 188,-165 Z" />
            <path d="M 166,-195 C 165,-220 148,-244 126,-258 C 128,-240 138,-222 166,-195 Z" />
          </g>
          <g>
            <path
              d="M 30,70 C 120,60 210,0 230,-120 C 240,-180 200,-230 160,-270"
              fill="none"
              stroke="#AA7C11"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path d="M 40,68 C 65,80 90,75 105,55 C 85,50 65,55 40,68 Z" />
            <path d="M 52,60 C 70,50 82,35 84,18 C 68,25 58,40 52,60 Z" />
            <path d="M 85,50 C 115,55 138,40 148,20 C 126,15 105,25 85,50 Z" />
            <path d="M 94,40 C 115,25 125,5 124,-18 C 108,-10 98,12 94,40 Z" />
            <path d="M 128,25 C 160,24 180,5 186,-18 C 162,-20 144,-7 128,25 Z" />
            <path d="M 132,12 C 150,-8 158,-30 148,-52 C 136,-40 132,-20 132,12 Z" />
            <path d="M 162,-10 C 192,-18 206,-42 204,-68 C 182,-62 170,-42 162,-10 Z" />
            <path d="M 160,-28 C 174,-52 176,-78 162,-100 C 152,-84 152,-62 160,-28 Z" />
            <path d="M 184,-55 C 212,-70 218,-98 210,-124 C 190,-112 182,-90 184,-55 Z" />
            <path d="M 176,-75 C 185,-102 180,-128 162,-148 C 156,-130 160,-108 176,-75 Z" />
            <path d="M 194,-108 C 218,-128 218,-156 204,-180 C 186,-164 182,-142 194,-108 Z" />
            <path d="M 178,-130 C 182,-158 170,-184 150,-202 C 148,-184 154,-162 178,-130 Z" />
            <path d="M 188,-165 C 206,-188 200,-214 182,-234 C 168,-218 168,-198 188,-165 Z" />
            <path d="M 166,-195 C 165,-220 148,-244 126,-258 C 128,-240 138,-222 166,-195 Z" />
          </g>
        </g>

        {/* Organic Flowing Guilloche Wave Ribbons (Left & Right Sides) */}
        <g opacity="0.085" stroke="#1D4ED8" fill="none" strokeWidth="0.85">
          <path d="M 14,140 C 90,165 175,235 155,335 C 135,435 65,505 14,545" />
          <path d="M 14,160 C 100,185 190,250 170,350 C 150,450 80,515 14,560" />
          <path d="M 14,180 C 110,205 205,265 185,365 C 165,465 95,525 14,575" />
          <path d="M 14,200 C 120,225 220,280 200,380 C 180,480 110,535 14,590" />
          <path d="M 14,220 C 130,245 235,295 215,395 C 195,495 125,545 14,605" />
          <path d="M 14,240 C 140,265 250,310 230,410 C 210,510 140,555 14,620" />
          <path d="M 14,260 C 150,285 265,325 245,425 C 225,525 155,565 14,635" />
          <path d="M 14,280 C 160,305 280,340 260,440 C 240,540 170,575 14,650" />
        </g>

        <g opacity="0.085" stroke="#1D4ED8" fill="none" strokeWidth="0.85">
          <path d="M 986,160 C 910,185 825,250 845,350 C 865,450 935,515 986,560" />
          <path d="M 986,180 C 900,205 810,265 830,365 C 850,465 920,525 986,575" />
          <path d="M 986,200 C 890,225 795,280 815,380 C 835,480 905,535 986,590" />
          <path d="M 986,220 C 880,245 780,295 800,395 C 820,495 890,545 986,605" />
          <path d="M 986,240 C 870,265 765,310 785,410 C 805,510 875,555 986,620" />
          <path d="M 986,260 C 860,285 750,325 770,425 C 790,525 860,565 986,635" />
          <path d="M 986,280 C 850,305 735,340 755,440 C 775,540 845,575 986,650" />
        </g>

        {/* Top-Left Corner Ornamentation */}
        <polygon points="14,14 175,14 14,175" fill="url(#navyCornerGrad)" />
        <g opacity="0.45" stroke="#93C5FD" fill="none" strokeWidth="0.75">
          <path d="M 14,40 C 45,40 60,14 60,14" />
          <path d="M 14,70 C 70,70 100,14 100,14" />
          <path d="M 14,100 C 95,95 135,14 135,14" />
          <path d="M 14,130 C 120,120 160,14 160,14" />
          <path d="M 14,160 C 145,145 185,14 185,14" />
        </g>
        <path d="M 23,23 L 60,23 M 23,23 L 23,60" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" />
        <polygon points="28,28 33,23 28,18 23,23" fill="#FDE68A" />

        <g filter="url(#ribbonShadow)">
          <polygon points="14,175 175,14 207,14 14,207" fill="url(#goldRibbonGradTL)" />
          <line x1="14" y1="175" x2="175" y2="14" stroke="#5A3A02" strokeWidth="1.8" />
          <line x1="14" y1="207" x2="207" y2="14" stroke="#FFF9E6" strokeWidth="1.8" />
          <line x1="14" y1="192" x2="192" y2="14" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.9" />
        </g>

        {/* Bottom-Right Corner Ornamentation */}
        <polygon points="986,525 986,693 818,693" fill="url(#navyCornerGrad)" />
        <g opacity="0.45" stroke="#93C5FD" fill="none" strokeWidth="0.75">
          <path d="M 986,667 C 955,667 940,693 940,693" />
          <path d="M 986,637 C 930,637 900,693 900,693" />
          <path d="M 986,607 C 905,612 865,693 865,693" />
          <path d="M 986,577 C 880,587 840,693 840,693" />
          <path d="M 986,547 C 855,562 815,693 815,693" />
        </g>
        <path d="M 977,684 L 940,684 M 977,684 L 977,647" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" />
        <polygon points="972,679 977,684 972,689 967,684" fill="#FDE68A" />

        <g filter="url(#ribbonShadowBR)">
          <polygon points="986,493 986,525 818,693 786,693" fill="url(#goldRibbonGradBR)" />
          <line x1="986" y1="525" x2="818" y2="693" stroke="#5A3A02" strokeWidth="1.8" />
          <line x1="986" y1="493" x2="786" y2="693" stroke="#FFF9E6" strokeWidth="1.8" />
          <line x1="986" y1="508" x2="801" y2="693" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.9" />
        </g>

        {/* Bottom-Left Corner Ornamentation */}
        <polygon points="14,635 14,693 72,693" fill="url(#navyCornerGrad)" />
        <path d="M 23,684 L 60,684 M 23,684 L 23,647" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" />
        <polygon points="28,679 33,684 28,689 23,684" fill="#FDE68A" />

        {/* Top-Right Corner & Hanging Credential Banner */}
        <polygon points="928,14 986,14 986,72" fill="url(#navyCornerGrad)" />
        <path d="M 977,23 L 940,23 M 977,23 L 977,60" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" />
        <polygon points="972,28 977,23 972,18 967,23" fill="#FDE68A" />

        <g transform="translate(774, 14)" filter="url(#plaqueShadow)">
          <path d="M 0,0 L 132,0 L 132,216 L 66,246 L 0,216 Z" fill="#08172A" />
          <path d="M 0,0 L 132,0 L 132,216 L 66,246 L 0,216 Z" fill="none" stroke="url(#goldGrad)" strokeWidth="2.2" />
          <path d="M 5,0 L 127,0 L 127,212 L 66,239 L 5,212 Z" fill="none" stroke="#C5A059" strokeWidth="0.8" opacity="0.85" />

          <g transform="translate(66, 32) scale(0.95)">
            <path
              d="M -15,-6 L -9,9 L 9,9 L 15,-6 L 7.5,0 L 0,-13 L -7.5,0 Z"
              fill="url(#goldGrad)"
              stroke="#AA7C11"
              strokeWidth="0.5"
            />
            <circle cx="-15" cy="-8" r="1.6" fill="#FDE68A" />
            <circle cx="0" cy="-15" r="1.8" fill="#FDE68A" />
            <circle cx="15" cy="-8" r="1.6" fill="#FDE68A" />
            <rect x="-9" y="7.5" width="18" height="1.6" fill="#FDE68A" rx="0.5" />
          </g>

          <text x="66" y="70" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" letterSpacing="2.2" fontFamily="'Plus Jakarta Sans', sans-serif">
            OFFICIAL
          </text>
          <text x="66" y="86" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" letterSpacing="2.2" fontFamily="'Plus Jakarta Sans', sans-serif">
            CAREER
          </text>
          <text x="66" y="102" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" letterSpacing="2.2" fontFamily="'Plus Jakarta Sans', sans-serif">
            CREDENTIAL
          </text>

          <line x1="26" y1="118" x2="106" y2="118" stroke="#C5A059" strokeWidth="1" opacity="0.85" />
          <polygon points="66,115.5 68.5,118 66,120.5 63.5,118" fill="#FDE68A" />

          <text x="66" y="142" textAnchor="middle" fill="#E5D5B8" fontSize="10.5" fontStyle="italic" fontFamily="'Cormorant Garamond', Georgia, serif">
            Recognizing
          </text>
          <text x="66" y="158" textAnchor="middle" fill="#E5D5B8" fontSize="10.5" fontStyle="italic" fontFamily="'Cormorant Garamond', Georgia, serif">
            Your Dedication
          </text>
          <text x="66" y="174" textAnchor="middle" fill="#E5D5B8" fontSize="10.5" fontStyle="italic" fontFamily="'Cormorant Garamond', Georgia, serif">
            and Professional
          </text>
          <text x="66" y="190" textAnchor="middle" fill="#E5D5B8" fontSize="10.5" fontStyle="italic" fontFamily="'Cormorant Garamond', Georgia, serif">
            Growth
          </text>
        </g>

        {/* Central Session Plaque */}
        <g transform="translate(500, 458)" filter="url(#plaqueShadow)">
          <line x1="-245" y1="0" x2="-214" y2="0" stroke="url(#goldGrad)" strokeWidth="1.6" />
          <polygon points="-245,0 -249,-3.5 -253,0 -249,3.5" fill="url(#goldGrad)" />

          <line x1="214" y1="0" x2="245" y2="0" stroke="url(#goldGrad)" strokeWidth="1.6" />
          <polygon points="245,0 249,-3.5 253,0 249,3.5" fill="url(#goldGrad)" />

          <polygon points="0,-25.5 3.5,-22 0,-18.5 -3.5,-22" fill="url(#goldGrad)" />

          <polygon
            points="-214,0 -194,-22 194,-22 214,0 194,22 -194,22"
            fill="#08172A"
            stroke="url(#goldGrad)"
            strokeWidth="2.0"
          />
          <polygon
            points="-208,0 -191,-18 191,-18 208,0 191,18 -191,18"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="0.8"
            opacity="0.85"
          />

          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="800"
            letterSpacing="2.2"
            fontFamily="'Plus Jakarta Sans', sans-serif"
          >
            {plaqueText}
          </text>
        </g>

        {/* Hero Embossed Gold Medallion & Compact Laurel Wreath */}
        <g transform="translate(500, 554)">
          <g transform="scale(-1, 1)">
            <path d="M 14,40 C 35,38 52,22 56,-2 C 58,-12 53,-18 47,-22" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 18,41 C 27,45 36,42 41,34 C 33,31 26,34 18,41 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 21,37 C 28,32 32,25 33,16 C 27,20 23,27 21,37 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 36,33 C 48,35 56,28 60,19 C 51,16 43,21 36,33 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 39,28 C 48,21 52,13 52,3 C 45,7 41,16 39,28 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 52,16 C 64,15 71,7 74,-3 C 64,-2 57,4 52,16 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 53,11 C 61,3 64,-6 60,-14 C 55,-9 54,-1 53,11 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 56,-2 C 67,-6 72,-16 70,-26 C 61,-22 57,-13 56,-2 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
          </g>
          <g>
            <path d="M 14,40 C 35,38 52,22 56,-2 C 58,-12 53,-18 47,-22" fill="none" stroke="url(#goldGrad)" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 18,41 C 27,45 36,42 41,34 C 33,31 26,34 18,41 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 21,37 C 28,32 32,25 33,16 C 27,20 23,27 21,37 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 36,33 C 48,35 56,28 60,19 C 51,16 43,21 36,33 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 39,28 C 48,21 52,13 52,3 C 45,7 41,16 39,28 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 52,16 C 64,15 71,7 74,-3 C 64,-2 57,4 52,16 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 53,11 C 61,3 64,-6 60,-14 C 55,-9 54,-1 53,11 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
            <path d="M 56,-2 C 67,-6 72,-16 70,-26 C 61,-22 57,-13 56,-2 Z" fill="url(#goldGrad)" stroke="#8A6205" strokeWidth="0.4" />
          </g>
          <circle cx="0" cy="42" r="3.5" fill="url(#goldGrad)" />
          <path d="M -4,44 Q -12,48 -16,56 M 4,44 Q 12,48 16,56" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" />

          {/* 3D Scalloped Starburst Gold Medallion Badge */}
          <g filter="url(#medallionShadow)">
            <circle r="44" fill="url(#goldGrad)" />
            <g fill="url(#goldGrad)">
              <rect x="-44" y="-7" width="88" height="14" rx="7" />
              <rect x="-44" y="-7" width="88" height="14" rx="7" transform="rotate(25.7)" />
              <rect x="-44" y="-7" width="88" height="14" rx="7" transform="rotate(51.4)" />
              <rect x="-44" y="-7" width="88" height="14" rx="7" transform="rotate(77.1)" />
              <rect x="-44" y="-7" width="88" height="14" rx="7" transform="rotate(102.8)" />
              <rect x="-44" y="-7" width="88" height="14" rx="7" transform="rotate(128.5)" />
              <rect x="-44" y="-7" width="88" height="14" rx="7" transform="rotate(154.2)" />
            </g>
            <circle r="40" fill="none" stroke="#785307" strokeWidth="1.2" />
            <circle r="38" fill="none" stroke="#FFF9E6" strokeWidth="1" />
            <circle r="34.5" fill="none" stroke="#FDE68A" strokeWidth="1.4" strokeDasharray="1.8, 1.6" />
            <circle r="31" fill="none" stroke="#AA7C11" strokeWidth="1.2" />
            <circle r="27" fill="url(#medallionCore)" stroke="#FFF9E6" strokeWidth="0.8" />

            <g transform="translate(0, -9) scale(0.68)">
              <path d="M -15,-6 L -9,9 L 9,9 L 15,-6 L 7.5,0 L 0,-13 L -7.5,0 Z" fill="#FFF9E6" stroke="#8A6205" strokeWidth="0.6" />
              <circle cx="-15" cy="-8" r="1.8" fill="#FFFFFF" />
              <circle cx="0" cy="-15" r="2.2" fill="#FFFFFF" />
              <circle cx="15" cy="-8" r="1.8" fill="#FFFFFF" />
              <rect x="-9" y="7.5" width="18" height="1.8" fill="#AA7C11" rx="0.5" />
            </g>

            <text
              x="0"
              y="15"
              textAnchor="middle"
              fill="#FFFDF0"
              stroke="#785307"
              strokeWidth="0.6"
              fontSize="21"
              fontWeight="900"
              fontFamily="'Cinzel', Georgia, serif"
            >
              M
            </text>
          </g>
        </g>

        {/* Lower Section Baselines */}
        <line x1="80" y1="612" x2="260" y2="612" stroke="url(#goldGrad)" strokeWidth="1.2" />
        <line x1="680" y1="612" x2="840" y2="612" stroke="url(#goldGrad)" strokeWidth="1.2" />

        {/* Director Handwritten Ink Signature Stroke */}
        <path
          d="M 692,596 Q 712,580 728,598 T 764,592 T 800,598 T 832,588"
          fill="none"
          stroke="#08172A"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* 2. TYPOGRAPHIC HTML OVERLAYS */}
      <div className="absolute left-0 right-0 text-center" style={{ top: "40px" }}>
        <div className="flex items-center justify-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{ background: "#2563EB" }}
          >
            M
          </div>
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#08172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Mockeefy
          </span>
          {/* Verified Badge Icon */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 1.5l1.6 2.5 2.9-.5 1 2.8 2.8.9.2 3 2.3 1.9-1.2 2.8 1.2 2.8-2.3 1.9-.2 3-2.8.9-1 2.8-2.9-.5L12 22.5l-1.6-2.5-2.9.5-1-2.8-2.8-.9-.2-3-2.3-1.9 1.2-2.8-1.2-2.8 2.3-1.9.2-3 2.8-.9 1-2.8 2.9.5L12 1.5z"
              fill="#D4AF37"
              stroke="#8A6205"
              strokeWidth="0.5"
            />
            <circle cx="12" cy="12" r="6" fill="#08172A" />
            <path
              d="M9.2 12.2l1.8 1.8 3.8-3.8"
              stroke="#FFF9E6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div
          className="text-[9.5px] uppercase font-bold mt-1"
          style={{ color: "#475569", letterSpacing: "0.28em" }}
        >
          PRACTICE • IMPROVE • SUCCEED.
        </div>
      </div>

      {/* Primary Certificate Heading Block */}
      <div className="absolute left-0 right-0 text-center" style={{ top: "104px" }}>
        <h1
          className="font-serif tracking-widest text-[#08172A] uppercase"
          style={{
            fontSize: "46px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            margin: 0,
            lineHeight: 1,
            fontFamily: "'Cinzel', Georgia, serif",
          }}
        >
          CERTIFICATE
        </h1>

        <div className="flex items-center justify-center" style={{ marginTop: "6px", marginBottom: "6px" }}>
          <div
            style={{
              width: "150px",
              height: "1.2px",
              background: "linear-gradient(90deg, transparent, #C5A059, #FDE68A, #C5A059)",
            }}
          />
          <span
            className="italic text-[#AA7C11] px-4"
            style={{
              fontSize: "24px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              lineHeight: 1,
              padding: "0 16px",
            }}
          >
            of
          </span>
          <div
            style={{
              width: "150px",
              height: "1.2px",
              background: "linear-gradient(90deg, #C5A059, #FDE68A, #C5A059, transparent)",
            }}
          />
        </div>

        <h2
          className="font-serif tracking-widest text-[#08172A] uppercase"
          style={{
            fontSize: "46px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            margin: 0,
            lineHeight: 1,
            fontFamily: "'Cinzel', Georgia, serif",
          }}
        >
          COMPLETION
        </h2>

        <div className="flex items-center justify-center" style={{ marginTop: "10px" }}>
          <div
            style={{
              width: "280px",
              height: "1.2px",
              background:
                "linear-gradient(90deg, transparent, #AA7C11, #D4AF37, #FDE68A, #D4AF37, #AA7C11, transparent)",
            }}
          />
        </div>
      </div>

      {/* Recipient Presentation Block */}
      <div className="absolute left-0 right-0 text-center" style={{ top: "254px" }}>
        <p
          className="text-[11px] font-semibold tracking-[0.25em] text-[#6B7280] uppercase"
          style={{ margin: 0, letterSpacing: "0.28em" }}
        >
          THIS CERTIFIES THAT
        </p>

        <h3
          className="font-serif text-[#08172A]"
          style={{
            fontSize: recipientFontSize,
            fontWeight: 700,
            margin: "4px 0 0 0",
            lineHeight: 1.15,
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          {userName}
        </h3>

        <div className="flex items-center justify-center" style={{ marginTop: "8px" }}>
          <div
            style={{
              width: "280px",
              height: "1.2px",
              background: "linear-gradient(90deg, transparent, #AA7C11, #D4AF37, #AA7C11, transparent)",
            }}
          />
        </div>

        <p
          className="text-[12px] text-[#475569] max-w-[620px] mx-auto leading-relaxed"
          style={{
            marginTop: "12px",
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.55,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {isMaster ? (
            sessionText
          ) : (
            <>
              Successfully completed a structured mock interview in the{" "}
              <strong style={{ color: "#08172A", fontWeight: 700 }}>{displayDomain}</strong>{" "}
              domain, demonstrating dedication to improving interview skills and professional growth.
            </>
          )}
        </p>
      </div>

      {/* Lower Left: Official Issuer Block */}
      <div className="absolute" style={{ left: "80px", top: "546px", width: "200px" }}>
        <p
          className="text-[8.5px] uppercase font-bold text-[#64748B]"
          style={{ letterSpacing: "0.14em", margin: 0 }}
        >
          MOCKEEFY CERTIFICATE ISSUED BY :
        </p>
        <p className="text-[17px] font-bold text-[#08172A]" style={{ margin: "4px 0 0 0", lineHeight: 1.2 }}>
          {expertName || "Godson Arockia Raj A"}
        </p>
        <p className="text-[11px] text-[#64748B]" style={{ margin: "3px 0 0 0" }}>
          Issued on {issueDateStr}
        </p>
        <p className="text-[8.5px] font-mono text-[#94A3B8]" style={{ marginTop: "16px" }}>
          ID: {certId}
        </p>
      </div>

      {/* Lower Right: Director Signature Block */}
      <div className="absolute text-center" style={{ left: "680px", width: "160px", top: "618px" }}>
        <p
          className="text-[10px] font-bold uppercase text-[#08172A]"
          style={{ letterSpacing: "0.16em", margin: 0 }}
        >
          DIRECTOR SIGNATURE
        </p>
        <p className="text-[9px] text-[#64748B]" style={{ margin: "2px 0 0 0" }}>
          Mockeefy Global Careers
        </p>
      </div>

      {/* Lower Center: Verification Statement */}
      <div className="absolute left-0 right-0 text-center" style={{ top: "648px" }}>
        <p
          className="text-[8px] uppercase font-semibold text-[#64748B]"
          style={{ letterSpacing: "0.22em", margin: 0 }}
        >
          OFFICIALLY VERIFIED & REGISTERED CREDENTIAL
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// CARD THUMBNAIL (Faithfully renders the canonical CertificateTemplate scaled)
// ============================================================================
const CertificateThumbnail = (props: {
  userName: string;
  domain?: string;
  expertName?: string;
  issueDateStr: string;
  certId: string;
  isMaster?: boolean;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.28);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    if (w > 0) setScale(w / 1000);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        if (w > 0) setScale(w / 1000);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden pointer-events-none select-none bg-[#FAF8F4]"
      style={{ aspectRatio: "1000 / 707" }}
    >
      <div
        style={{
          width: "1000px",
          height: "707px",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <CertificateTemplate {...props} />
      </div>
    </div>
  );
};

// ============================================================================
// LARGE CERTIFICATE MODAL PREVIEW SCALER
// Fits the 1000x707 certificate inside the modal viewport without distortion
// ============================================================================
const CertificateModalPreview = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.85);

  const calculateScale = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const paddingX = window.innerWidth < 640 ? 16 : 40;
    const paddingY = window.innerWidth < 640 ? 16 : 36;
    const availW = Math.max(100, rect.width - paddingX);
    const availH = Math.max(100, rect.height - paddingY);

    const scaleX = availW / 1000;
    const scaleY = availH / 707;
    const fittedScale = Math.min(scaleX, scaleY);

    setScale(fittedScale > 0.1 ? fittedScale : 0.85);
  };

  useLayoutEffect(() => {
    calculateScale();
  }, []);

  useEffect(() => {
    calculateScale();
    window.addEventListener("resize", calculateScale);
    const observer = new ResizeObserver(calculateScale);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", calculateScale);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-hidden min-h-0 min-w-0 select-none box-border"
      style={{ backgroundColor: "#060D1A" }}
    >
      <div
        style={{
          width: `${Math.round(1000 * scale)}px`,
          height: `${Math.round(707 * scale)}px`,
          position: "relative",
          boxShadow:
            "0 25px 70px -15px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          borderRadius: "6px",
          overflow: "hidden",
          backgroundColor: "#FAF8F4",
          flexShrink: 0,
          transition: "width 0.15s ease-out, height 0.15s ease-out",
        }}
      >
        <div
          style={{
            width: "1000px",
            height: "707px",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

interface CertificatesPageProps {
  showSkeletons?: boolean;
}

export default function CertificatesPage({ showSkeletons = false }: CertificatesPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isMasterSelected, setIsMasterSelected] = useState(false);
  const [isSampleSelected, setIsSampleSelected] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingMaster, setDownloadingMaster] = useState(false);
  const pdfRenderRef = useRef<HTMLDivElement>(null);
  const [downloadTarget, setDownloadTarget] = useState<{
    session: Session | null;
    isMaster: boolean;
    isSample?: boolean;
  } | null>(null);

  const getFormattedIssueDate = (session: Session) => {
    const rawDate = session.expertReview?.createdAt || session.startTime || new Date();
    const d = new Date(rawDate);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const candidateName = useMemo(() => {
    const rawName = user?.name || (user as any)?.personalInfo?.name || "";
    return formatCertificateName(rawName);
  }, [user]);

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

  // Check URL params for deep-linking into certificate preview
  useEffect(() => {
    const paramId = routeParams.certId || searchParams.get("sessionId") || searchParams.get("id");
    const paramMaster = searchParams.get("master") === "true";

    if (paramMaster) {
      setIsMasterSelected(true);
      return;
    }

    if (paramId && completedSessions.length > 0) {
      const match = completedSessions.find((s) => s.id === paramId || s.sessionId === paramId);
      if (match) {
        setSelectedSession(match);
      }
    }
  }, [completedSessions, routeParams.certId, searchParams]);

  // Lock background page scroll when modal is open
  useEffect(() => {
    const isModalOpen = Boolean(selectedSession || isMasterSelected || isSampleSelected);
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedSession, isMasterSelected, isSampleSelected]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!selectedSession && !isMasterSelected && !isSampleSelected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedSession(null);
        setIsMasterSelected(false);
        setIsSampleSelected(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSession, isMasterSelected, isSampleSelected]);

  // PDF Generation function
  const downloadElementAsPDF = async (element: HTMLElement, filename: string) => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#FAF8F4",
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
      await new Promise((resolve) => setTimeout(resolve, 300));
      const target = pdfRenderRef.current?.firstElementChild as HTMLElement | null;
      if (!target) throw new Error("Unable to locate certificate template");

      const name = candidateName.replace(/\s+/g, "_");
      const filename = `${name}_${sessionObj.category || "Interview"}_Certificate.pdf`;
      await downloadElementAsPDF(target, filename);
      toast.success("Certificate downloaded successfully!");
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error(err?.message ? `Download error: ${err.message}` : "Failed to generate PDF.");
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
      if (!target) throw new Error("Unable to locate master certificate template");

      const name = candidateName.replace(/\s+/g, "_");
      const filename = `${name}_Master_Interview_Certificate.pdf`;
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

  const handleDownloadSamplePDF = async () => {
    if (downloadingSample) return;
    setDownloadingSample(true);
    setDownloadTarget({ session: null, isMaster: false, isSample: true });

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const target = pdfRenderRef.current?.firstElementChild as HTMLElement | null;
      if (!target) throw new Error("Unable to locate certificate template");

      const name = candidateName.replace(/\s+/g, "_");
      const filename = `${name}_Sample_Certificate.pdf`;
      await downloadElementAsPDF(target, filename);
      toast.success("Sample Certificate downloaded successfully!");
    } catch (err: any) {
      console.error("Sample PDF download error:", err);
      toast.error("Failed to generate Sample Certificate PDF.");
    } finally {
      setDownloadingSample(false);
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
        const navOffset = 84;
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
      const userId = (user as any)?.id || (user as any)?._id || (user as any)?.userId;
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
          expert: s.expertDetails?.name || s.expertId?.name || "Godson Arockia Raj A",
          profileImage: s.expertDetails?.profileImage || s.expertId?.profileImage || null,
          company: s.expertDetails?.company || s.expertId?.company || "Mockeefy",
          role: s.expertDetails?.currentRole || s.expertDetails?.role || s.expertId?.currentRole || s.expertId?.role || "Interview Lead",
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
    <div className="w-full font-sans text-left selection:bg-[#EAF2FF] selection:text-[#0755E8]">
      <div className="w-full space-y-6 sm:space-y-8">
        {/* ================================================================== */}
        {/* 1. Header: My Certificates Title Row                               */}
        {/* ================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center text-[#0755E8] shrink-0 shadow-xs">
              <Award className="w-6 h-6 text-[#0755E8]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#172B4D] tracking-tight leading-tight">
                My Certificates
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#64748B] mt-0.5 truncate">
                Official verified credentials conferred from completed mock interviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#0755E8]/30 bg-white text-xs font-semibold text-[#0755E8] shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#0755E8]" />
              <span>OFFICIAL CREDENTIALS</span>
            </div>
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] shadow-xs">
              Total: {completedSessions.length}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 2. Master Credential Track Card — Redesigned SaaS Achievement Card */}
        {/* ================================================================== */}
        <div className="relative w-full max-w-none box-border rounded-[24px] overflow-hidden border border-[#93B8FF]/70 bg-[#FFFFFF] shadow-[0_12px_36px_rgba(7,85,232,0.08),0_2px_8px_rgba(23,43,77,0.04)] hover:shadow-[0_16px_44px_rgba(7,85,232,0.12)] transition-all duration-300">
          {/* Layered Multi-Atmospheric Radial & Linear Gradients */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              background: `
                radial-gradient(ellipse 65% 85% at 0% 100%, rgba(7, 85, 232, 0.12) 0%, rgba(147, 184, 255, 0.16) 40%, rgba(240, 246, 255, 0.3) 65%, transparent 100%),
                radial-gradient(ellipse 55% 70% at 100% 0%, rgba(147, 184, 255, 0.18) 0%, rgba(234, 242, 255, 0.25) 45%, transparent 80%),
                radial-gradient(circle 320px at 95% 85%, rgba(7, 85, 232, 0.06) 0%, transparent 70%),
                linear-gradient(135deg, #FFFFFF 0%, #FAFBFD 50%, #F5F8FF 100%)
              `,
            }}
          />

          {/* Deep atmospheric corner ambient glows */}
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-gradient-to-tr from-[#0755E8]/20 via-[#93B8FF]/25 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -top-14 -right-14 w-64 h-64 rounded-full bg-gradient-to-bl from-[#93B8FF]/25 via-[#EAF2FF]/40 to-transparent blur-3xl pointer-events-none" />

          {/* Flowing Organic Wave Decoration & Micro-Dotted Grid Vector Canvas */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
            preserveAspectRatio="none"
            viewBox="0 0 1000 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Bottom-left to center flowing wave gradients */}
              <linearGradient id="mcfyWaveGradBL1" x1="0%" y1="100%" x2="80%" y2="20%">
                <stop offset="0%" stopColor="#0755E8" stopOpacity="0.32" />
                <stop offset="35%" stopColor="#93B8FF" stopOpacity="0.28" />
                <stop offset="70%" stopColor="#93B8FF" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0755E8" stopOpacity="0" />
              </linearGradient>

              <linearGradient id="mcfyWaveGradBL2" x1="0%" y1="100%" x2="70%" y2="0%">
                <stop offset="0%" stopColor="#0755E8" stopOpacity="0.25" />
                <stop offset="40%" stopColor="#93B8FF" stopOpacity="0.2" />
                <stop offset="80%" stopColor="#EAF2FF" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#93B8FF" stopOpacity="0" />
              </linearGradient>

              <linearGradient id="mcfyWaveGradBL3" x1="0%" y1="80%" x2="60%" y2="10%">
                <stop offset="0%" stopColor="#0645C7" stopOpacity="0.2" />
                <stop offset="45%" stopColor="#93B8FF" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#93B8FF" stopOpacity="0" />
              </linearGradient>

              {/* Top-right delicate curves gradient */}
              <linearGradient id="mcfyWaveGradTR" x1="100%" y1="0%" x2="30%" y2="80%">
                <stop offset="0%" stopColor="#0755E8" stopOpacity="0.22" />
                <stop offset="50%" stopColor="#93B8FF" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#EAF2FF" stopOpacity="0" />
              </linearGradient>

              {/* Dotted pattern fade mask for bottom-right corner */}
              <linearGradient id="dotFadeMaskGrad" x1="50%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.85" />
              </linearGradient>
              <mask id="dotFadeMask">
                <rect x="0" y="0" width="1000" height="240" fill="url(#dotFadeMaskGrad)" />
              </mask>

              {/* Tiny evenly-spaced low-opacity decorative dots */}
              <pattern id="cardDotGridPattern" width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="2.5" cy="2.5" r="1.1" fill="#0755E8" fillOpacity="0.2" />
              </pattern>
            </defs>

            {/* Bottom-right decorative dotted matrix */}
            <rect
              x="620"
              y="60"
              width="380"
              height="180"
              fill="url(#cardDotGridPattern)"
              mask="url(#dotFadeMask)"
            />

            {/* Multi-layered flowing organic wave curves flowing from bottom-left */}
            <path
              d="M-40 240 C 120 220, 180 140, 340 135 C 500 130, 620 185, 760 170 C 860 160, 940 110, 1040 100"
              fill="none"
              stroke="url(#mcfyWaveGradBL1)"
              strokeWidth="1.6"
            />
            <path
              d="M-50 210 C 90 190, 210 110, 380 120 C 530 130, 640 210, 800 195 C 910 185, 970 140, 1050 130"
              fill="none"
              stroke="url(#mcfyWaveGradBL2)"
              strokeWidth="1.3"
            />
            <path
              d="M-30 240 C 140 200, 240 170, 420 165 C 600 160, 710 100, 880 90 C 940 85, 990 100, 1040 105"
              fill="none"
              stroke="url(#mcfyWaveGradBL3)"
              strokeWidth="1.1"
              strokeDasharray="4 3"
            />
            <path
              d="M-20 260 C 100 240, 220 200, 360 205 C 500 210, 650 160, 840 145 C 930 140, 990 165, 1050 160"
              fill="none"
              stroke="url(#mcfyWaveGradBL1)"
              strokeWidth="1.4"
            />

            {/* Top-right corner delicate swooping wave lines */}
            <path
              d="M 680 -20 C 760 40, 840 50, 960 45 C 1010 42, 1040 25, 1080 10"
              fill="none"
              stroke="url(#mcfyWaveGradTR)"
              strokeWidth="1.4"
            />
            <path
              d="M 740 -20 C 800 60, 890 75, 1020 65 C 1050 62, 1070 50, 1090 35"
              fill="none"
              stroke="url(#mcfyWaveGradTR)"
              strokeWidth="1.1"
            />
            <path
              d="M 820 -20 C 860 80, 950 95, 1060 85"
              fill="none"
              stroke="url(#mcfyWaveGradTR)"
              strokeWidth="1.0"
              strokeDasharray="3 3"
            />
          </svg>

          {/* Interactive Content Layout */}
          <div className="relative z-10 p-6 sm:p-7 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full box-border">
            {/* Left Section: Icon + Main Content */}
            <div className="flex items-start gap-4 sm:gap-5 min-w-0 flex-1">
              {/* Rounded-square premium icon container */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF] flex items-center justify-center text-[#0755E8] shrink-0 shadow-md shadow-[#0755E8]/10 transition-transform duration-200 hover:scale-105">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-[#0755E8]" />
              </div>

              {/* Main Content Section */}
              <div className="min-w-0 space-y-2 flex-1">
                {/* First row: MASTER CREDENTIAL TRACK pill + ID on same horizontal line */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF] shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8] animate-pulse" />
                    {isMasterUnlocked ? "MASTER CREDENTIAL CONFERRED" : "MASTER CREDENTIAL TRACK"}
                  </span>
                  <span className="text-xs text-[#64748B] font-mono font-medium tracking-tight">
                    ID: {masterCertId}
                  </span>
                </div>

                {/* Primary Heading */}
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#172B4D] tracking-tight leading-snug">
                  Mockeefy Master Interview Excellence Credential
                </h2>

                {/* Description: Expands naturally across available width */}
                <p className="text-xs sm:text-sm text-[#64748B] font-normal leading-relaxed">
                  {isMasterUnlocked
                    ? `Conferred for completing ${completedSessions.length} sessions across multiple domains. Demonstrates comprehensive interview mastery.`
                    : `Complete 3 mock interview sessions to unlock the prestigious Mockeefy Master Interview Certificate (${completedSessions.length}/3 completed).`}
                </p>
              </div>
            </div>

            {/* Vertical Divider (Desktop) */}
            <div className="hidden lg:block w-[1px] h-14 bg-[#E2E8F0] shrink-0 mx-2 self-center" />

            {/* Right Section: Milestone Track & Preview Button */}
            <div className="flex items-center gap-5 shrink-0 self-start lg:self-center w-full lg:w-auto">
              {isMasterUnlocked ? (
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <div
                    onClick={() => {
                      setSelectedSession(null);
                      setIsSampleSelected(false);
                      setIsMasterSelected(true);
                    }}
                    className="hidden sm:block w-28 aspect-[1000/707] rounded-lg overflow-hidden border border-[#93B8FF]/60 shadow-sm shrink-0 cursor-pointer hover:border-[#0755E8] transition-all hover:scale-105"
                    title="Click to preview Master Certificate"
                  >
                    <CertificateThumbnail
                      userName={candidateName}
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
                      setIsSampleSelected(false);
                      setIsMasterSelected(true);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#172B4D] bg-white hover:bg-[#F5F8FF] border border-[#E2E8F0] hover:border-[#93B8FF] transition-all cursor-pointer shadow-xs"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadMasterPDF}
                    disabled={downloadingMaster}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0755E8] to-[#0645C7] hover:from-[#0645C7] hover:to-[#0538A6] shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {downloadingMaster ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-white" />
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download size={13} strokeWidth={2.5} />
                        <span>Download Master PDF</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-5">
                  {/* Milestone Track: label + percentage + progress bar */}
                  <div className="w-full sm:w-48 lg:w-52 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#64748B]">Milestone Track</span>
                      <span className="text-[#172B4D] font-bold">
                        {Math.min(100, Math.round((completedSessions.length / 3) * 100))}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 overflow-hidden p-[1px]">
                      <div
                        className="h-full bg-gradient-to-r from-[#0755E8] to-[#2563EB] rounded-full transition-all duration-500 shadow-xs"
                        style={{ width: `${Math.min(100, (completedSessions.length / 3) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Far Right: Preview Credential primary button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSession(null);
                      setIsSampleSelected(false);
                      setIsMasterSelected(true);
                    }}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#0755E8] to-[#0645C7] hover:from-[#0645C7] hover:to-[#0538A6] active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#0755E8]/25 hover:shadow-lg hover:shadow-[#0755E8]/35 cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    <Sparkles size={14} className="text-white/90" />
                    <span>Preview Credential</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 3. Category Filter Tabs                                            */}
        {/* ================================================================== */}
        {completedSessions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar touch-pan-x">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-[#0755E8] text-white shadow-xs"
                  : "bg-white hover:bg-[#F5F8FF] text-[#334155] border border-[#E2E8F0] shadow-xs"
              }`}
            >
              <span>All Certificates</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                  selectedCategory === "all"
                    ? "bg-white/20 text-white"
                    : "bg-[#F0F6FF] text-[#64748B]"
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
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-[#0755E8] text-white shadow-xs"
                      : "bg-white hover:bg-[#F5F8FF] text-[#334155] border border-[#E2E8F0] shadow-xs"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#F0F6FF] text-[#64748B]"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ================================================================== */}
        {/* 4. Certificates Grid / Showcase State                              */}
        {/* ================================================================== */}
        <div>
          {filteredCertificates.length === 0 ? (
            completedSessions.length === 0 ? (
              /* Showcase Template for users with 0 completed sessions */
              <div className="space-y-6">
                <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-[0_4px_20px_rgba(23,43,77,0.06)]">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center text-[#0755E8] shrink-0 shadow-xs">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF]/40">
                            Credential Program
                          </span>
                          <span className="text-xs font-medium text-[#64748B]">
                            Official Mockeefy Accreditation
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[#172B4D] tracking-tight mt-1.5">
                          No Certificates Earned Yet
                        </h2>
                        <p className="text-xs sm:text-sm font-normal text-[#64748B] mt-1 max-w-2xl leading-relaxed">
                          Every mock interview you complete with a verified industry expert confers an official, tamper-proof Certificate of Completion. Below is a live preview of the credential you will earn upon completing your first session.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => navigate('/find-mentor')}
                        className="flex-1 sm:flex-none px-5 sm:px-6 py-2.5 sm:py-3 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Briefcase size={15} />
                        <span>Explore Interview Experts</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSession(null);
                          setIsMasterSelected(false);
                          setIsSampleSelected(true);
                        }}
                        className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-3 bg-white hover:bg-[#F5F8FF] border border-[#E2E8F0] hover:border-[#93B8FF] text-[#172B4D] rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Eye size={15} />
                        <span>Preview Template</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-7 flex flex-col">
                    <div
                      onClick={() => {
                        setSelectedSession(null);
                        setIsMasterSelected(false);
                        setIsSampleSelected(true);
                      }}
                      className="group bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-[0_4px_20px_rgba(23,43,77,0.06)] hover:border-[#93B8FF] transition-all flex flex-col justify-between h-full cursor-pointer hover:-translate-y-0.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-[#E2E8F0]">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] animate-pulse" />
                            <span className="text-xs font-bold text-[#172B4D]">Certificate Template Preview</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FFFBEB] text-[#B45309] border border-[#B45309]/20">
                            Sample Template
                          </span>
                        </div>

                        <div
                          className="group/thumb relative w-full aspect-[1000/707] rounded-xl overflow-hidden border border-[#E2E8F0] shadow-xs bg-[#FAF8F4] transition-all duration-200 group-hover:border-[#0755E8]"
                          title="Click to view full certificate preview"
                        >
                          <CertificateThumbnail
                            userName={candidateName}
                            domain="IT"
                            expertName="Godson Arockia Raj A"
                            issueDateStr="26 October 2026"
                            certId="MCFY-2026-IT-0089"
                          />
                          <div className="absolute inset-0 bg-[#08172A]/60 backdrop-blur-[1px] opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 text-white">
                            <span className="px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-md">
                              <Eye size={13} />
                              <span>Click to Preview</span>
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 mt-4 space-y-2">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Conferred To</span>
                              <span className="font-semibold text-[#172B4D] truncate block">{candidateName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Domain Category</span>
                              <span className="font-semibold text-[#172B4D] truncate block">IT Professional Mock Interview</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-[#64748B] flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-[#15803D] shrink-0" />
                          Vector-crisp PDF with digital verification
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(null);
                            setIsMasterSelected(false);
                            setIsSampleSelected(true);
                          }}
                          className="px-4 py-2 bg-white hover:bg-[#F5F8FF] text-[#172B4D] border border-[#E2E8F0] hover:border-[#93B8FF] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Eye size={14} />
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                    <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-[0_4px_20px_rgba(23,43,77,0.06)] flex-1">
                      <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider flex items-center gap-2 mb-4">
                        <Sparkles className="text-[#0755E8] w-4 h-4" />
                        <span>How To Earn Your Certificate</span>
                      </h3>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center text-[#0755E8] font-bold text-xs shrink-0">
                            1
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#172B4D]">Book a Mock Interview</h4>
                            <p className="text-[11.5px] font-medium text-[#64748B] mt-0.5 leading-relaxed">
                              Choose from verified engineering managers and technical interview leads.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center text-[#0755E8] font-bold text-xs shrink-0">
                            2
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#172B4D]">Complete 1:1 Live Practice</h4>
                            <p className="text-[11.5px] font-medium text-[#64748B] mt-0.5 leading-relaxed">
                              Experience real technical problem-solving, live coding, and receive feedback scores.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] border border-emerald-200 flex items-center justify-center text-[#15803D] font-bold text-xs shrink-0">
                            3
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#172B4D]">Download & Share Credential</h4>
                            <p className="text-[11.5px] font-medium text-[#64748B] mt-0.5 leading-relaxed">
                              Your certificate is automatically generated, shareable on LinkedIn, and verifiable by recruiters.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 shadow-[0_4px_20px_rgba(23,43,77,0.06)]">
                      <h4 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-3">
                        Official Credential Features
                      </h4>
                      <div className="grid grid-cols-2 gap-2.5 text-[11px] font-semibold text-[#334155]">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-[#15803D] shrink-0" />
                          <span>Recruiter Verifiable</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-[#15803D] shrink-0" />
                          <span>LinkedIn Shareable</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-[#15803D] shrink-0" />
                          <span>Vector High-DPI PDF</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-[#15803D] shrink-0" />
                          <span>Expert Sign-Off</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/find-mentor')}
                        className="mt-4 w-full py-2.5 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Briefcase size={14} />
                        <span>Book Your First Mock Session</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Category Filter Empty State */
              <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-12 sm:p-16 text-center flex flex-col items-center shadow-[0_4px_20px_rgba(23,43,77,0.06)]">
                <div className="w-16 h-16 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center mb-4 text-[#0755E8] shadow-xs">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-[#172B4D] font-bold text-base mb-1">No Certificates in this Category</h3>
                <p className="text-[#64748B] font-normal text-xs max-w-sm mx-auto leading-relaxed">
                  No completed mock interview certificates found in the "{selectedCategory}" category.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className="mt-6 px-5 py-2.5 bg-white hover:bg-[#F5F8FF] border border-[#E2E8F0] hover:border-[#93B8FF] text-[#172B4D] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                >
                  View All Certificates ({completedSessions.length})
                </button>
              </div>
            )
          ) : (
            <div ref={certificatesListRef} className="space-y-6 scroll-mt-24">
              {/* Certificate Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {pagedCertificates.map((session) => {
                  const isDownloading = downloading === session.id;
                  const formattedIssueDate = getFormattedIssueDate(session);
                  const certIdString = `MCFY-${(session.id || "CERT").slice(-8).toUpperCase()}`;

                  return (
                    <article
                      key={session.id}
                      onClick={() => {
                        setIsMasterSelected(false);
                        setIsSampleSelected(false);
                        setSelectedSession(session);
                      }}
                      className="group relative bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] hover:border-[#93B8FF] shadow-[0_4px_20px_rgba(23,43,77,0.06)] hover:shadow-[0_8px_28px_rgba(7,85,232,0.12)] hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between h-full w-full text-left box-border cursor-pointer"
                    >
                      <div className="space-y-3.5 flex-1 flex flex-col">
                        {/* Certificate Visual Thumbnail Preview Frame */}
                        <div className="w-full flex items-center justify-center bg-[#F5F8FF] rounded-xl p-2.5 sm:p-3 border border-[#E2E8F0]">
                          <div
                            className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-[1000/707] rounded-lg overflow-hidden border border-[#E2E8F0] shadow-xs group/thumb bg-[#FAF8F4] transition-all duration-200 hover:border-[#0755E8]"
                            title="Click to view full certificate preview"
                          >
                            <CertificateThumbnail
                              userName={candidateName}
                              domain={session.category || "IT"}
                              expertName={session.expert}
                              issueDateStr={formattedIssueDate}
                              certId={certIdString}
                            />

                            {/* "Click to Preview" Hover Overlay */}
                            <div className="absolute inset-0 bg-[#08172A]/60 backdrop-blur-[1px] opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 text-white">
                              <span className="px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-md">
                                <Eye size={13} />
                                <span>Click to Preview</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 1. Header: Certificate Title & Recipient + Verification Tag */}
                        <div className="flex items-start justify-between gap-3 pt-1">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center text-[#0755E8] shrink-0 shadow-xs">
                              <Award className="w-5 h-5 text-[#0755E8]" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-[#172B4D] text-sm sm:text-[15px] truncate group-hover:text-[#0755E8] transition-colors leading-tight">
                                {session.category || "Professional"} Mock Interview Certificate
                              </h3>

                              <p className="text-xs font-medium text-[#64748B] truncate mt-1 leading-tight flex items-center gap-1.5">
                                <span>Certificate of Completion</span>
                                <span className="text-[#94A3B8]">•</span>
                                <span className="text-[#334155] font-semibold">{candidateName}</span>
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0FDF4] text-[#15803D] border border-emerald-200 text-[10px] font-bold uppercase tracking-tight shadow-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                              <span>Verified</span>
                            </span>
                          </div>
                        </div>

                        {/* 2. Structured Certificate Credential Details Box */}
                        <div className="bg-[#F8FAFC] group-hover:bg-[#F0F6FF]/60 border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 space-y-2.5 transition-colors duration-200">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider">
                                Specialization
                              </span>
                              <div className="font-semibold text-[#172B4D] flex items-center gap-1.5 truncate">
                                <Briefcase className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                <span className="truncate">{session.category || "IT"}</span>
                              </div>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider">
                                Issue Date
                              </span>
                              <div className="font-semibold text-[#172B4D] flex items-center gap-1.5 truncate">
                                <Calendar className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                <span className="truncate">{formattedIssueDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-semibold text-[#64748B] shrink-0">
                                Conferred by:
                              </span>
                              <span className="font-semibold text-[#172B4D] truncate">
                                {session.expert}
                              </span>
                              <span className="text-[#64748B] font-normal truncate">
                                ({session.company || "Mockeefy"})
                              </span>
                            </div>

                            {session.expertReview?.overallRating && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#B45309]/20 text-[#B45309] text-[10.5px] font-bold shrink-0">
                                ★ {session.expertReview.overallRating}/5
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Certificate Action Row */}
                      <div className="w-full pt-3.5 mt-3.5 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10.5px] font-mono font-semibold text-[#64748B] bg-[#F5F8FF] px-2 py-0.5 rounded-md border border-[#E2E8F0] truncate">
                            ID: {certIdString}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMasterSelected(false);
                              setIsSampleSelected(false);
                              setSelectedSession(session);
                            }}
                            className="px-3.5 py-1.5 bg-white hover:bg-[#F5F8FF] text-[#172B4D] border border-[#E2E8F0] hover:border-[#93B8FF] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(session);
                            }}
                            disabled={isDownloading}
                            className="px-3.5 py-1.5 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={13} className="animate-spin text-white" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download size={13} strokeWidth={2.2} />
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
                <div className="hidden md:flex items-center justify-between pt-5 border-t border-[#E2E8F0]">
                  <div className="text-xs font-semibold text-[#64748B]">
                    Showing <span className="text-[#172B4D] tabular-nums">{pageStartIdx + 1}</span>–<span className="text-[#172B4D] tabular-nums">{pageEndIdx}</span> of{" "}
                    <span className="text-[#172B4D] tabular-nums">{filteredCertificates.length}</span> certificates
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold hover:border-[#93B8FF] hover:text-[#0755E8] disabled:opacity-40 disabled:hover:border-[#E2E8F0] disabled:hover:text-[#334155] transition-all cursor-pointer shadow-xs"
                    >
                      Prev
                    </button>
                    <div className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#172B4D] tabular-nums shadow-xs">
                      Page {page} of {totalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold hover:border-[#93B8FF] hover:text-[#0755E8] disabled:opacity-40 disabled:hover:border-[#E2E8F0] disabled:hover:text-[#334155] transition-all cursor-pointer shadow-xs"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination footer (mobile) */}
              {filteredCertificates.length > PAGE_SIZE && (
                <div className="md:hidden pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    Prev
                  </button>
                  <div className="text-xs font-semibold text-[#172B4D] tabular-nums">
                    {pageStartIdx + 1}-{pageEndIdx} of {filteredCertificates.length}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. LARGE FULL-SCREEN CERTIFICATE PREVIEW MODAL / OVERLAY            */}
      {/* Exact Match to Reference Screenshot: Dark backdrop, centered canvas, */}
      {/* clean header, high-res certificate, verified info & primary blue btn  */}
      {/* ==================================================================== */}
      {(selectedSession || isMasterSelected || isSampleSelected) && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 pt-6 pb-6 bg-[#040814]/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 box-border"
          onClick={() => {
            setSelectedSession(null);
            setIsMasterSelected(false);
            setIsSampleSelected(false);
          }}
        >
          <div
            className="bg-[#0B1528] text-white rounded-2xl sm:rounded-3xl border border-slate-700/60 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] w-full max-w-[96vw] lg:max-w-[1140px] xl:max-w-[1180px] h-[92vh] max-h-[890px] m-auto overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 box-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#070F1E] shrink-0 z-20 w-full box-border shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-3 min-w-0 mr-3 flex-1">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[#0755E8] flex items-center justify-center shrink-0">
                  <Award size={18} className="text-[#0755E8]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base md:text-lg truncate leading-tight tracking-tight">
                    {isMasterSelected
                      ? "Mockeefy Master Interview Excellence Credential"
                      : isSampleSelected
                      ? "Official Certificate Template Preview"
                      : "Verified Mockeefy Certificate of Completion"}
                  </h3>
                  <p className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-400 tracking-[0.16em] uppercase mt-0.5 truncate">
                    OFFICIAL CAREER ACCREDITATION • A4 LANDSCAPE CREDENTIAL
                  </p>
                </div>
              </div>

              {/* Clean Close button with X icon */}
              <button
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setIsMasterSelected(false);
                  setIsSampleSelected(false);
                }}
                className="shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/90 active:bg-slate-700 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                aria-label="Close certificate modal"
              >
                <X size={15} />
                <span>Close</span>
              </button>
            </div>

            {/* Certificate Area: Scaled proportionally inside container */}
            <CertificateModalPreview>
              <CertificateTemplate
                userName={candidateName}
                domain={isMasterSelected ? "Master" : isSampleSelected ? "IT" : (selectedSession?.category || "IT")}
                expertName={
                  isMasterSelected
                    ? "Mockeefy Board of Directors"
                    : isSampleSelected
                    ? "Godson Arockia Raj A"
                    : (selectedSession?.expert || "Godson Arockia Raj A")
                }
                issueDateStr={
                  isMasterSelected
                    ? new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                    : (selectedSession ? getFormattedIssueDate(selectedSession) : "26 October 2026")
                }
                certId={
                  isMasterSelected
                    ? masterCertId
                    : isSampleSelected
                    ? "MCFY-2026-IT-0089"
                    : `MCFY-${(selectedSession?.id || "CERT").slice(-8).toUpperCase()}`
                }
                isMaster={isMasterSelected}
              />
            </CertificateModalPreview>

            {/* Bottom Action Bar */}
            <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-800/80 flex items-center justify-between bg-[#070F1E] shrink-0 z-20 flex-wrap gap-3 box-border shadow-[0_-1px_3px_rgba(0,0,0,0.3)]">
              {/* Left side: Verification / Security info */}
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-200 leading-none">
                  Digitally Verified &amp; Recruiter-Ready • High-Resolution Vector PDF
                </div>
              </div>

              {/* Right side: Primary Blue "Download Official PDF Certificate" Button */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {isSampleSelected ? (
                  <button
                    type="button"
                    disabled={downloadingSample}
                    onClick={handleDownloadSamplePDF}
                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-[#0055FE] hover:bg-[#0047D6] active:bg-[#003CB8] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {downloadingSample ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-white" />
                        <span>Generating Sample PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={15} strokeWidth={2.2} />
                        <span>Download Official PDF Certificate</span>
                      </>
                    )}
                  </button>
                ) : (
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
                    className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-[#0055FE] hover:bg-[#0047D6] active:bg-[#003CB8] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {Boolean(downloading) || downloadingMaster ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-white" />
                        <span>Generating Official PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={15} strokeWidth={2.2} />
                        <span>Download Official PDF Certificate</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
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
              userName={candidateName}
              domain={downloadTarget.isMaster ? "Master" : (downloadTarget as any).isSample ? "IT" : (downloadTarget.session?.category || "IT")}
              expertName={
                downloadTarget.isMaster
                  ? "Mockeefy Board of Directors"
                  : (downloadTarget as any).isSample
                  ? "Godson Arockia Raj A"
                  : (downloadTarget.session?.expert || "Godson Arockia Raj A")
              }
              issueDateStr={
                downloadTarget.isMaster
                  ? new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
                  : (downloadTarget.session ? getFormattedIssueDate(downloadTarget.session) : "26 October 2026")
              }
              certId={
                downloadTarget.isMaster
                  ? masterCertId
                  : (downloadTarget as any).isSample
                  ? "MCFY-2026-IT-0089"
                  : `MCFY-${(downloadTarget.session?.id || "").slice(-8).toUpperCase()}`
              }
              isMaster={downloadTarget.isMaster}
            />
          )}
        </div>
      </div>
    </div>
  );
}
