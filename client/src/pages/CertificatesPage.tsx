import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../lib/axios";
import { Award, ChevronRight, Download, X } from "lucide-react";
import { getProfileImageUrl } from "../lib/imageUtils";
import MockeefyLogo from "../components/MockeefyLogo";
// @ts-ignore
import html2pdf from "html2pdf.js";

type ReviewInfo = {
  overallRating?: number;
  technicalRating?: number;
  communicationRating?: number;
  feedback?: string;
  strengths?: string[];
  weaknesses?: string[];
};

type Session = {
  id: string;
  sessionId: string;
  expert: string;
  profileImage?: string | null;
  startTime?: string;
  category?: string;
  status: string;
  expertReview?: ReviewInfo | null;
  candidateReview?: ReviewInfo | null;
};

// Certificate Template for full A4 landscape rendering (hidden in page, captured by html2pdf)
const CertificateTemplate = ({
  userName,
  isMaster,
  category,
  expertName,
  issueDate,
  certId
}: {
  userName: string;
  isMaster: boolean;
  category?: string;
  expertName?: string;
  issueDate: string;
  certId: string;
}) => {
  return (
    <div className="w-[842px] h-[595px] p-2 bg-white border-2 border-[#002366] relative font-serif flex flex-col box-border">
      {/* Inner thin border frame */}
      <div className="w-full h-full p-8 border border-[#002366] flex flex-col justify-between relative box-border bg-[#fafbfc]">
        {/* Header Ornaments */}
        <div className="text-center mt-2 flex flex-col items-center">
          <div className="w-12 h-12 shadow-md mb-2">
            <MockeefyLogo className="w-full h-full object-contain" variant="brand" />
          </div>
          <div className="text-[9px] font-sans font-bold text-gray-550 tracking-[0.25em] uppercase leading-none">
            Mockeefy Certified Assessment
          </div>
          
          {/* Gold Diamond Divider */}
          <div className="flex items-center justify-center gap-2.5 w-60 mx-auto mt-2">
            <div className="h-[1px] bg-amber-500/50 flex-1" />
            <div className="w-1.5 h-1.5 bg-amber-500 rotate-45" />
            <div className="h-[1px] bg-amber-500/50 flex-1" />
          </div>
        </div>

        {/* Certificate Content */}
        <div className="text-center space-y-4 my-auto">
          <h1 className="text-5xl font-serif text-[#002366] tracking-[0.2em] uppercase font-bold leading-none">
            M O C K E E F Y
          </h1>
          <p className="text-[10px] text-gray-550 font-sans tracking-widest uppercase leading-none mt-2">
            This verified credential is proudly conferred upon
          </p>
          <h2 className="text-4xl font-bold font-serif text-[#002366] tracking-wide mt-3">
            {userName}
          </h2>

          {/* Gold Diamond Divider (Single Diamond) */}
          <div className="w-2 h-2 bg-amber-500 rotate-45 mx-auto my-2" />

          <p className="text-[12px] font-sans text-gray-750 max-w-xl mx-auto leading-relaxed">
            {isMaster ? (
              <span>
                for successfully completing the <strong>Mockeefy Master Interview Readiness Program</strong>, comprising 3+ comprehensive mock interview simulations guided by verified industry experts.
              </span>
            ) : (
              <span>
                for successfully completing a comprehensive <strong>{category || "IT"} Mock Interview Simulation</strong> under the guidance of verified industry experts.
              </span>
            )}
          </p>

          {/* Certificate ID block */}
          <div className="flex flex-col items-center pt-2">
            <span className="text-[6px] uppercase tracking-wider text-gray-400 font-bold font-sans">Certificate ID</span>
            <span className="text-[11px] font-mono font-bold text-[#002366] border-y border-amber-500/40 py-1 px-5 mt-0.5">
              {certId}
            </span>
          </div>
        </div>

        {/* Footer containing seal, dates, signatures */}
        <div className="flex items-end justify-between px-4 pb-2">
          {/* Left Part: ASSESSING BOARD */}
          <div className="flex flex-col items-center pb-4 text-center">
            <div className="w-36 flex items-center gap-1">
              <div className="h-[1px] bg-amber-500/30 flex-1" />
              <div className="w-1 h-1 bg-amber-500 rotate-45" />
              <div className="h-[1px] bg-amber-500/30 flex-1" />
            </div>
            <span className="text-[8px] text-gray-500 font-sans font-bold uppercase tracking-wider mt-1.5">
              Assessing Board
            </span>
          </div>

          {/* Right Part: Gold Seal with trailing blue ribbons */}
          <div className="relative w-20 h-20 flex items-center justify-center z-10">
            {/* Dark Blue Ribbon Tails */}
            <div className="absolute -bottom-6 left-3 w-4.5 h-12 bg-[#002366]" style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%)" }} />
            <div className="absolute -bottom-6 right-3 w-4.5 h-12 bg-[#002366]" style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%)" }} />

            <svg className="w-20 h-20 drop-shadow-md" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="30%" stopColor="#fbbf24" />
                  <stop offset="70%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
              </defs>
              {/* Rosette base */}
              <circle cx="50" cy="50" r="45" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#b45309" strokeWidth="1" strokeDasharray="3 2" />
              <circle cx="50" cy="50" r="33" fill="#ffffff" stroke="#b45309" strokeWidth="0.5" />
              {/* Star details */}
              <text x="50" y="38" textAnchor="middle" fill="#d97706" fontSize="6">★ ★ ★</text>
              <text x="50" y="52" textAnchor="middle" fill="#002366" fontSize="7" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.2">VERIFIED</text>
              <text x="50" y="65" textAnchor="middle" fill="#d97706" fontSize="6">★ ★ ★</text>
            </svg>
          </div>
        </div>

        {/* Issued Date at the very bottom left */}
        <div className="absolute bottom-2 left-8 text-[9px] text-gray-550 font-sans">
          Issued: {issueDate}
        </div>
      </div>
    </div>
  );
};

