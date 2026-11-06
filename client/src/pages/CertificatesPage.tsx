import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../lib/axios";
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import CertificatesSkeleton from "../components/CertificatesSkeleton";
import brandLogo from "../assets/logo/mockeefylogo.png";
import masterCertTemplateImg from "../assets/certificates/mockeefy_certificate_master.jpg";

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
  if (len <= 14) return "46px";
  if (len <= 20) return "40px";
  if (len <= 28) return "34px";
  if (len <= 36) return "28px";
  return "22px";
};

/**
 * Formats the user's profile name for certificate display:
 * - Extracts clean human name even if raw string is an email address (e.g. "joel.26csa@licet.ac.in" -> "Joel")
 * - Removes student/roll alphanumeric codes (e.g. "26csa")
 * - Capitalizes each word cleanly
 * - Strips legacy parenthetical role markers if present (e.g. "(user)")
 */
const formatCertificateName = (rawName?: string | null): string => {
  if (!rawName || typeof rawName !== "string") return "Darwin";

  // Remove any legacy parenthetical role indicators like (user), (candidate), (expert), etc.
  let stripped = rawName.replace(/\s*\((?:user|candidate|expert|coach|mentor|admin)\)\s*/gi, " ");

  // If the raw name is an email address (e.g. "joel.26csa@licet.ac.in"), extract the clean name part
  if (stripped.includes("@")) {
    const localPart = stripped.split("@")[0];
    // Strip student roll codes, numbers, and alphanumeric tags (e.g. "26csa")
    const cleanedLocal = localPart
      .replace(/\b[a-zA-Z]*\d+[a-zA-Z0-9]*\b/g, "")
      .replace(/[._-]+/g, " ")
      .trim();
    stripped = cleanedLocal || localPart.replace(/[._-]+/g, " ").trim();
  }

  // Normalize multi-spaces & trim
  const cleaned = stripped.trim().replace(/\s+/g, " ");
  if (!cleaned) return "Darwin";

  return cleaned
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

// ============================================================================
// MASTER CERTIFICATE TEMPLATE — REBUILT FROM ZERO (1024 × 682 CANONICAL CANVAS)
// 100% DETERMINISTIC VECTOR ARTWORK MATCHING THE TARGET REFERENCE IMAGE
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
  const plaqueText = isMaster
    ? "MASTER INTERVIEW READINESS CERTIFICATION"
    : `${displayDomain} PROFESSIONAL MOCK INTERVIEW SESSION`;

  const formattedName = formatCertificateName(userName);
  
  // Dynamic font sizing for recipient name on 1536 x 1024 master canvas
  const getNameFontSize = (name: string): string => {
    const len = (name || "").trim().length;
    if (len <= 8) return "74px";
    if (len <= 14) return "66px";
    if (len <= 20) return "56px";
    if (len <= 28) return "46px";
    return "36px";
  };
  const recipientFontSize = getNameFontSize(formattedName);

  // Universal date formatting to match "Nov 1, 2026"
  const displayDate = useMemo(() => {
    if (!issueDateStr) return "Nov 1, 2026";
    const d = new Date(issueDateStr);
    if (!isNaN(d.getTime())) {
      const month = d.toLocaleString("en-US", { month: "short" });
      const day = d.getDate();
      const year = d.getFullYear();
      return `${month} ${day}, ${year}`;
    }
    return issueDateStr;
  }, [issueDateStr]);

  const isDefaultIT = displayDomain === "IT" && !isMaster;
  const isDefaultDate = displayDate === "Nov 1, 2026";

  return (
    <div
      id="mockeefy-official-certificate"
      className="relative overflow-hidden select-none box-border"
      style={{
        width: "1536px",
        height: "1024px",
        backgroundColor: "#FFFEFA",
        color: "#08172A",
        fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, sans-serif",
      }}
    >
      {/* 1. MASTER PHOTOREALISTIC TARGET ARTWORK (1536 x 1024) */}
      <img
        src={masterCertTemplateImg}
        alt="Mockeefy Master Certificate Template"
        className="absolute inset-0 w-full h-full object-cover block select-none pointer-events-none"
        style={{ width: "1536px", height: "1024px" }}
      />

      {/* 2. DYNAMIC VECTOR OVERLAY (1536 x 1024) */}
      <svg
        className="absolute inset-0 w-full h-full block select-none"
        style={{ width: "1536px", height: "1024px" }}
        viewBox="0 0 1536 1024"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="plaqueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#041633" />
            <stop offset="20%" stopColor="#08377E" />
            <stop offset="50%" stopColor="#0B4FB8" />
            <stop offset="80%" stopColor="#08377E" />
            <stop offset="100%" stopColor="#041633" />
          </linearGradient>
        </defs>

        {/* Dynamic Plaque Overlay: if domain is NOT standard IT mock session */}
        {!isDefaultIT && (
          <g transform="translate(768, 363)">
            {/* Seamless Royal Blue Cartouche Fill */}
            <polygon
              points="-320,0 -292,-20 292,-20 320,0 292,20 -292,20"
              fill="url(#plaqueGrad)"
            />
            <text
              x="0"
              y="6"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="17.5"
              fontWeight="800"
              letterSpacing="2.8"
              fontFamily="'Inter', 'Plus Jakarta Sans', sans-serif"
            >
              {plaqueText}
            </text>
          </g>
        )}

        {/* Recipient Name: Directly on warm ivory certificate background (No background box) */}
        <text
          x="768"
          y="544"
          textAnchor="middle"
          fill="#08172A"
          fontSize={recipientFontSize}
          fontWeight="700"
          fontStyle="italic"
          fontFamily="'Lora', 'Libre Baskerville', Georgia, 'Times New Roman', serif"
        >
          {formattedName}
        </text>

        {/* Dynamic Description Paragraph: if domain is NOT standard IT */}
        {!isDefaultIT && (
          <g>
            {/* Seamless Warm Ivory Parchment Patch */}
            <rect
              x="260"
              y="615"
              width="1016"
              height="60"
              fill="#FAF8F4"
            />
            {isMaster ? (
              <text
                x="768"
                y="638"
                textAnchor="middle"
                fill="#334155"
                fontSize="20px"
                fontFamily="'Inter', 'Plus Jakarta Sans', sans-serif"
              >
                <tspan x="768" dy="0">demonstrating comprehensive mastery across multiple technical domains,</tspan>
                <tspan x="768" dy="30">interview readiness, and elite communication.</tspan>
              </text>
            ) : (
              <text
                x="768"
                y="638"
                textAnchor="middle"
                fill="#334155"
                fontSize="20px"
                fontFamily="'Inter', 'Plus Jakarta Sans', sans-serif"
              >
                <tspan x="768" dy="0">
                  has successfully completed a structured mock interview in the{" "}
                  <tspan fontWeight="700" fill="#08172A">{displayDomain} domain</tspan>,
                </tspan>
                <tspan x="768" dy="30">
                  demonstrating dedication to improving interview skills and professional growth.
                </tspan>
              </text>
            )}
          </g>
        )}

        {/* Dynamic Issued Date: if date is NOT 'Nov 1, 2026' */}
        {!isDefaultDate && (
          <g>
            <rect
              x="250"
              y="815"
              width="210"
              height="40"
              fill="#FAF8F4"
            />
            <text
              x="264"
              y="845"
              fill="#08172A"
              fontSize="25px"
              fontWeight="800"
              fontFamily="'Inter', sans-serif"
            >
              {displayDate}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
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
    if (w > 0) setScale(w / 1536);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        if (w > 0) setScale(w / 1536);
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
      style={{ aspectRatio: "1536 / 1024" }}
    >
      <div
        style={{
          width: "1536px", height: "1024px",
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
// Fits the canonical 1536x1024 certificate inside the modal viewport without distortion
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

    const CANVAS_WIDTH = 1536;
    const CANVAS_HEIGHT = 1024;
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
          width: `${Math.round(1536 * scale)}px`,
          height: `${Math.round(1024 * scale)}px`,
          position: "relative",
          boxShadow:
            "0 25px 70px -15px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          borderRadius: "6px",
          overflow: "hidden",
          backgroundColor: "#FFFEFA",
          flexShrink: 0,
          transition: "width 0.15s ease-out, height 0.15s ease-out",
        }}
      >
        <div
          style={{
            width: "1536px",
            height: "1024px",
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
  const [searchParams] = useSearchParams();
  const routeParams = useParams();

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
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
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

  // Category filter state
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
    const isModalOpen = Boolean(selectedSession || isMasterSelected);
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedSession, isMasterSelected]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!selectedSession && !isMasterSelected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedSession(null);
        setIsMasterSelected(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSession, isMasterSelected]);

  // PDF Generation function
  const downloadElementAsPDF = async (element: HTMLElement, filename: string) => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#FFFEFA",
      width: 1536,
      height: 1024,
      windowWidth: 1536,
      windowHeight: 1024,
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
          role:
            s.expertDetails?.currentRole ||
            s.expertDetails?.role ||
            s.expertId?.currentRole ||
            s.expertId?.role ||
            "Interview Lead",
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
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left selection:bg-[#EAF2FF] selection:text-[#0755E8] animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="relative z-10">
      <div className="w-full space-y-6 sm:space-y-8">
        {/* ================================================================== */}
        {/* 1. COMPACT PAGE HEADER (90-110px max height)                       */}
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
                Official verified credentials conferred from completed mock interviews
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#0755E8]/30 bg-white text-xs font-semibold text-[#0755E8] shadow-xs">
              <Award className="w-3.5 h-3.5 text-[#0755E8]" />
              <span>OFFICIAL CREDENTIALS</span>
            </div>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-[#E2E8F0] bg-white text-xs font-semibold text-[#334155] shadow-xs">
              Total: {completedSessions.length}
            </div>
          </div>
        </div>
{/* ================================================================== */}
        {/* MASTER CREDENTIAL BANNER (CLEAN REBUILD: COMPACT HORIZONTAL CARD)  */}
        {/* ================================================================== */}
        <section
          aria-label="Master Credential Announcement"
          className="relative w-full rounded-[28px] overflow-hidden transition-all duration-200 border border-[#BFDBFE] shadow-[0_8px_25px_rgba(37,99,235,0.08),0_1px_3px_rgba(37,99,235,0.04)] px-6 sm:px-8 lg:px-9 py-5 sm:py-6 flex items-center box-border"
          style={{
            background:
              "radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.08), transparent 35%), radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.08), transparent 35%), linear-gradient(135deg, #F4F8FE 0%, #FFFFFF 40%, #EFF6FF 100%)",
          }}
        >
          {/* Top-Left Pure Vector Decorative Ribbon (Zero Ghost Text, Pure SVG) */}
          <svg
            className="absolute top-0 left-0 w-[180px] sm:w-[210px] h-[75px] sm:h-[88px] pointer-events-none select-none z-0"
            viewBox="0 0 240 95"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="tlGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0B3080" />
                <stop offset="50%" stopColor="#0755E8" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
              <linearGradient id="tlGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#061A48" />
                <stop offset="100%" stopColor="#0B3080" />
              </linearGradient>
              <linearGradient id="tlGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#FDE68A" />
              </linearGradient>
            </defs>
            <path d="M 0 0 L 140 0 C 110 32, 55 65, 0 76 Z" fill="url(#tlGradDark)" />
            <path d="M 0 0 L 190 0 C 150 40, 80 78, 0 92 Z" fill="url(#tlGradMain)" opacity="0.95" />
            <path d="M 0 76 C 55 65, 110 32, 140 0" stroke="url(#tlGradGold)" strokeWidth="3.5" fill="none" />
            <path d="M 0 92 C 80 78, 150 40, 190 0" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.75" fill="none" />
          </svg>

          {/* Bottom-Right Pure Vector Decorative Ribbon (Zero Ghost Text, Pure SVG) */}
          <svg
            className="absolute bottom-0 right-0 w-[180px] sm:w-[210px] h-[80px] sm:h-[95px] pointer-events-none select-none z-0"
            viewBox="0 0 240 105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="brGradMain" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#0B3080" />
                <stop offset="50%" stopColor="#0755E8" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="brGradDark" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#061A48" />
                <stop offset="100%" stopColor="#0B3080" />
              </linearGradient>
              <linearGradient id="brGradGold" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#FDE68A" />
              </linearGradient>
            </defs>
            <path d="M 100 105 C 145 72, 190 40, 240 25 L 240 105 Z" fill="url(#brGradDark)" />
            <path d="M 50 105 C 105 68, 165 32, 240 12 L 240 105 Z" fill="url(#brGradMain)" opacity="0.95" />
            <path d="M 100 105 C 145 72, 190 40, 240 25" stroke="url(#brGradGold)" strokeWidth="3.5" fill="none" />
            <path d="M 50 105 C 105 68, 165 32, 240 12" stroke="#60A5FA" strokeWidth="2" strokeOpacity="0.75" fill="none" />
          </svg>

          {/* Decorative Dot Matrix & Subtle Ambient Waves */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
            preserveAspectRatio="none"
            viewBox="0 0 1000 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >

            {/* Ambient Flowing Wave Curves */}
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

          {/* Grid Layout: Left Content (minmax(0, 1fr)) + Right Content (auto) */}
          <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-center gap-6 lg:gap-8">
            {/* Left Content Area */}
            <div className="min-w-0 space-y-2.5 sm:space-y-3 max-w-full lg:max-w-[94%]">
              {/* 1. Status Badge & Credential ID on the SAME horizontal row */}
              <div className="flex items-center gap-3 sm:gap-4 flex-nowrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold tracking-[0.05em] uppercase bg-[#EBF3FF] text-[#0755E8] border border-[#BFDBFE] shadow-2xs whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8] animate-pulse" />
                  MASTER CREDENTIAL CONFERRED
                </span>
                <span className="text-xs sm:text-sm text-[#64748B] font-mono font-medium tracking-wide whitespace-nowrap">
                  ID: {masterCertId}
                </span>
              </div>

              {/* 2. Main Title (24-26px desktop, Deep Navy #0F172A, bold modern sans-serif) */}
              <h2 className="text-xl sm:text-2xl lg:text-[25px] font-bold text-[#0F172A] tracking-tight leading-tight">
                Mockeefy Master Interview Excellence Credential
              </h2>

              {/* 3. Description (14-15px, line-height 1.55, color #475569) */}
              <p className="text-xs sm:text-sm text-[#475569] font-normal leading-relaxed max-w-xl">
                {completedSessions.length > 0
                  ? `Conferred for completing ${completedSessions.length} sessions across multiple domains. Demonstrates comprehensive interview mastery.`
                  : "Conferred for demonstrating comprehensive interview mastery across multiple domains, interview readiness, and elite communication."}
              </p>
            </div>

            {/* Right Section: Certificate Thumbnail + Action Buttons Directly Underneath */}
            <div className="flex flex-col items-center lg:items-end gap-2.5 shrink-0 self-center">
              {/* Certificate Thumbnail (width: 220-235px, aspect-ratio: 1536/1024) */}
              <div
                onClick={() => {
                  setSelectedSession(null);
                  setIsMasterSelected(true);
                }}
                className="w-[210px] sm:w-[225px] md:w-[235px] aspect-[1536/1024] rounded-lg overflow-hidden border border-[#93C5FD] shadow-xs hover:border-[#0755E8] hover:shadow-md transition-all cursor-pointer bg-[#FFFEFA]"
                title="Click to preview Master Certificate"
              >
                <CertificateThumbnail
                  userName={candidateName}
                  domain="Master"
                  expertName="Mockeefy Board of Directors"
                  issueDateStr={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  certId={masterCertId}
                  isMaster={true}
                />
              </div>

              {/* Action Buttons: Unified horizontal row directly underneath the certificate */}
              <div className="flex items-center gap-2.5 w-full justify-center lg:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSession(null);
                    setIsMasterSelected(true);
                  }}
                  className="h-9 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#94A3B8] shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <Eye size={14} className="text-[#0755E8]" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMasterPDF}
                  disabled={downloadingMaster}
                  className="h-9 px-4 sm:px-5 rounded-full text-xs sm:text-sm font-bold text-white bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] shadow-sm shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap active:scale-98"
                >
                  {downloadingMaster ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} strokeWidth={2.4} />
                      <span>Download Master PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* 3. OPTIONAL ADDITIONAL CERTIFICATES (Compact Clean Grid)           */}
        {/* ================================================================== */}
        {completedSessions.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm sm:text-base font-bold text-[#172B4D] tracking-tight">
                Completed Session Certificates ({completedSessions.length})
              </h3>

              {/* Dynamic Category Filter Tabs if > 1 Category */}
              {categories.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === "all"
                        ? "bg-[#0755E8] text-white"
                        : "bg-white hover:bg-[#F5F8FF] text-[#334155] border border-[#E2E8F0]"
                    }`}
                  >
                    All ({completedSessions.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory.toLowerCase() === cat.name.toLowerCase()
                          ? "bg-[#0755E8] text-white"
                          : "bg-white hover:bg-[#F5F8FF] text-[#334155] border border-[#E2E8F0]"
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Session Certificate Cards Grid */}
            <div ref={certificatesListRef} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {pagedCertificates.map((session) => {
                  const isDownloading = downloading === session.id;
                  const formattedIssueDate = getFormattedIssueDate(session);
                  const certIdString = `MCFY-${(session.id || "CERT").slice(-8).toUpperCase()}`;

                  return (
                    <article
                      key={session.id}
                      onClick={() => {
                        setIsMasterSelected(false);
                        setSelectedSession(session);
                      }}
                      className="group relative bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] hover:border-[#93B8FF] shadow-[0_2px_12px_rgba(23,43,77,0.04)] hover:shadow-[0_6px_20px_rgba(7,85,232,0.08)] hover:-translate-y-0.5 transition-all duration-200 p-4 sm:p-4.5 flex flex-col justify-between h-full w-full text-left box-border cursor-pointer"
                    >
                      <div className="space-y-3 flex-1 flex flex-col">
                        {/* Certificate Visual Thumbnail Preview Frame */}
                        <div className="w-full flex items-center justify-center bg-[#F5F8FF] rounded-xl p-2 sm:p-2.5 border border-[#E2E8F0]">
                          <div
                            className="relative w-full max-w-[260px] sm:max-w-[280px] aspect-[1536/1024] rounded-lg overflow-hidden border border-[#E2E8F0] shadow-xs group/thumb bg-[#FFFEFA] transition-all duration-200 hover:border-[#0755E8]"
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

                        {/* Header: Title & Recipient + Verification Tag */}
                        <div className="flex items-start justify-between gap-3 pt-0.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl bg-[#EAF2FF] border border-[#93B8FF]/40 flex items-center justify-center text-[#0755E8] shrink-0 shadow-xs">
                              <Award className="w-4.5 h-4.5 text-[#0755E8]" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[#172B4D] text-sm truncate group-hover:text-[#0755E8] transition-colors leading-tight">
                                {session.category || "Professional"} Mock Interview Certificate
                              </h4>

                              <p className="text-xs font-medium text-[#64748B] truncate mt-0.5 leading-tight flex items-center gap-1.5">
                                <span>Certificate of Completion</span>
                                <span className="text-[#94A3B8]">•</span>
                                <span className="text-[#334155] font-semibold">{candidateName}</span>
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D] border border-emerald-200 text-[9.5px] font-bold uppercase tracking-tight shadow-xs">
                              <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                              <span>Verified</span>
                            </span>
                          </div>
                        </div>

                        {/* Structured Certificate Credential Details Box */}
                        <div className="bg-[#F8FAFC] group-hover:bg-[#F0F6FF]/60 border border-[#E2E8F0] rounded-xl p-3 space-y-2 transition-colors duration-200 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[9.5px] uppercase font-semibold text-[#64748B] tracking-wider">
                                Specialization
                              </span>
                              <div className="font-semibold text-[#172B4D] flex items-center gap-1.5 truncate">
                                <Briefcase className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                <span className="truncate">{session.category || "IT"}</span>
                              </div>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[9.5px] uppercase font-semibold text-[#64748B] tracking-wider">
                                Issue Date
                              </span>
                              <div className="font-semibold text-[#172B4D] flex items-center gap-1.5 truncate">
                                <Calendar className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                                <span className="truncate">{formattedIssueDate}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="text-[9.5px] uppercase font-semibold text-[#64748B] shrink-0">
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
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFFBEB] border border-[#B45309]/20 text-[#B45309] text-[10px] font-bold shrink-0">
                                ★ {session.expertReview.overallRating}/5
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Certificate Action Row */}
                      <div className="w-full pt-3 mt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono font-semibold text-[#64748B] bg-[#F5F8FF] px-2 py-0.5 rounded-md border border-[#E2E8F0] truncate">
                            ID: {certIdString}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMasterSelected(false);
                              setSelectedSession(session);
                            }}
                            className="px-3 py-1 bg-white hover:bg-[#F5F8FF] text-[#172B4D] border border-[#E2E8F0] hover:border-[#93B8FF] rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
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
                            className="px-3 py-1 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={12} className="animate-spin text-white" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download size={12} strokeWidth={2.2} />
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

              {/* Pagination (desktop) */}
              {filteredCertificates.length > PAGE_SIZE && (
                <div className="hidden md:flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                  <div className="text-xs font-semibold text-[#64748B]">
                    Showing <span className="text-[#172B4D] tabular-nums">{pageStartIdx + 1}</span>–<span className="text-[#172B4D] tabular-nums">{pageEndIdx}</span> of{" "}
                    <span className="text-[#172B4D] tabular-nums">{filteredCertificates.length}</span> certificates
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold hover:border-[#93B8FF] hover:text-[#0755E8] disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                    >
                      Prev
                    </button>
                    <div className="px-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-[#172B4D] tabular-nums shadow-xs">
                      Page {page} of {totalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold hover:border-[#93B8FF] hover:text-[#0755E8] disabled:opacity-40 transition-all cursor-pointer shadow-xs"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {/* Pagination (mobile) */}
              {filteredCertificates.length > PAGE_SIZE && (
                <div className="md:hidden pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
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
                    className="px-3 py-1 rounded-xl border border-[#E2E8F0] bg-white text-[#334155] text-xs font-semibold disabled:opacity-40 cursor-pointer shadow-xs"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 4. FULL-SCREEN CERTIFICATE PREVIEW MODAL / OVERLAY                   */}
      {/* ==================================================================== */}
      {(selectedSession || isMasterSelected) && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-5 pt-6 pb-6 bg-[#040814]/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 box-border"
          onClick={() => {
            setSelectedSession(null);
            setIsMasterSelected(false);
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
                      : "Verified Mockeefy Certificate of Completion"}
                  </h3>
                  <p className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-400 tracking-[0.16em] uppercase mt-0.5 truncate">
                    OFFICIAL CAREER ACCREDITATION • A4 LANDSCAPE CREDENTIAL
                  </p>
                </div>
              </div>

              {/* Close button with X icon */}
              <button
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setIsMasterSelected(false);
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
                domain={isMasterSelected ? "Master" : (selectedSession?.category || "IT")}
                expertName={
                  isMasterSelected
                    ? "Mockeefy Board of Directors"
                    : (selectedSession?.expert || "Godson Arockia Raj A")
                }
                issueDateStr={
                  isMasterSelected
                    ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : (selectedSession ? getFormattedIssueDate(selectedSession) : "Nov 1, 2026")
                }
                certId={
                  isMasterSelected
                    ? masterCertId
                    : `MCFY-${(selectedSession?.id || "CERT").slice(-8).toUpperCase()}`
                }
                isMaster={isMasterSelected}
              />
            </CertificateModalPreview>

            {/* Bottom Action Bar */}
            <div className="px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-800/80 flex items-center justify-between bg-[#070F1E] shrink-0 z-20 flex-wrap gap-3 box-border shadow-[0_-1px_3px_rgba(0,0,0,0.3)]">
              {/* Left side: Verification info */}
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={13} strokeWidth={2.5} />
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-200 leading-none">
                  Digitally Verified &amp; Recruiter-Ready • High-Resolution Vector PDF
                </div>
              </div>

              {/* Right side: Download Button */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
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
          width: "1536px",
          height: "1024px",
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: -99999,
        }}
      >
        <div ref={pdfRenderRef} id="pdf-capture-stage" style={{ width: "1536px", height: "1024px" }}>
          {downloadTarget && (
            <CertificateTemplate
              userName={candidateName}
              domain={downloadTarget.isMaster ? "Master" : (downloadTarget.session?.category || "IT")}
              expertName={
                downloadTarget.isMaster
                  ? "Mockeefy Board of Directors"
                  : (downloadTarget.session?.expert || "Godson Arockia Raj A")
              }
              issueDateStr={
                downloadTarget.isMaster
                  ? new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : (downloadTarget.session ? getFormattedIssueDate(downloadTarget.session) : "Nov 1, 2026")
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
