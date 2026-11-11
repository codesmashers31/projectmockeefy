import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../lib/axios";
import {
  Award,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import CertificatesSkeleton from "../components/CertificatesSkeleton";
import { IdentityConfirmationModal } from "../components/IdentityConfirmationModal";
import brandLogo from "../assets/logo/mockeefylogo.png";
import artworkMasterImg from "../assets/certificates/mockeefy_artwork_master.png";

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
  categoryId?: string;
  categoryNameSnapshot?: string;
  status: string;
  attendanceStatus?: string;
  expertReview?: ReviewInfo | null;
  candidateReview?: ReviewInfo | null;
  candidateNameSnapshot?: string | null;
  certificateId?: string | null;
  allocatedCertificateId?: string | null;
  allocatedMilestone?: number | null;
  identityConfirmedAt?: string | null;
};

export type CategoryProgress = {
  categoryId: string;
  categoryName: string;
  categoryStatus: string;
  totalEligibleCount: number;
  totalQualifyingCount?: number;
  totalIssuedCount: number;
  unallocatedCount: number;
  nextMilestoneNumber: number;
  nextMilestoneRange: string;
  progressInMilestone: number;
  remainingForMilestone: number;
  isEligibleForNext: boolean;
  issuedCertificates?: any[];
  unallocatedSessions?: any[];
};

type CertificatePreviewData = {
  stage: "PREVIEW" | "ELIGIBLE" | "ISSUED" | "PROGRESS";
  candidateName: string | null;
  profileName: string | null;
  needsProfileCompletion: boolean;
  completedCount: number;
  unallocatedCount?: number;
  targetCount: number;
  isEligible: boolean;
  isIssued: boolean;
  hasConfirmedIdentity: boolean;
  confirmedName: string | null;
  categoryProgress?: CategoryProgress[];
  eligibleCategories?: Array<{
    categoryId: string;
    categoryName: string;
    nextMilestoneNumber: number;
    nextMilestoneRange: string;
  }>;
  activeCategories?: Array<{ id: string; name: string }>;
  milestone?: {
    nextMilestoneNumber: number;
    nextMilestoneRange: string;
    totalIssuedCount: number;
    totalEligibleCount: number;
    unallocatedCount: number;
    progressInMilestone: number;
    remainingForMilestone: number;
    isEligibleForNext: boolean;
  };
  certificates?: Array<{
    certificateId: string;
    name?: string;
    categoryId?: string;
    categoryNameSnapshot?: string;
    milestoneNumber: number;
    milestoneRange: string;
    candidateNameSnapshot: string;
    issueDate: string;
    certificateStatus: string;
    qualifyingSessionIds?: string[];
    type?: string;
  }>;
  latestCertificate?: any;
  certificate?: any;
};

/**
 * Formats candidate name for certificate rendering:
 * - Neutral 'Your Name' for preview.
 * - Extracts clean human name, trims whitespace, capitalizes words.
 */
const formatCertificateName = (rawName?: string | null): string => {
  if (!rawName || typeof rawName !== "string") return "";
  if (rawName.trim().toLowerCase() === "your name") return "Your Name";

  let stripped = rawName.replace(/\s*\((?:user|candidate|expert|coach|mentor|admin)\)\s*/gi, " ");

  if (stripped.includes("@")) {
    const localPart = stripped.split("@")[0];
    const cleanedLocal = localPart
      .replace(/\b[a-zA-Z]*\d+[a-zA-Z0-9]*\b/g, "")
      .replace(/[._-]+/g, " ")
      .trim();
    stripped = cleanedLocal || localPart.replace(/[._-]+/g, " ").trim();
  }

  const cleaned = stripped.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

// ============================================================================
// DISCRIMINATED TEMPLATE PROPS
// ============================================================================
type CertificateTemplateProps =
  | {
      mode: "preview";
      domain?: string;
    }
  | {
      mode: "issued";
      userName: string;
      domain?: string;
      expertName?: string;
      issueDateStr: string;
      certId: string;
      isMaster?: boolean;
    };

// ============================================================================
// ADAPTIVE RIBBON TYPOGRAPHY & FIXED GEOMETRY ENGINE
// Strictly preserves authentic approved certificate ribbon (1682 x 935 canvas)
// Fixed polygon: "-310,0 -284,-22 284,-22 310,0 284,22 -284,22" (620 x 44 px)
// Inner text safe width: 520px (between chamfers with safety padding)
// ============================================================================
let ribbonMeasureCanvas: HTMLCanvasElement | null = null;

const fallbackMeasureUppercaseInter = (text: string, fontSize: number, letterSpacing: number): number => {
  const charWidths: Record<string, number> = {
    ' ': 0.28,
    'I': 0.35, 'J': 0.45, 'L': 0.50, 'T': 0.55, 'F': 0.55,
    'M': 0.92, 'W': 0.95, '&': 0.78, '(': 0.38, ')': 0.38,
    '-': 0.40, '/': 0.45,
  };
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i].toUpperCase();
    const em = charWidths[ch] !== undefined ? charWidths[ch] : 0.68;
    total += em * fontSize;
    if (i < text.length - 1) {
      total += letterSpacing;
    }
  }
  return total;
};

export const measureRibbonTextWidth = (
  text: string,
  fontSize: number,
  letterSpacing: number
): number => {
  if (typeof document === "undefined") {
    return fallbackMeasureUppercaseInter(text, fontSize, letterSpacing);
  }
  try {
    if (!ribbonMeasureCanvas) {
      ribbonMeasureCanvas = document.createElement("canvas");
    }
    const ctx = ribbonMeasureCanvas.getContext("2d");
    if (!ctx) return fallbackMeasureUppercaseInter(text, fontSize, letterSpacing);
    ctx.font = `800 ${fontSize}px 'Inter', 'Plus Jakarta Sans', sans-serif`;
    const baseWidth = ctx.measureText(text).width;
    const tracking = Math.max(0, text.length - 1) * letterSpacing;
    return baseWidth + tracking;
  } catch (_) {
    return fallbackMeasureUppercaseInter(text, fontSize, letterSpacing);
  }
};

export interface RibbonTypography {
  fontSize: string;
  letterSpacing: string;
  fontSizeNum: number;
  letterSpacingNum: number;
  computedWidth: number;
}

export const getAdaptiveRibbonTypography = (
  text: string,
  maxInnerWidth: number = 520
): RibbonTypography => {
  const candidateConfigs = [
    { fontSize: 17, letterSpacing: 2.8 },
    { fontSize: 16.5, letterSpacing: 2.5 },
    { fontSize: 16, letterSpacing: 2.3 },
    { fontSize: 15.5, letterSpacing: 2.1 },
    { fontSize: 15, letterSpacing: 1.9 },
    { fontSize: 14.5, letterSpacing: 1.7 },
    { fontSize: 14, letterSpacing: 1.5 },
    { fontSize: 13.5, letterSpacing: 1.4 },
    { fontSize: 13, letterSpacing: 1.3 },
    { fontSize: 12.5, letterSpacing: 1.2 },
    { fontSize: 12, letterSpacing: 1.1 },
    { fontSize: 11.5, letterSpacing: 1.0 },
    { fontSize: 11, letterSpacing: 0.9 },
    { fontSize: 10.5, letterSpacing: 0.8 },
    { fontSize: 10, letterSpacing: 0.7 },
  ];

  for (const cfg of candidateConfigs) {
    const w = measureRibbonTextWidth(text, cfg.fontSize, cfg.letterSpacing);
    if (w <= maxInnerWidth) {
      return {
        fontSize: `${cfg.fontSize}px`,
        letterSpacing: `${cfg.letterSpacing}px`,
        fontSizeNum: cfg.fontSize,
        letterSpacingNum: cfg.letterSpacing,
        computedWidth: Math.round(w),
      };
    }
  }

  const minCfg = candidateConfigs[candidateConfigs.length - 1];
  return {
    fontSize: `${minCfg.fontSize}px`,
    letterSpacing: `${minCfg.letterSpacing}px`,
    fontSizeNum: minCfg.fontSize,
    letterSpacingNum: minCfg.letterSpacing,
    computedWidth: Math.round(measureRibbonTextWidth(text, minCfg.fontSize, minCfg.letterSpacing)),
  };
};