export default function CertificatesPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isMasterSelected, setIsMasterSelected] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingMaster, setDownloadingMaster] = useState(false);

  const allCompletedAndReviewed = useMemo(() => {
    return sessions.filter(
      (s) =>
        (s.status || "").toLowerCase() === "completed" &&
        s.candidateReview &&
        s.expertReview
    );
  }, [sessions]);

  const completedSessions = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    for (const s of allCompletedAndReviewed) {
      const cat = (s.category || "General").trim().toLowerCase();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    return allCompletedAndReviewed.filter((s) => {
      const cat = (s.category || "General").trim().toLowerCase();
      return categoryCounts[cat] >= 3;
    });
  }, [allCompletedAndReviewed]);

  const categoryGroups = useMemo(() => {
    const groups: Record<string, { category: string; sessions: Session[]; latestSession: Session }> = {};
    for (const s of allCompletedAndReviewed) {
      const cat = s.category || "IT";
      const catKey = cat.trim().toLowerCase();
      if (!groups[catKey]) {
        groups[catKey] = {
          category: cat,
          sessions: [],
          latestSession: s
        };
      }
      groups[catKey].sessions.push(s);
      if (new Date(s.startTime || 0).getTime() > new Date(groups[catKey].latestSession.startTime || 0).getTime()) {
        groups[catKey].latestSession = s;
      }
    }
    return Object.values(groups);
  }, [allCompletedAndReviewed]);

  const masterCertId = useMemo(() => {
    const userId = (user as any)?.id || (user as any)?._id || "USR";
    return `MCFY-MST-${userId.slice(-6).toUpperCase()}-${new Date().getFullYear()}`;
  }, [user]);

  const handleDownloadPDF = async (sessionObj: Session) => {
    setDownloading(sessionObj.id);
    setSelectedSession(sessionObj);
    
    // Give react time to render template
    setTimeout(async () => {
      const element = document.getElementById("certificate-pdf-content");
      if (element) {
        const name = user?.name || "Candidate";
        const filename = `${name.replace(/\s+/g, "_")}_${sessionObj.category || "Interview"}_Certificate.pdf`;
        const opt = {
          margin:       0,
          filename:     filename,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        try {
          // @ts-ignore
          await html2pdf().from(element).set(opt).save();
        } catch (err) {
          console.error(err);
        }
      }
      setDownloading(null);
      setSelectedSession(null);
    }, 150);
  };

  const handleDownloadMasterPDF = async () => {
    setDownloadingMaster(true);
    setIsMasterSelected(true);
    
    setTimeout(async () => {
      const element = document.getElementById("certificate-pdf-content");
      if (element) {
        const name = user?.name || "Candidate";
        const filename = `${name.replace(/\s+/g, "_")}_Master_Interview_Certificate.pdf`;
        const opt = {
          margin:       0,
          filename:     filename,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        try {
          // @ts-ignore
          await html2pdf().from(element).set(opt).save();
        } catch (err) {
          console.error(err);
        }
      }
      setDownloadingMaster(false);
      setIsMasterSelected(false);
    }, 150);
  };

  // Pagination (same pattern as My Bookings)
  const sortedCompleted = useMemo(() => {
    const sorted = completedSessions
      .slice()
      .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());

    const seenCategories = new Set<string>();
    const uniqueByCategory: Session[] = [];

    for (const session of sorted) {
      const categoryKey = (session.category || "General").trim().toLowerCase();
      if (!seenCategories.has(categoryKey)) {
        seenCategories.add(categoryKey);
        uniqueByCategory.push(session);
      }
    }

    return uniqueByCategory;
  }, [completedSessions]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(sortedCompleted.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [sortedCompleted.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageStartIdx = (page - 1) * PAGE_SIZE;
  const pageEndIdx = Math.min(sortedCompleted.length, pageStartIdx + PAGE_SIZE);
  const pagedCertificates = sortedCompleted.slice(pageStartIdx, pageEndIdx);

  useEffect(() => {
    const fetchSessions = async () => {
      const userId = (user as any)?.id || (user as any)?._id;
      if (!userId) {
        window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
        return;
      }
      setLoading(true);
      window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: true } }));
      try {
        const res = await axios.get(`/api/sessions/candidate/${userId}`);
        const raw = Array.isArray(res.data) ? res.data : [];
        const mapped: Session[] = raw.map((s: any) => ({
          id: s._id || s.sessionId,
          sessionId: s.sessionId,
          expert: s.expertDetails?.name || s.expertId?.name || "Expert",
          profileImage: s.expertDetails?.profileImage || s.expertId?.profileImage || null,
          startTime: s.startTime,
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
        window.dispatchEvent(new CustomEvent("page-loading-state", { detail: { loading: false } }));
      }
    };

    fetchSessions();
  }, [user]);

  return (
    <div className="relative w-full bg-gradient-to-b from-[#f0f5ff]/60 via-white to-white border border-slate-200/80 rounded-[28px] p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden pb-12 font-sans text-left">
      {/* Decorative gradient glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-100/40 via-indigo-100/35 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f0f5ff]/50 to-transparent pointer-events-none" />

      <div className="w-full space-y-6 relative z-10">
        {/* Header - simple, flat title row with icon */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">My Certificates</h1>
              <p className="text-xs font-semibold text-gray-500 mt-1">Completed sessions — view verified certificates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-blue-100 bg-blue-50 text-[10px] font-black text-blue-700 uppercase tracking-wider">
              Verified
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="h-10 bg-gray-50 rounded-xl animate-pulse" />
            <div className="h-10 bg-gray-50 rounded-xl animate-pulse mt-3" />
            <div className="h-10 bg-gray-50 rounded-xl animate-pulse mt-3" />
          </div>
        ) : (
          <div className="p-6">
            {/* Category Certificate Progress Grid */}
            {categoryGroups.length === 0 ? (
              <div className="text-center p-8 flex flex-col items-center">
                <Award className="w-8 h-8 text-gray-300 mb-3 animate-pulse" />
                <h3 className="font-bold text-gray-900 text-sm">No Category Progress Yet</h3>
                <p className="text-xs text-gray-550 max-w-sm mt-1">
                  Complete at least 3 mock interviews in the same category (e.g. Java, HR, AI) to unlock its Verified Certificate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryGroups.map((group) => {
                  const count = group.sessions.length;
                  const isUnlocked = count >= 3;
                  return (
                    <div key={group.category} className="bg-gray-50/50 rounded-2xl border border-gray-200/80 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${isUnlocked ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200/50'}`}>
                            {isUnlocked ? 'Unlocked' : 'In Progress'}
                          </span>
                          <Award className={`w-5 h-5 ${isUnlocked ? 'text-blue-600' : 'text-gray-350'}`} />
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{group.category} Interview Excellence</h3>
                          <p className="text-[10px] text-gray-400 mt-0.5">Category Certification</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-500 font-bold">{count}/3 Completed</span>
                            <span className="text-gray-400">{Math.round(Math.min(100, (count / 3) * 100))}%</span>
                          </div>
                          <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden border border-gray-200/30">
                            <div 
                              className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, (count / 3) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between gap-2">
                        {isUnlocked ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelectedSession(group.latestSession)}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[10px] transition-all flex items-center gap-1"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPDF(group.latestSession)}
                              disabled={downloading === group.latestSession.id}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-all flex items-center gap-1 disabled:opacity-50"
                            >
                              <Download size={12} className={downloading === group.latestSession.id ? "animate-bounce" : ""} />
                              PDF
                            </button>
                          </>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">
                            Complete {3 - count} more sessions to unlock.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pagination footer (desktop) */}
        {!loading && sortedCompleted.length > 0 && (
          <div className="hidden md:flex items-center justify-between px-6 md:px-8 py-4 md:py-5 border-t border-gray-100 bg-white">
            <div className="text-[10px] font-bold text-gray-500">
              Showing <span className="text-gray-700 tabular-nums">{pageStartIdx + 1}</span>–<span className="text-gray-700 tabular-nums">{pageEndIdx}</span> of{" "}
              <span className="text-gray-700 tabular-nums">{sortedCompleted.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-[10px] font-black hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-all"
              >
                Prev
              </button>
              <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black text-gray-700 tabular-nums">
                Page {page} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-[10px] font-black hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Pagination footer (mobile) */}
        {!loading && sortedCompleted.length > 0 && (
          <div className="md:hidden px-4 py-4 border-t border-gray-100 bg-white flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-xs font-bold text-gray-600 tabular-nums">
              {pageStartIdx + 1}-{pageEndIdx} / {sortedCompleted.length}
            </div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

      {/* Certificate View Modal */}
      {(selectedSession || isMasterSelected) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-950 flex items-center gap-2 text-base">
                <Award className="text-blue-600" />
                {isMasterSelected ? "Master Certificate Preview" : "Verified Certificate Preview"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setIsMasterSelected(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-gray-50/50 flex flex-col items-center gap-6">
              <div className="w-full overflow-hidden border border-gray-200 rounded-2xl bg-white p-2.5 flex justify-center shadow-lg">
                <div className="w-full aspect-[1.414] bg-white border-[2px] border-[#002366] p-1 font-serif flex flex-col justify-between relative shadow-md">
                  <div className="w-full h-full p-2.5 md:p-4 border border-[#002366]/40 flex flex-col justify-between relative bg-[#fafbfc]">
                    {/* Header Ornaments */}
                    <div className="text-center mt-1 flex flex-col items-center">
                      <div className="w-6 h-6 md:w-10 md:h-10 rounded-lg overflow-hidden shadow-sm mb-1">
                        <MockeefyLogo className="w-full h-full object-contain" variant="brand" />
                      </div>
                      <div className="text-[4px] md:text-[8px] font-sans font-bold text-gray-550 tracking-[0.25em] uppercase leading-none">
                        Mockeefy Certified Assessment
                      </div>
                      
                      {/* Gold Diamond Divider */}
                      <div className="flex items-center justify-center gap-1.5 w-32 md:w-60 mx-auto mt-1 md:mt-2">
                        <div className="h-[1px] bg-amber-500/50 flex-1" />
                        <div className="w-1.5 h-1.5 bg-amber-500 rotate-45" />
                        <div className="h-[1px] bg-amber-500/50 flex-1" />
                      </div>
                    </div>

                    {/* Certificate Content */}
                    <div className="text-center my-auto py-1 md:py-2">
                      <h4 className="text-lg md:text-3xl font-serif text-[#002366] tracking-[0.2em] uppercase font-bold leading-none">
                        M O C K E E F Y
                      </h4>
                      <p className="text-[5px] md:text-[9px] font-sans text-gray-550 mt-1 md:mt-2 tracking-wide uppercase leading-none">
                        This verified credential is proudly conferred upon
                      </p>
                      <h5 className="text-xs md:text-2xl font-bold font-serif text-[#002366] mt-1.5 md:mt-3">
                        {user?.name || "Candidate"}
                      </h5>

                      {/* Gold Diamond Divider */}
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-amber-500 rotate-45 mx-auto my-1 md:my-2" />

                      <p className="text-[5px] md:text-[11px] font-sans text-gray-700 max-w-[90%] mx-auto leading-relaxed">
                        {isMasterSelected ? (
                          <span>
                            for successfully completing the <strong>Mockeefy Master Interview Readiness Program</strong>, comprising 3+ comprehensive mock interview simulations guided by verified industry experts.
                          </span>
                        ) : (
                          <span>
                            for successfully completing a comprehensive <strong>{selectedSession?.category || "IT"} Mock Interview Simulation</strong> under the guidance of verified industry experts.
                          </span>
                        )}
                      </p>

                      {/* Certificate ID block */}
                      <div className="flex flex-col items-center pt-1 md:pt-2">
                        <span className="text-[3px] md:text-[6px] uppercase tracking-wider text-gray-400 font-bold font-sans">Certificate ID</span>
                        <span className="text-[5px] md:text-[10px] font-mono font-bold text-[#002366] border-y border-amber-500/40 py-0.5 px-2 md:px-4 mt-0.5">
                          {isMasterSelected ? masterCertId : `MCFY-${selectedSession?.id.slice(-8).toUpperCase()}`}
                        </span>
                      </div>
                    </div>

                    {/* Footer containing seal, dates, signatures */}
                    <div className="flex items-end justify-between px-2 md:px-6 pb-1">
                      {/* Left Part: ASSESSING BOARD */}
                      <div className="flex flex-col items-center pb-2">
                        <div className="w-16 md:w-32 flex items-center gap-0.5 md:gap-1">
                          <div className="h-[1px] bg-amber-500/30 flex-1" />
                          <div className="w-0.5 h-0.5 md:w-1 md:h-1 bg-amber-500 rotate-45" />
                          <div className="h-[1px] bg-amber-500/30 flex-1" />
                        </div>
                        <span className="text-[4px] md:text-[7px] text-gray-550 font-sans font-bold uppercase tracking-wider mt-1 leading-none">
                          Assessing Board
                        </span>
                      </div>

                      {/* Right Part: Gold Seal */}
                      <div className="relative w-8 h-8 md:w-16 md:h-16 flex items-center justify-center z-10">
                        {/* Dark Blue Ribbon Tails */}
                        <div className="absolute -bottom-2.5 md:-bottom-5 left-1 w-1.5 md:w-3.5 h-5 md:h-10 bg-[#002366]" style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%)" }} />
                        <div className="absolute -bottom-2.5 md:-bottom-5 right-1 w-1.5 md:w-3.5 h-5 md:h-10 bg-[#002366]" style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 50% 85%, 0% 100%)" }} />
                        
                        <svg className="w-8 h-8 md:w-16 md:h-16 drop-shadow-sm" viewBox="0 0 100 100">
                          {/* Rosette base */}
                          <circle cx="50" cy="50" r="45" fill="url(#goldGrad)" stroke="#b45309" strokeWidth="1" />
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#b45309" strokeWidth="1" strokeDasharray="3 2" />
                          <circle cx="50" cy="50" r="33" fill="#ffffff" stroke="#b45309" strokeWidth="0.5" />
                          <text x="50" y="38" textAnchor="middle" fill="#d97706" fontSize="6">★ ★ ★</text>
                          <text x="50" y="52" textAnchor="middle" fill="#002366" fontSize="7" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.2">VERIFIED</text>
                          <text x="50" y="65" textAnchor="middle" fill="#d97706" fontSize="6">★ ★ ★</text>
                        </svg>
                      </div>
                    </div>

                    {/* Issued Date at the bottom left */}
                    <div className="absolute bottom-1 md:bottom-2 left-4 md:left-8 text-[4px] md:text-[9px] text-gray-550 font-sans">
                      Issued: {isMasterSelected ? new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : (selectedSession?.startTime ? new Date(selectedSession.startTime).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "—")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between bg-white">
              <button
                type="button"
                onClick={async () => {
                  const element = document.getElementById("certificate-pdf-content");
                  if (element) {
                    const name = user?.name || "Candidate";
                    const filename = `${name.replace(/\s+/g, "_")}_${isMasterSelected ? "Master" : selectedSession?.category || "Interview"}_Certificate.pdf`;
                    const opt = {
                      margin:       0,
                      filename:     filename,
                      image:        { type: 'jpeg', quality: 0.98 },
                      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
                      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
                    };
                    try {
                      // @ts-ignore
                      await html2pdf().from(element).set(opt).save();
                    } catch (err) {
                      console.error(err);
                    }
                  }
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <Download size={14} /> Download PDF Certificate
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedSession(null);
                  setIsMasterSelected(false);
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for A4 PDF generation */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div id="certificate-pdf-content">
          {selectedSession && (
            <CertificateTemplate
              userName={user?.name || "Candidate"}
              isMaster={false}
              category={selectedSession.category}
              expertName={selectedSession.expert}
              issueDate={selectedSession.startTime ? new Date(selectedSession.startTime).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
              certId={`MCFY-${selectedSession.id.slice(-8).toUpperCase()}`}
            />
          )}
          {isMasterSelected && (
            <CertificateTemplate
              userName={user?.name || "Candidate"}
              isMaster={true}
              issueDate={new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
              certId={masterCertId}
            />
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