// ============================================================================
// MASTER CERTIFICATE TEMPLATE – 100% FAITHFUL RECONSTRUCTION (1682 × 935 CANVAS)
// STRICT DISCRIMINATED RENDERING (PREVIEW VS ISSUED)
// ============================================================================
const CertificateTemplate = (props: CertificateTemplateProps) => {
  const isPreview = props.mode === "preview";

  const rawDomain = (props.domain || "").trim();
  const displayDomain = rawDomain.toUpperCase();
  const isNeutralDomain =
    !rawDomain ||
    rawDomain.toLowerCase() === "default" ||
    rawDomain.toLowerCase() === "your domain";

  // Dynamic ribbon plaque title:
  // - If preview:
  //   - If neutral/empty -> "YOUR DOMAIN MOCK INTERVIEW SESSION"
  //   - If category is "IT" -> "IT PROFESSIONAL MOCK INTERVIEW SESSION"
  //   - Otherwise -> "${displayDomain} MOCK INTERVIEW SESSION"
  // - If isMaster -> "MASTER INTERVIEW READINESS CERTIFICATION"
  // - If category is "IT" -> "IT PROFESSIONAL MOCK INTERVIEW SESSION"
  // - Otherwise -> "${displayDomain} MOCK INTERVIEW SESSION"
  const plaqueText = isPreview
    ? isNeutralDomain
      ? "YOUR DOMAIN MOCK INTERVIEW SESSION"
      : rawDomain.toLowerCase() === "it"
      ? "IT PROFESSIONAL MOCK INTERVIEW SESSION"
      : `${displayDomain} MOCK INTERVIEW SESSION`
    : (props as any).isMaster
    ? "MASTER INTERVIEW READINESS CERTIFICATION"
    : !rawDomain || rawDomain.toLowerCase() === "it"
    ? "IT PROFESSIONAL MOCK INTERVIEW SESSION"
    : `${displayDomain} MOCK INTERVIEW SESSION`;

  // Adaptive font sizing inside strictly fixed ribbon polygon (520px inner text bounds)
  const ribbonTypography = useMemo(() => {
    return getAdaptiveRibbonTypography(plaqueText, 520);
  }, [plaqueText]);

  // Recipient name: strictly "Your Name" for generic preview mode
  const formattedName = isPreview
    ? "Your Name"
    : formatCertificateName((props as any).userName) || "Candidate";

  // Dynamic font sizing for recipient name inside the golden ribbon banner
  const getNameFontSize = (name: string): string => {
    if (isPreview) return "54px";
    const len = (name || "").trim().length;
    if (len <= 8) return "64px";
    if (len <= 14) return "54px";
    if (len <= 20) return "44px";
    if (len <= 28) return "36px";
    return "28px";
  };
  const recipientFontSize = getNameFontSize(formattedName);

  // Dynamic date formatting: strictly "Your Issue Date" for generic preview, e.g. "Nov 10, 2026" for issued
  const displayDate = useMemo(() => {
    if (isPreview) {
      return "Your Issue Date";
    }
    const issueDateStr = (props as any).issueDateStr;
    if (!issueDateStr) {
      const now = new Date();
      return `${now.toLocaleString("en-US", { month: "short" })} ${now.getDate()}, ${now.getFullYear()}`;
    }
    const d = new Date(issueDateStr);
    if (!isNaN(d.getTime())) {
      const month = d.toLocaleString("en-US", { month: "short" });
      const day = d.getDate();
      const year = d.getFullYear();
      return `${month} ${day}, ${year}`;
    }
    return issueDateStr;
  }, [isPreview, props]);

  return (
    <div
      id="mockeefy-official-certificate"
      className="relative overflow-hidden select-none box-border"
      style={{
        width: "1682px",
        height: "935px",
        backgroundColor: "#030B1C",
        color: "#08172A",
        fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "geometricPrecision",
      }}
    >
      <svg
        className="w-full h-full block select-none pointer-events-none"
        viewBox="0 0 1682 935"
        width="1682"
        height="935"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        style={{
          shapeRendering: "geometricPrecision",
          textRendering: "geometricPrecision",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <defs>
          <linearGradient id="cartoucheGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#021638" />
            <stop offset="20%" stopColor="#073A85" />
            <stop offset="50%" stopColor="#0B52BC" />
            <stop offset="80%" stopColor="#073A85" />
            <stop offset="100%" stopColor="#021638" />
          </linearGradient>
        </defs>

        {/* 1. MASTER DECORATIVE ARTWORK LAYER */}
        <image
          href={artworkMasterImg}
          x="0"
          y="0"
          width="1682"
          height="935"
          preserveAspectRatio="none"
          imageRendering="optimizeQuality"
          style={{ imageRendering: "high-quality" }}
        />

        {/* 2. DOMAIN-SPECIFIC CARTOUCHE (STRICTLY FIXED APPROVED MASTER GEOMETRY: 620 x 44 PX) */}
        <g transform="translate(841, 313)">
          <polygon
            points="-310,0 -284,-22 284,-22 310,0 284,22 -284,22"
            fill="url(#cartoucheGrad)"
            stroke="#D4AF37"
            strokeWidth="2"
          />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={ribbonTypography.fontSize}
            fontWeight="800"
            letterSpacing={ribbonTypography.letterSpacing}
            fontFamily="'Inter', 'Plus Jakarta Sans', sans-serif"
          >
            {plaqueText}
          </text>
        </g>

        {/* 3. ACHIEVEMENT DESCRIPTION */}
        {isPreview ? (
          isNeutralDomain ? (
            <text
              x="841"
              y="577"
              textAnchor="middle"
              fill="#334155"
              fontSize="19px"
              fontWeight="500"
              fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
              letterSpacing="0.01em"
            >
              <tspan x="841" dy="0">
                has successfully completed a structured mock interview in your selected domain,
              </tspan>
              <tspan x="841" dy="28">
                demonstrating dedication to improving interview skills and professional growth.
              </tspan>
            </text>
          ) : (
            <text
              x="841"
              y="577"
              textAnchor="middle"
              fill="#334155"
              fontSize="19px"
              fontWeight="500"
              fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
              letterSpacing="0.01em"
            >
              <tspan x="841" dy="0">
                has successfully completed a structured mock interview in the{" "}
                <tspan fontWeight="700" fill="#08172A">{rawDomain} domain</tspan>,
              </tspan>
              <tspan x="841" dy="28">
                demonstrating dedication to improving interview skills and professional growth.
              </tspan>
            </text>
          )
        ) : (props as any).isMaster ? (
          <text
            x="841"
            y="577"
            textAnchor="middle"
            fill="#334155"
            fontSize="19px"
            fontWeight="500"
            fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
            letterSpacing="0.01em"
          >
            <tspan x="841" dy="0">
              demonstrating comprehensive mastery across multiple technical domains,
            </tspan>
            <tspan x="841" dy="28">
              interview readiness, and elite communication.
            </tspan>
          </text>
        ) : (
          <text
            x="841"
            y="577"
            textAnchor="middle"
            fill="#334155"
            fontSize="19px"
            fontWeight="500"
            fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
            letterSpacing="0.01em"
          >
            <tspan x="841" dy="0">
              has successfully completed a structured mock interview in the{" "}
              <tspan fontWeight="700" fill="#08172A">{rawDomain} domain</tspan>,
            </tspan>
            <tspan x="841" dy="28">
              demonstrating dedication to improving interview skills and professional growth.
            </tspan>
          </text>
        )}

        {/* 4. RECIPIENT NAME INSIDE GOLDEN RIBBON BANNER */}
        <text
          x="841"
          y="488"
          textAnchor="middle"
          fill="#08172A"
          fontSize={recipientFontSize}
          fontWeight="700"
          fontStyle="italic"
          fontFamily="'Georgia', 'Times New Roman', serif"
          letterSpacing="0.01em"
        >
          {formattedName}
        </text>

        {/* 5. METADATA: ISSUE DATE PLAQUE (Centered inside the authentic master plaque) */}
        <g id="issue-date-plaque" transform="translate(451, 0)">
          {/* Line 1: 'Issued on' */}
          <text
            x="0"
            y="735"
            textAnchor="middle"
            fill="#08172A"
            fontSize="14.5px"
            fontWeight="600"
            fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
            letterSpacing="0.01em"
          >
            Issued on
          </text>

          {/* Line 2: Dynamic formatted date (e.g. 'Nov 7, 2026' or 'Your Issue Date') */}
          <text
            x="0"
            y="764"
            textAnchor="middle"
            fill="#08172A"
            fontSize={displayDate === "Your Issue Date" ? "20px" : "25px"}
            fontWeight="800"
            fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
            letterSpacing="-0.01em"
          >
            {displayDate}
          </text>
        </g>

        {/* 6. SIGNATURE AREA: Master artwork provides pristine authentic authorized signature. Zero overlay. */}
      </svg>
    </div>
  );
};

// ============================================================================
// SCALED THUMBNAIL WRAPPER
// ============================================================================
const CertificateThumbnail = (props: CertificateTemplateProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.14);

  useLayoutEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setScale(w / 1682);
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
      className="w-full h-full relative overflow-hidden pointer-events-none select-none bg-[#FFFEFA]"
      style={{ aspectRatio: "1682 / 935" }}
    >
      <div
        style={{
          width: "1682px",
          height: "935px",
          transform: `scale(${scale}) translateZ(0)`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <CertificateTemplate {...props} />
      </div>
    </div>
  );
};

// ============================================================================
// LARGE CERTIFICATE MODAL PREVIEW SCALER
// ============================================================================
const CertificateModalPreview = ({ children }: { children: React.ReactNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.6);

  const calculateScale = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const paddingX = window.innerWidth < 640 ? 16 : 40;
    const paddingY = window.innerWidth < 640 ? 16 : 36;
    const availW = Math.max(100, rect.width - paddingX);
    const availH = Math.max(100, rect.height - paddingY);

    const CANVAS_WIDTH = 1682;
    const CANVAS_HEIGHT = 935;
    const scaleX = availW / CANVAS_WIDTH;
    const scaleY = availH / CANVAS_HEIGHT;
    const fittedScale = Math.min(scaleX, scaleY);

    setScale(fittedScale > 0.05 ? fittedScale : 0.6);
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
          width: `${Math.round(1682 * scale)}px`,
          height: `${Math.round(935 * scale)}px`,
          position: "relative",
          boxShadow:
            "0 25px 70px -15px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          borderRadius: "0px",
          overflow: "hidden",
          backgroundColor: "#030B1C",
          flexShrink: 0,
          transition: "width 0.15s ease-out, height 0.15s ease-out",
        }}
      >
        <div
          style={{
            width: "1682px",
            height: "935px",
            transform: `scale(${scale}) translateZ(0)`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default function CertificatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const location = useLocation();

  const [previewData, setPreviewData] = useState<CertificatePreviewData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [masterCert, setMasterCert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Multi-Certificate and Modal States
  const [issuedCertificates, setIssuedCertificates] = useState<any[]>([]);
  const [viewingCertificate, setViewingCertificate] = useState<any | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewModalDomain, setPreviewModalDomain] = useState<string>("");
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  // Close custom domain dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(e.target as Node)) {
        setIsDomainDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDomainDropdownOpen(false);
      }
    };
    if (isDomainDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDomainDropdownOpen]);

  const hasAutoOpenedRef = useRef(false);

  // Identity confirmation & issuance state for specific category
  const [confirmingCategory, setConfirmingCategory] = useState<{
    categoryId: string;
    categoryName: string;
    milestoneNumber: number;
  } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  // Download state
  const [downloadingMaster, setDownloadingMaster] = useState(false);
  const pdfRenderRef = useRef<HTMLDivElement>(null);
  const [downloadTarget, setDownloadTarget] = useState<{
    cert?: any;
    session?: Session | null;
  } | null>(null);

  const getFormattedIssueDate = (session: Session) => {
    const rawDate = session.expertReview?.createdAt || session.startTime || new Date();
    const d = new Date(rawDate);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const completedSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        const st = (s.status || "").toLowerCase();
        if (st !== "completed") return false;
        if (st === "no-show" || st === "candidate_no_show" || st === "no_show" || st === "cancelled") return false;
        if (s.attendanceStatus === "absent" || s.attendanceStatus === "no-show") return false;
        if (!s.expertReview) return false;
        return true;
      })
      .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
  }, [sessions]);

  const categoryProgressList: CategoryProgress[] = useMemo(() => {
    if (Array.isArray(previewData?.categoryProgress) && previewData.categoryProgress.length > 0) {
      return previewData.categoryProgress;
    }
    // Fallback: build basic progress for categories from completed sessions
    const catMap = new Map<string, Session[]>();
    completedSessions.forEach((s) => {
      const cat = s.category || "IT";
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(s);
    });

    return Array.from(catMap.entries()).map(([name, sList]) => {
      const unalloc = sList.filter((s) => !s.certificateId && !s.allocatedCertificateId).length;
      return {
        categoryId: name,
        categoryName: name,
        categoryStatus: "Active",
        totalEligibleCount: sList.length,
        totalIssuedCount: 0,
        unallocatedCount: unalloc,
        nextMilestoneNumber: 1,
        nextMilestoneRange: "Interviews 1–3",
        progressInMilestone: Math.min(3, unalloc),
        remainingForMilestone: Math.max(0, 3 - Math.min(3, unalloc)),
        isEligibleForNext: unalloc >= 3,
      };
    });
  }, [previewData, completedSessions]);

  const hasAnyIssuedCert = issuedCertificates.length > 0;
  const anyDomainEligible = categoryProgressList.some((cp) => cp.isEligibleForNext);

  // All active categories for dynamic preview dropdown (combining DB categories and active domain progress)
  const allCategoryOptions = useMemo(() => {
    const list: Array<{ id: string; name: string }> = [];
    const seen = new Set<string>();

    availableCategories.forEach((c) => {
      if (c.name && !seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase());
        list.push({ id: c.id, name: c.name });
      }
    });

    categoryProgressList.forEach((cp) => {
      if (cp.categoryName && !seen.has(cp.categoryName.toLowerCase())) {
        seen.add(cp.categoryName.toLowerCase());
        list.push({ id: cp.categoryId || cp.categoryName, name: cp.categoryName });
      }
    });

    if (list.length === 0) {
      return [
        { id: "it", name: "IT" },
        { id: "web-dev", name: "Web Development" },
        { id: "cybersecurity", name: "Cybersecurity" },
        { id: "software-dev", name: "Software Development" },
        { id: "cloud-devops", name: "DevOps & Cloud" },
        { id: "data-science", name: "Data Science & ML" },
      ];
    }
    return list;
  }, [availableCategories, categoryProgressList]);

  // Active domains with genuine candidate activity (strictly at least 1 qualifying session OR 1 issued certificate)
  const activeDomains = useMemo(() => {
    return categoryProgressList.filter(
      (cp) => (cp.totalQualifyingCount || cp.totalEligibleCount || 0) > 0 || (cp.totalIssuedCount || 0) > 0
    );
  }, [categoryProgressList]);

  // Keep selected domain in sync with activeDomains (auto-select first active domain if current is invalid/empty)
  useEffect(() => {
    if (activeDomains.length > 0) {
      const exists = activeDomains.some(
        (ad) => ad.categoryName.toLowerCase() === selectedDomain.toLowerCase()
      );
      if (!selectedDomain || !exists) {
        setSelectedDomain(activeDomains[0].categoryName);
      }
    } else {
      setSelectedDomain("");
    }
  }, [activeDomains, selectedDomain]);

  const primaryEligibleDomain = activeDomains.find((cp) => cp.isEligibleForNext);

  // Dynamic progress message generator (Section 5 specifications)
  const getProgressMessages = (cp: CategoryProgress) => {
    const p = cp.progressInMilestone;
    const rem = cp.remainingForMilestone;
    const cat = cp.categoryName;

    if (cp.isEligibleForNext || p >= 3) {
      return {
        line1: `You have completed 3 of 3 qualifying ${cat} interviews.`,
        line2: `Your next ${cat} certificate is ready for issuance.`,
        ready: true,
      };
    }

    return {
      line1: `You have completed ${p} of 3 qualifying ${cat} interviews.`,
      line2: `Complete ${rem} more interview${rem === 1 ? "" : "s"} to earn your next ${cat} certificate.`,
      ready: false,
    };
  };

  // Currently evaluated domain progress: strictly from candidate's active domains
  const currentProg = useMemo(() => {
    if (!selectedDomain) return null;
    const match = activeDomains.find(
      (cp) => cp.categoryName.toLowerCase() === selectedDomain.toLowerCase()
    );
    return match || null;
  }, [selectedDomain, activeDomains]);

  // Fetch all certificate and session data
  const fetchAllData = async () => {
    const userId = (user as any)?.id || (user as any)?._id || (user as any)?.userId;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch domain-specific certificate preview
      try {
        const prevRes = await axios.get("/api/certifications/preview");
        if (prevRes.data?.success && prevRes.data?.data) {
          const d = prevRes.data.data;
          setPreviewData(d);
          if (Array.isArray(d.certificates)) {
            setIssuedCertificates(d.certificates);
          }
          if (d.latestCertificate) {
            setMasterCert(d.latestCertificate);
          } else if (d.certificate) {
            setMasterCert(d.certificate);
          }
        }
      } catch (err) {
        console.warn("Could not fetch certificate preview status:", err);
      }

      // Also fetch full issued certificate history
      try {
        const histRes = await axios.get("/api/certifications/history");
        if (histRes.data?.success && Array.isArray(histRes.data.data) && histRes.data.data.length > 0) {
          setIssuedCertificates(histRes.data.data);
          if (histRes.data.data.length > 0) {
            setMasterCert(histRes.data.data[histRes.data.data.length - 1]);
          }
        }
      } catch (err) {
        console.warn("Could not fetch certificate history:", err);
      }

      // 2. Fetch candidate sessions
      const sessionsRes = await axios.get(`/api/sessions/candidate/${userId}`);
      const raw = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      const mapped: Session[] = raw.map((s: any) => ({
        id: s._id || s.sessionId,
        sessionId: s.sessionId,
        expert: s.expertDetails?.name || s.expertId?.name || "Godson Arockia Raj A",
        profileImage: s.expertDetails?.profileImage || s.expertId?.profileImage || null,
        company: s.expertDetails?.company || s.expertId?.company || "Mockeefy",
        role:
          s.expertDetails?.currentRole ||
          s.expertDetails?.role ||
          s.expertId?.currentRole ||
          s.expertId?.role ||
          "Interview Lead",
        topic: s.topic || s.category,
        startTime: s.startTime,
        endTime: s.endTime,
        category: s.categoryNameSnapshot || s.category || s.expertDetails?.category || "IT",
        categoryId: s.categoryId ? s.categoryId.toString() : undefined,
        categoryNameSnapshot: s.categoryNameSnapshot || s.category || "IT",
        status: (s.status || "").charAt(0).toUpperCase() + (s.status || "").slice(1),
        attendanceStatus: s.attendanceStatus,
        expertReview: s.expertReview || null,
        candidateReview: s.candidateReview || null,
        candidateNameSnapshot: s.candidateNameSnapshot || null,
        certificateId: s.allocatedCertificateId || s.certificateId || null,
        allocatedCertificateId: s.allocatedCertificateId || s.certificateId || null,
        allocatedMilestone: s.allocatedMilestone || null,
        identityConfirmedAt: s.identityConfirmedAt || null,
      }));
      setSessions(mapped);

      // 3. Fetch Master Credential if already issued
      try {
        const masterRes = await axios.get(`/api/certifications/master/${userId}`);
        if (masterRes.data?.success && masterRes.data?.data) {
          setMasterCert(masterRes.data.data);
        }
      } catch (_) {
        // Expected when certificate has not been officially issued yet
      }

      // 4. Fetch dynamic active categories from MongoDB for preview dropdown
      try {
        const catRes = await axios.get("/api/categories");
        if (Array.isArray(catRes.data)) {
          const active = catRes.data
            .filter((c: any) => !c.status || c.status.toLowerCase() === "active")
            .map((c: any) => ({
              id: c._id || c.id || c.name,
              name: c.name,
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
          setAvailableCategories(active);
        }
      } catch (catErr) {
        console.warn("Could not fetch categories:", catErr);
      }
    } catch (e) {
      console.error("Error loading certificate data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Context-aware deep linking into exact issued certificate
  useEffect(() => {
    if (loading) return;

    const navState = (location.state as any) || {};
    const targetSessionId =
      searchParams.get("sessionId") ||
      searchParams.get("id") ||
      routeParams.certId ||
      navState.selectedSessionId;
    const targetCertId =
      searchParams.get("certId") ||
      routeParams.certId ||
      navState.selectedCertId;

    if (!targetSessionId && !targetCertId) return;
    if (hasAutoOpenedRef.current) return;

    // 1. Direct match in issuedCertificates by certificateId
    let matchedCert = issuedCertificates.find((c) => {
      if (!c.certificateId) return false;
      if (targetCertId && c.certificateId.toLowerCase() === targetCertId.toLowerCase()) return true;
      return false;
    });

    // 2. If not matched yet, check qualifyingSessionIds in issuedCertificates
    if (!matchedCert && targetSessionId) {
      matchedCert = issuedCertificates.find((c) => {
        return Array.isArray(c.qualifyingSessionIds) && c.qualifyingSessionIds.includes(targetSessionId);
      });
    }

    // 3. If still not matched, check if session exists in sessions array and has allocatedCertificateId
    if (!matchedCert && targetSessionId) {
      const sess = sessions.find((s) => s.sessionId === targetSessionId || s.id === targetSessionId);
      if (sess && sess.allocatedCertificateId) {
        matchedCert = issuedCertificates.find((c) => c.certificateId === sess.allocatedCertificateId);
      }
    }

    hasAutoOpenedRef.current = true;

    if (matchedCert) {
      setViewingCertificate(matchedCert);
      setIsPreviewModalOpen(false);
      setTimeout(() => {
        const el = document.getElementById(`earned-cert-card-${matchedCert.certificateId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } else {
      toast.info("Certificate not yet issued for this session.");
      setViewingCertificate(null);
      setIsPreviewModalOpen(false);
    }
  }, [loading, issuedCertificates, sessions, searchParams, routeParams.certId, location.state]);

  // Lock background scroll when any modal is open
  useEffect(() => {
    const isModalOpen = Boolean(viewingCertificate || isPreviewModalOpen || isConfirmModalOpen);
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [viewingCertificate, isPreviewModalOpen, isConfirmModalOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!viewingCertificate && !isPreviewModalOpen && !isConfirmModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingCertificate(null);
        setIsPreviewModalOpen(false);
        setIsConfirmModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingCertificate, isPreviewModalOpen, isConfirmModalOpen]);

  // PDF Generation function
  const downloadElementAsPDF = async (element: HTMLElement, filename: string) => {
    await document.fonts?.ready;
    if (document.fonts?.load) {
      try {
        await Promise.all([
          document.fonts.load("800 24px 'Plus Jakarta Sans'"),
          document.fonts.load("700 64px 'Georgia'"),
          document.fonts.load("700 18px 'Inter'"),
        ]);
      } catch (e) {
        console.warn("Font preloading note:", e);
      }
    }
    await new Promise((r) => setTimeout(r, 60));

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#030B1C",
      width: 1682,
      height: 935,
      windowWidth: 1682,
      windowHeight: 935,
      imageTimeout: 15000,
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

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const targetW = 297;
    const targetH = 297 / (1682 / 935);
    const offsetY = (210 - targetH) / 2;
    pdf.addImage(imgData, "PNG", 0, offsetY, targetW, targetH, undefined, "SLOW");
    pdf.save(filename);
  };

  // Official Domain PDF Download Handler (Guarded by backend verification)
  const handleDownloadMasterPDF = async (targetCertObj?: any) => {
    if (downloadingMaster) return;

    const certToDownload = targetCertObj || viewingCertificate || masterCert;

    if (!certToDownload?.certificateId || certToDownload?.certificateId === "PREVIEW" || certToDownload?.certificateId?.startsWith("PREVIEW")) {
      toast.error("Certificate has not been officially issued yet. Please complete qualifying interviews in the same domain and confirm your identity.");
      return;
    }

    setDownloadingMaster(true);
    setDownloadTarget({ cert: certToDownload, session: null });

    try {
      // 1. Authoritative backend download check
      const authCheck = await axios.get(`/api/certifications/download/${certToDownload.certificateId}`);
      if (!authCheck.data?.authorized) {
        throw new Error(authCheck.data?.message || "Unauthorized to download certificate");
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      const target = pdfRenderRef.current?.firstElementChild as HTMLElement | null;
      if (!target) throw new Error("Unable to locate certificate template");

      const frozenRecipient = certToDownload.candidateNameSnapshot || authCheck.data?.data?.candidateNameSnapshot || "Candidate";
      const domainSnapshot = certToDownload.categoryNameSnapshot || authCheck.data?.data?.categoryNameSnapshot || "IT";
      const safeName = frozenRecipient.replace(/\s+/g, "_");
      const safeDomain = domainSnapshot.replace(/\s+/g, "_");
      const milestoneSuffix = certToDownload.milestoneNumber ? `_Milestone_${certToDownload.milestoneNumber}` : "";
      const filename = `${safeName}_${safeDomain}_Interview_Certificate${milestoneSuffix}.pdf`;
      await downloadElementAsPDF(target, filename);
      toast.success(`Official ${domainSnapshot} Certificate ${certToDownload.milestoneNumber ? `#${certToDownload.milestoneNumber}` : ""} downloaded successfully!`);
    } catch (err: any) {
      console.error("Master PDF download error:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to generate Certificate PDF.");
    } finally {
      setDownloadingMaster(false);
      setDownloadTarget(null);
    }
  };

  // Domain-specific Identity Confirmation & Issuance Action
  const handleConfirmAndIssue = async (confirmedName: string) => {
    setIsIssuing(true);
    try {
      const targetCatId = confirmingCategory?.categoryId;
      const targetCatName = confirmingCategory?.categoryName || "domain";

      // 1. Confirm identity for the specific domain
      const confirmRes = await axios.post("/api/certifications/confirm-identity", {
        acknowledged: true,
        confirmedName: confirmedName.trim(),
        categoryId: targetCatId,
      });
      if (!confirmRes.data?.success) {
        throw new Error(confirmRes.data?.message || "Failed to confirm certificate identity");
      }

      // 2. Issue official certificate for this specific domain
      const issueRes = await axios.post("/api/certifications/issue", {
        categoryId: targetCatId,
      });
      if (issueRes.data?.success) {
        toast.success(`Official ${targetCatName} Certificate successfully issued!`);
        setIsConfirmModalOpen(false);
        setConfirmingCategory(null);
        await fetchAllData();
      } else {
        throw new Error(issueRes.data?.message || "Failed to issue certificate");
      }
    } catch (err: any) {
      console.error("Issuance error:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to issue certificate");
      throw err;
    } finally {
      setIsIssuing(false);
    }
  };

  if (loading) {
    return <CertificatesSkeleton />;
  }

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left selection:bg-[#EAF2FF] selection:text-[#0755E8] animate-in fade-in duration-200">
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="w-full space-y-6 sm:space-y-8">
          {/* ================================================================== */}
          {/* 1. COMPACT PAGE HEADER                                             */}
          {/* ================================================================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center text-[#0755E8] shrink-0 shadow-xs">
                <Award className="w-6 h-6 text-[#0755E8]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#172B4D] tracking-tight leading-tight">
                  My Certificates
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[#64748B] mt-0.5 truncate">
                  Domain-specific credentials earned for every 3 qualifying interviews in the same category
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {anyDomainEligible ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-300 bg-blue-50 text-xs font-semibold text-[#0755E8] shadow-xs animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 text-[#0755E8]" />
                  <span>{primaryEligibleDomain?.categoryName.toUpperCase()} CERTIFICATE READY</span>
                </div>
              ) : hasAnyIssuedCert ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-700 shadow-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{issuedCertificates.length} CREDENTIAL{issuedCertificates.length > 1 ? "S" : ""} ISSUED</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-700 shadow-xs">
                  <Eye className="w-3.5 h-3.5 text-amber-600" />
                  <span>PREVIEW MODE</span>
                </div>
              )}
              <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] shadow-xs">
                Completed: {completedSessions.length} total
              </div>
            </div>
          </div>

          {/* ================================================================== */}
          {/* 2. UNIFIED COMPACT DOMAIN PROGRESS BANNER                          */}
          {/* ================================================================== */}
          {activeDomains.length === 0 ? (
            <div className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden border border-[#BFDBFE] bg-white p-8 sm:p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] border border-slate-200 flex items-center justify-center mx-auto text-[#64748B] mb-3">
                <Award className="w-6 h-6 text-[#94A3B8]" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-[#1E293B]">
                  Your certificate journey starts here.
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  Complete three attended and evaluated interviews in the same domain to earn your first certificate.
                </p>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/find-mentor")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0755E8] hover:bg-[#0645C7] transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <span>Find a Mentor</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <section
              aria-label="Certificate Progress Banner"
              className="relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden transition-all duration-200 border border-[#BFDBFE] shadow-[0_8px_25px_rgba(37,99,235,0.08),0_1px_3px_rgba(37,99,235,0.04)] px-6 sm:px-8 lg:px-9 pt-8 sm:pt-9 pb-6 sm:pb-7 box-border bg-white"
              style={{
                background:
                  "radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.08), transparent 35%), radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.08), transparent 35%), linear-gradient(135deg, #F4F8FE 0%, #FFFFFF 40%, #EFF6FF 100%)",
              }}
            >
              {/* Top-Left Pure Vector Decorative Ribbon (Positioned in corner with zero content overlap) */}
              <svg
                className="absolute top-0 left-0 w-[95px] sm:w-[110px] h-[38px] sm:h-[44px] pointer-events-none select-none z-0"
                viewBox="0 0 240 95"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="tlGradMain-banner" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0B3080" />
                    <stop offset="50%" stopColor="#0755E8" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                  <linearGradient id="tlGradDark-banner" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#061A48" />
                    <stop offset="100%" stopColor="#0B3080" />
                  </linearGradient>
                  <linearGradient id="tlGradGold-banner" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D97706" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FDE68A" />
                  </linearGradient>
                </defs>
                <path d="M 0 0 L 140 0 C 110 32, 55 65, 0 76 Z" fill="url(#tlGradDark-banner)" />
                <path d="M 0 0 L 190 0 C 150 40, 80 78, 0 92 Z" fill="url(#tlGradMain-banner)" opacity="0.95" />
                <path d="M 0 76 C 55 65, 110 32, 140 0" stroke="url(#tlGradGold-banner)" strokeWidth="3.5" fill="none" />
                <path d="M 0 92 C 80 78, 150 40, 190 0" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.75" fill="none" />
              </svg>

              {/* Bottom-Right Pure Vector Decorative Ribbon */}
              <svg
                className="absolute bottom-0 right-0 w-[180px] sm:w-[210px] h-[80px] sm:h-[95px] pointer-events-none select-none z-0"
                viewBox="0 0 240 105"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="brGradMain-banner" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#0B3080" />
                    <stop offset="50%" stopColor="#0755E8" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                  <linearGradient id="brGradDark-banner" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#061A48" />
                    <stop offset="100%" stopColor="#0B3080" />
                  </linearGradient>
                  <linearGradient id="brGradGold-banner" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#D97706" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#FDE68A" />
                  </linearGradient>
                </defs>
                <path d="M 100 105 C 145 72, 190 40, 240 25 L 240 105 Z" fill="url(#brGradDark-banner)" />
                <path d="M 50 105 C 105 68, 165 32, 240 12 L 240 105 Z" fill="url(#brGradMain-banner)" opacity="0.95" />
                <path d="M 100 105 C 145 72, 190 40, 240 25" stroke="url(#brGradGold-banner)" strokeWidth="3.5" fill="none" />
                <path d="M 50 105 C 105 68, 165 32, 240 12" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.75" fill="none" />
              </svg>

              {/* Decorative Flowing Ambient Waves */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
                preserveAspectRatio="none"
                viewBox="0 0 1000 240"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 90 230 C 350 195, 620 245, 870 160"
                  stroke="#0755E8"
                  strokeWidth="1.2"
                  strokeOpacity="0.10"
                  fill="none"
                />
                <path
                  d="M 50 240 C 310 210, 660 255, 930 170"
                  stroke="#93B8FF"
                  strokeWidth="0.8"
                  strokeOpacity="0.22"
                  fill="none"
                />
              </svg>

              {/* Grid: Left Content (Progress & Domain Selection) + Right Content (Single Generic Preview Thumbnail) */}
              <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-6 lg:gap-8">
                {/* Left Content Area */}
                <div className="min-w-0 space-y-3.5 sm:space-y-4 max-w-full">
                  {/* Top Control Bar: Active Domain Dropdown Selector + Status Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-[#1E293B] whitespace-nowrap">
                        Select Domain:
                      </span>

                      {/* Professional Custom Domain Dropdown (Strictly Candidate Activity-Based) */}
                      {activeDomains.length > 0 ? (
                        <div className="relative inline-block" ref={domainDropdownRef}>
                          <button
                            type="button"
                            aria-haspopup="listbox"
                            aria-expanded={isDomainDropdownOpen}
                            onClick={() => setIsDomainDropdownOpen((prev) => !prev)}
                            className={`inline-flex items-center gap-2 sm:gap-2.5 bg-white border text-xs sm:text-sm font-semibold rounded-xl py-1.5 px-3 sm:px-3.5 shadow-2xs transition-all cursor-pointer select-none ${
                              isDomainDropdownOpen
                                ? "border-[#0755E8] text-[#0755E8] ring-2 ring-[#0755E8]/20"
                                : "border-slate-300 hover:border-[#0755E8] text-slate-800 hover:bg-slate-50/70"
                            }`}
                          >
                            <span className="font-bold text-[#0F172A]">
                              {currentProg ? currentProg.categoryName : "Select Domain"}
                            </span>

                            {currentProg && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-extrabold whitespace-nowrap ${
                                  currentProg.isEligibleForNext
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-[#EAF2FF] text-[#0755E8] border border-[#BFDBFE]"
                                }`}
                              >
                                {currentProg.isEligibleForNext ? "3/3 Ready" : `${currentProg.progressInMilestone}/3`}
                              </span>
                            )}

                            <ChevronDown
                              size={14}
                              className={`transition-transform duration-200 text-[#0755E8] ${
                                isDomainDropdownOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Dropdown Menu Options Panel */}
                          {isDomainDropdownOpen && (
                            <div
                              role="listbox"
                              className="absolute left-0 top-[calc(100%+6px)] min-w-[240px] sm:min-w-[270px] max-h-64 overflow-y-auto bg-white border border-slate-200/95 rounded-2xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
                            >
                              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Active Candidate Domains
                              </div>
                              <div className="space-y-1">
                                {activeDomains.map((ad) => {
                                  const isSelected = selectedDomain.toLowerCase() === ad.categoryName.toLowerCase();
                                  return (
                                    <button
                                      key={ad.categoryId}
                                      type="button"
                                      role="option"
                                      aria-selected={isSelected}
                                      onClick={() => {
                                        setSelectedDomain(ad.categoryName);
                                        setIsDomainDropdownOpen(false);
                                      }}
                                      className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left ${
                                        isSelected
                                          ? "bg-[#EAF2FF] text-[#0755E8]"
                                          : "text-slate-700 hover:text-[#0755E8] hover:bg-slate-50"
                                      }`}
                                    >
                                      <span className="truncate pr-2 font-bold">{ad.categoryName}</span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            isSelected
                                              ? "bg-[#0755E8] text-white"
                                              : ad.isEligibleForNext
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-slate-100 text-slate-600"
                                          }`}
                                        >
                                          {ad.isEligibleForNext ? "3/3 Ready" : `${ad.progressInMilestone}/3`}
                                        </span>
                                        {isSelected && (
                                          <Check size={14} className="text-[#0755E8] stroke-[2.5]" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Status Badge */}
                    {selectedDomain && currentProg ? (
                      currentProg.isEligibleForNext ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.05em] uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          CERTIFICATE READY (3/3)
                        </span>
                      ) : currentProg.totalIssuedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.05em] uppercase bg-[#EBF3FF] text-[#0755E8] border border-[#BFDBFE] shadow-2xs whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                          CERTIFICATE {currentProg.totalIssuedCount} CONFERRED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.05em] uppercase bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] shadow-2xs whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                          {currentProg.progressInMilestone}/3 IN PROGRESS
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.05em] uppercase bg-[#EBF3FF] text-[#0755E8] border border-[#BFDBFE] shadow-2xs whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                        {activeDomains.length} ACTIVE DOMAIN{activeDomains.length > 1 ? "S" : ""}
                      </span>
                    )}
                  </div>

                  {/* Dynamic Progress Details Area */}
                  {selectedDomain && currentProg ? (
                    (() => {
                      const msgs = getProgressMessages(currentProg);
                      const milestoneLabel = currentProg.nextMilestoneNumber
                        ? `Certificate Milestone ${currentProg.nextMilestoneNumber}`
                        : "Certificate Milestone 1";
                      return (
                        <div className="space-y-3 max-w-xl">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {milestoneLabel} ({currentProg.nextMilestoneRange})
                              </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight leading-tight break-words">
                              {currentProg.categoryName} — <span className="text-[#0755E8]">{milestoneLabel}</span>
                            </h2>

                            {/* Clean Explanatory Progress Typography */}
                            <div className="text-xs sm:text-sm text-[#334155] font-medium leading-relaxed mt-1.5 space-y-0.5">
                              <p className="font-semibold text-slate-900">
                                {currentProg.progressInMilestone} / 3 qualifying interviews completed
                              </p>
                              <p className={msgs.ready ? "font-bold text-emerald-700" : "text-slate-600"}>
                                {currentProg.remainingForMilestone > 0
                                  ? `${currentProg.remainingForMilestone} more interview${currentProg.remainingForMilestone === 1 ? "" : "s"} required`
                                  : "Milestone achieved! Ready for certificate issuance"}
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar & Numeric Milestone Indicators */}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden border border-slate-300/60">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  currentProg.isEligibleForNext ? "bg-emerald-600" : "bg-[#0755E8]"
                                }`}
                                style={{ width: `${Math.min(100, (currentProg.progressInMilestone / 3) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-xs font-semibold text-[#64748B]">
                              <span className={currentProg.isEligibleForNext ? "font-bold text-emerald-700" : "text-[#1E293B]"}>
                                {currentProg.progressInMilestone}/3 in current milestone
                              </span>
                              <span className="text-[11px] text-[#64748B]">
                                {currentProg.totalIssuedCount} Issued · {currentProg.totalEligibleCount} Total Qualifying
                              </span>
                            </div>
                          </div>

                          {/* Action Button: ONLY when 3/3 Milestone is reached */}
                          {currentProg.isEligibleForNext && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmingCategory(currentProg);
                                  setIsConfirmModalOpen(true);
                                }}
                                className="h-9 px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-98 animate-pulse"
                              >
                                <Sparkles size={14} className="text-white" />
                                <span>Confirm Name &amp; Generate Certificate</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    /* Clean Empty State when candidate has 0 qualifying activity across all domains */
                    <div className="space-y-2.5 max-w-xl py-2">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0755E8] mb-2 shadow-2xs">
                        <Award className="w-5 h-5 text-[#0755E8]" />
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
                        Your certificate journey starts here.
                      </h2>
                      <p className="text-xs sm:text-sm text-[#475569] font-normal leading-relaxed">
                        Complete your first attended and evaluated interview in any domain to begin tracking your certificate progress.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Section: ONE Generic Preview Thumbnail (Strictly Generic, No Action Buttons) */}
                <div className="flex flex-col items-center lg:items-end gap-2 shrink-0 self-center">
                  <div
                    onClick={() => {
                      setPreviewModalDomain(selectedDomain);
                      setIsPreviewModalOpen(true);
                    }}
                    className="w-[210px] sm:w-[230px] md:w-[245px] aspect-[1682/935] rounded-xl overflow-hidden border border-[#93C5FD] shadow-xs hover:border-[#0755E8] hover:shadow-md transition-all cursor-pointer bg-[#FFFEFA] relative group"
                    title="Click to preview certificate design"
                  >
                    <CertificateThumbnail mode="preview" domain={selectedDomain || undefined} />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                      <span className="px-3 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                        <Eye size={13} />
                        <span>Preview Design</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-[#64748B] font-medium text-center">
                    {selectedDomain ? `${selectedDomain} Design Preview` : "Click thumbnail to preview certificate design"}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================== */}
          {/* 3. MY EARNED CERTIFICATES SECTION (REVERTED & RESTORED FULL ACCESS) */}
          {/* ================================================================== */}
          <section
            id="my-earned-certificates-section"
            aria-label="My Earned Certificates"
            className="w-full space-y-4 pt-2"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0F172A] tracking-tight">
                    My Earned Certificates
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Officially conferred credentials with permanent recipient snapshots and verifiable IDs
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{issuedCertificates.length} Conferred</span>
              </span>
            </div>

            {issuedCertificates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                <p className="text-xs sm:text-sm font-medium text-[#64748B]">
                  No certificates issued yet. Complete 3 qualifying mock interviews in any domain to earn your first official credential.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {issuedCertificates.map((cert) => {
                  const domainName = cert.categoryNameSnapshot || "Technical";
                  const issueDateDisplay = cert.issueDate
                    ? new Date(cert.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Recently";

                  return (
                    <div
                      key={cert.certificateId || cert._id}
                      id={`earned-cert-card-${cert.certificateId}`}
                      className="group rounded-2xl border border-slate-200/90 bg-white hover:border-[#93B8FF] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_-8px_rgba(7,85,232,0.15)] transition-all overflow-hidden flex flex-col justify-between"
                    >
                      {/* Top: Certificate Thumbnail Preview */}
                      <div
                        onClick={() => setViewingCertificate(cert)}
                        className="relative w-full aspect-[1682/935] bg-[#030B1C] cursor-pointer overflow-hidden border-b border-slate-100 group-hover:opacity-95 transition-opacity"
                        title="Click to view full certificate"
                      >
                        <CertificateThumbnail
                          mode="issued"
                          userName={cert.candidateNameSnapshot}
                          domain={domainName}
                          expertName="Mockeefy Board of Directors"
                          issueDateStr={cert.issueDate}
                          certId={cert.certificateId}
                        />
                        <div className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                          <span className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                            <Eye size={13} />
                            <span>View Details</span>
                          </span>
                        </div>
                      </div>

                      {/* Middle: Certificate Meta Details */}
                      <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#0755E8] border border-blue-200/60">
                              {domainName}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {cert.milestoneRange || "Interviews 1–3"}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-[#0F172A] leading-snug truncate" title={`${domainName} Certificate ${cert.milestoneNumber ? `#${cert.milestoneNumber}` : ""}`}>
                            {domainName} Excellence Certificate {cert.milestoneNumber ? `(Milestone ${cert.milestoneNumber})` : ""}
                          </h3>

                          <div className="space-y-1 pt-1 text-[11.5px] text-[#475569]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Recipient:</span>
                              <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={cert.candidateNameSnapshot}>
                                {cert.candidateNameSnapshot}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Issued:</span>
                              <span className="font-medium text-slate-700">{issueDateDisplay}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">ID:</span>
                              <span className="font-mono text-[10.5px] text-slate-600 truncate max-w-[170px]" title={cert.certificateId}>
                                {cert.certificateId}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingCertificate(cert)}
                            className="h-8.5 px-3 rounded-xl text-xs font-semibold text-[#0755E8] bg-blue-50 hover:bg-blue-100/80 active:bg-blue-100 border border-blue-200/70 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          <button
                            type="button"
                            disabled={downloadingMaster}
                            onClick={() => handleDownloadMasterPDF(cert)}
                            className="h-8.5 px-3 rounded-xl text-xs font-bold text-white bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#0537A0] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-2xs active:scale-98"
                          >
                            <Download size={13} />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ================================================================== */}
        {/* VIEW-ONLY GENERIC PREVIEW MODAL                                    */}
        {/* ================================================================== */}
        {isPreviewModalOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-modal-title"
              onClick={() => setIsPreviewModalOpen(false)}
            >
              <div
                className="relative bg-[#060D1A] rounded-none sm:rounded-2xl md:rounded-3xl shadow-2xl border border-slate-800 w-full max-w-6xl h-full sm:h-auto sm:max-h-[94vh] flex flex-col overflow-hidden text-left transition-all animate-in zoom-in-95 duration-200 box-border"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Top Header Bar */}
                <div className="px-5 sm:px-8 py-3.5 sm:py-4.5 border-b border-slate-800/80 flex items-center justify-between bg-[#070F1E] shrink-0 z-20 box-border">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={brandLogo}
                      alt="Mockeefy"
                      className="h-6 sm:h-7 w-auto object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <h2
                        id="preview-modal-title"
                        className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-tight truncate"
                      >
                        Mockeefy Certificate Design Preview
                      </h2>
                      <p className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-400 tracking-[0.16em] uppercase mt-0.5 truncate">
                        PREVIEW ONLY · DESIGN DEMONSTRATION &amp; DOMAIN CUSTOMIZATION
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/90 active:bg-slate-700 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    aria-label="Close preview modal"
                  >
                    <X size={15} />
                    <span>Close</span>
                  </button>
                </div>

                {/* Dynamic Domain Selection Control Bar */}
                <div className="px-5 sm:px-8 py-2.5 sm:py-3 bg-[#071326] border-b border-slate-800/90 flex items-center justify-between flex-wrap gap-3 shrink-0 z-20 box-border">
                  <div className="flex items-center gap-2.5">
                    <label htmlFor="preview-domain-select" className="text-xs sm:text-sm font-semibold text-slate-200">
                      Preview Domain:
                    </label>
                    <div className="relative inline-block">
                      <select
                        id="preview-domain-select"
                        value={previewModalDomain}
                        onChange={(e) => setPreviewModalDomain(e.target.value)}
                        className="bg-slate-900/95 text-white text-xs sm:text-sm font-medium rounded-xl border border-slate-700/80 pl-3.5 pr-9 py-1.5 sm:py-2 appearance-none hover:border-[#0055FE] focus:outline-none focus:border-[#0055FE] focus:ring-1 focus:ring-[#0055FE] transition-all cursor-pointer shadow-xs"
                        aria-label="Select domain for certificate preview"
                      >
                        <option value="">Default (Your Domain)</option>
                        {allCategoryOptions.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={15}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Interactive Template Preview</span>
                  </div>
                </div>

                {/* Certificate Canvas Area (Strictly Preview Mode, View-Only, Context Menu & Drag Disabled) */}
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }}
                  onDragStart={(e) => {
                    e.preventDefault();
                    return false;
                  }}
                  className="w-full flex-1 flex flex-col items-center justify-center min-h-0 select-none"
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                >
                  <CertificateModalPreview>
                    <CertificateTemplate mode="preview" domain={previewModalDomain} />
                  </CertificateModalPreview>
                </div>

                {/* Bottom Action Bar (Strictly View-Only: Zero Download/Save Actions) */}
                <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-800/80 flex items-center justify-between bg-[#070F1E] shrink-0 z-20 flex-wrap gap-3 box-border shadow-[0_-1px_3px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2.5 text-slate-300 text-xs sm:text-sm font-medium">
                    <AlertCircle size={16} className="text-[#0755E8] shrink-0" />
                    <span>
                      Design preview only — your official certificate will be generated after completing the required interviews and confirming your name.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ================================================================== */}
        {/* OFFICIAL ISSUED CERTIFICATE MODAL                                  */}
        {/* ================================================================== */}
        {viewingCertificate &&
          createPortal(
            <div
              className="fixed inset-0 z-[99999] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="certificate-modal-title"
              onClick={() => setViewingCertificate(null)}
            >
              <div
                className="relative bg-[#060D1A] rounded-none sm:rounded-2xl md:rounded-3xl shadow-2xl border border-slate-800 w-full max-w-6xl h-full sm:h-auto sm:max-h-[94vh] flex flex-col overflow-hidden text-left transition-all animate-in zoom-in-95 duration-200 box-border"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Top Header Bar */}
                <div className="px-5 sm:px-8 py-3.5 sm:py-4.5 border-b border-slate-800/80 flex items-center justify-between bg-[#070F1E] shrink-0 z-20 box-border">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={brandLogo}
                      alt="Mockeefy"
                      className="h-6 sm:h-7 w-auto object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <h2
                        id="certificate-modal-title"
                        className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-tight truncate"
                      >
                        {viewingCertificate.categoryNameSnapshot || "Domain"} Certificate — Milestone {viewingCertificate.milestoneNumber || 1}
                      </h2>
                      <p className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-400 tracking-[0.16em] uppercase mt-0.5 truncate">
                        OFFICIAL CAREER ACCREDITATION • {viewingCertificate.milestoneRange || "Interviews 1–3"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingCertificate(null)}
                    className="shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/90 active:bg-slate-700 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    aria-label="Close certificate modal"
                  >
                    <X size={15} />
                    <span>Close</span>
                  </button>
                </div>

                {/* Certificate Canvas Area (Strictly Issued Mode) */}
                <CertificateModalPreview>
                  <CertificateTemplate
                    mode="issued"
                    userName={viewingCertificate.candidateNameSnapshot}
                    domain={viewingCertificate.categoryNameSnapshot || "IT"}
                    expertName="Mockeefy Board of Directors"
                    issueDateStr={viewingCertificate.issueDate}
                    certId={viewingCertificate.certificateId}
                    isMaster={false}
                  />
                </CertificateModalPreview>

                {/* Bottom Action Bar */}
                <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-800/80 flex items-center justify-between bg-[#070F1E] shrink-0 z-20 flex-wrap gap-3 box-border shadow-[0_-1px_3px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-200 leading-none">
                      Digitally Verified &amp; Recruiter-Ready • Recipient: <span className="text-white font-bold">{viewingCertificate.candidateNameSnapshot}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      disabled={downloadingMaster}
                      onClick={async () => {
                        await handleDownloadMasterPDF(viewingCertificate);
                      }}
                      className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-[#0055FE] hover:bg-[#0047D6] active:bg-[#003CB8] text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {downloadingMaster ? (
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
            width: "1682px",
            height: "935px",
            opacity: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: -99999,
          }}
        >
          <div ref={pdfRenderRef} id="pdf-capture-stage" style={{ width: "1682px", height: "935px" }}>
            {downloadTarget && (
              <CertificateTemplate
                mode="issued"
                userName={
                  downloadTarget.cert?.candidateNameSnapshot ||
                  downloadTarget.session?.candidateNameSnapshot ||
                  "Candidate"
                }
                domain={
                  downloadTarget.cert?.categoryNameSnapshot ||
                  downloadTarget.session?.category ||
                  "IT"
                }
                expertName="Mockeefy Board of Directors"
                issueDateStr={
                  downloadTarget.cert?.issueDate
                    ? downloadTarget.cert.issueDate
                    : downloadTarget.session
                    ? getFormattedIssueDate(downloadTarget.session)
                    : ""
                }
                certId={
                  downloadTarget.cert?.certificateId ||
                  downloadTarget.session?.certificateId ||
                  ""
                }
                isMaster={false}
              />
            )}
          </div>
        </div>

        {/* Identity Confirmation Modal with domain name & milestone */}
        <IdentityConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            setConfirmingCategory(null);
          }}
          onConfirmed={() => {}}
          candidateName={previewData?.profileName || user?.name || ""}
          categoryName={confirmingCategory?.categoryName}
          milestoneNumber={confirmingCategory?.milestoneNumber}
          onConfirmApi={handleConfirmAndIssue}
          submitting={isIssuing}
        />
      </div>
    </div>
  );
}
