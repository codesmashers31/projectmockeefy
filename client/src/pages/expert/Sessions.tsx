// src/pages/expert/Sessions.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Video,
    Clock,
    AlertCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Star,
    Timer as TimerIcon,
    Loader2,
    LayoutDashboard,
    User as UserIcon,
    RefreshCw,
    Copy,
    Check,
    Calendar as CalendarIcon,
    CheckCircle2,
    Briefcase,
    GraduationCap,
    MapPin,
    Mail,
    Phone,
    Award,
    Download,
    ExternalLink,
    FileText,
    CalendarDays
} from 'lucide-react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    isToday
} from 'date-fns';
import { useAuth } from "../../context/AuthContext";
import { useDataSync } from "../../context/SocketContext";
import axios from '../../lib/axios';
import { API_BASE_URL } from '../../config';
import { toast } from "sonner";
import { PrimaryButton, SecondaryButton } from '../ExpertDashboard';
import ExpertPageSkeleton from "../../components/ExpertPageSkeleton";

interface CandidateDetails {
    email: string;
    phone?: string;
    location?: string;
    education: any[];
    experience: any[];
    skills: string[];
    profileImage?: string;
    resumeUrl?: string | null;
    resumeName?: string;
    resumeData?: any;
}

interface Session {
    _id: string;
    sessionId: string;
    startTime: string;
    endTime: string;
    status: string;
    topics: string[];
    candidateName: string;
    candidateId: string;
    expertId: string;
    price?: number;
    payoutCredited?: boolean;
    payoutCreditedAt?: string | null;
    payoutAmount?: number;
    candidateDetails?: CandidateDetails;
    expertReview?: any;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export default function Sessions() {
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- CALENDAR & NAVIGATION STATE ---
    const [calendarMode, setCalendarMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [miniCalendarMonth, setMiniCalendarMonth] = useState<Date>(new Date());

    // --- FILTERS STATE ---
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // --- ACTIVE & MODAL STATE ---
    const [selectedSessionModal, setSelectedSessionModal] = useState<Session | null>(null);
    const [selectedCandidateProfile, setSelectedCandidateProfile] = useState<Session | null>(null);
    const [reviewSession, setReviewSession] = useState<Session | null>(null);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [copiedSessionId, setCopiedSessionId] = useState(false);

    // Review Form State
    const [reviewForm, setReviewForm] = useState({
        overallRating: 5,
        technicalRating: 5,
        communicationRating: 5,
        problemSolvingRating: 5,
        designRating: 5,
        behavioralRating: 5,
        hiringDecision: 'Hire' as 'Strong Hire' | 'Hire' | 'Lean Hire' | 'No Hire',
        feedback: "",
        strengths: "",
        weaknesses: "",
        suggestions: ""
    });

    const currentUserId = user?.id || user?.userId || user?._id || "";

    // Timer Effect
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Sessions Logic
    const fetchSessions = async (showLoading = true) => {
        if (isAuthLoading) return;
        if (!currentUserId) {
            if (showLoading) setLoadingSessions(false);
            return;
        }
        if (showLoading) setLoadingSessions(true);
        try {
            const res = await axios.get(`/api/sessions/user/${currentUserId}/role/expert`);
            const data = res.data;
            if (Array.isArray(data)) {
                const sorted = data.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
                setAllSessions(sorted);
                setSelectedSessionModal(prev => {
                    if (!prev) return null;
                    const matched = sorted.find((s: Session) => (prev.sessionId && s.sessionId === prev.sessionId) || (prev._id && s._id === prev._id));
                    return matched ? { ...prev, ...matched } : prev;
                });
            } else {
                setAllSessions([]);
            }
        } catch (err) {
            console.error("Failed to fetch sessions", err);
            toast.error("Could not load sessions");
        } finally {
            if (showLoading) setLoadingSessions(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [currentUserId, isAuthLoading]);

    // Real-time synchronization across logins
    useDataSync(['SESSION_CREATED', 'SESSION_UPDATED', 'RECONNECTED'], () => {
        console.log('[ExpertSessions] Real-time session sync event received');
        fetchSessions(false);
    });

    // --- FILTERED SESSIONS ---
    const filteredSessions = useMemo(() => {
        return allSessions.filter(session => {
            const matchesSearch =
                session.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                session.topics?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
                session.sessionId?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || session.status.toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });
    }, [allSessions, searchTerm, statusFilter]);

    // --- SESSIONS METRICS ---
    const isSessionActive = (session: Session) => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        return currentTime >= start && currentTime < end;
    };

    const isSessionEnded = (session: Session) => {
        return currentTime > new Date(session.endTime);
    };

    const liveSessionsCount = allSessions.filter((s) => isSessionActive(s)).length;
    const upcomingSessionsCount = allSessions.filter((s) => currentTime < new Date(s.startTime)).length;
    const completedSessionsCount = allSessions.filter((s) => s.status.toLowerCase() === 'completed').length;

    // --- RESUME UTILITIES ---
    const getSessionResumeUrl = (session: Session, mode: 'view' | 'download' = 'view') => {
        const id = session.sessionId || session._id;
        return `${API_BASE_URL}/api/sessions/${id}/resume?mode=${mode}`;
    };

    const handleViewResume = (session: Session) => {
        const resumeUrl = getSessionResumeUrl(session, 'view');
        window.open(resumeUrl, '_blank', 'noopener,noreferrer');
    };

    const handleDownloadResume = async (session: Session) => {
        const candidate = session.candidateDetails;
        const candidateName = session.candidateName || 'Candidate';
        const fileName = candidate?.resumeName || `${candidateName.replace(/\s+/g, '_')}_Resume.pdf`;
        const resumeUrl = getSessionResumeUrl(session, 'download');

        try {
            toast.loading(`Preparing ${fileName}...`, { id: 'download-resume' });
            const res = await fetch(resumeUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
                // If candidate only has structured data, open printable resume in new tab
                window.open(getSessionResumeUrl(session, 'view'), '_blank', 'noopener,noreferrer');
                toast.info("Opened printable resume. Click 'Print / Save as PDF' to save.", { id: 'download-resume' });
                return;
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            toast.success(`Downloaded ${fileName}`, { id: 'download-resume' });
        } catch (err) {
            console.error("Direct download failed, falling back to direct browser navigation:", err);
            const a = document.createElement('a');
            a.href = resumeUrl;
            a.download = fileName;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.dismiss('download-resume');
        }
    };

    // --- CALENDAR INTEGRATIONS (Google Calendar & .ics) ---
    const generateGoogleCalendarUrl = (session: Session) => {
        try {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            const formatUTC = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const title = `Mockeefy: ${session.candidateName || 'Candidate'} Mock Interview`;
            const focus = session.topics?.length ? session.topics.join(', ') : 'Technical Mock Interview';
            const details = [
                `Mockeefy 1:1 Expert Mock Interview`,
                `Candidate: ${session.candidateName || 'Candidate'}`,
                `Track/Topics: ${focus}`,
                `Session ID: ${session.sessionId || session._id}`,
                `Mockeefy Dashboard: ${window.location.origin}/expert/sessions`
            ].join('\n');
            const location = 'Mockeefy Virtual Meeting Room';

            return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatUTC(start)}/${formatUTC(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
        } catch (e) {
            console.error("Google Calendar URL generation error:", e);
            return '#';
        }
    };

    const downloadIcsFile = (session: Session) => {
        try {
            const start = new Date(session.startTime);
            const end = new Date(session.endTime);
            const formatUTC = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const uid = `mockeefy-${session.sessionId || session._id}@mockeefy.com`;
            const now = formatUTC(new Date());
            const title = `Mockeefy: ${session.candidateName || 'Candidate'} Mock Interview`;
            const focus = session.topics?.length ? session.topics.join(', ') : 'Technical Mock Interview';
            const description = `Mockeefy 1:1 Expert Mock Interview with ${session.candidateName || 'Candidate'}\\nTrack/Topics: ${focus}\\nSession ID: ${session.sessionId || session._id}`;
            const location = 'Mockeefy Virtual Meeting Room';

            const icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Mockeefy//Expert Session Calendar//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${now}`,
                `DTSTART:${formatUTC(start)}`,
                `DTEND:${formatUTC(end)}`,
                `SUMMARY:${title}`,
                `DESCRIPTION:${description}`,
                `LOCATION:${location}`,
                'STATUS:CONFIRMED',
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Mockeefy_${(session.candidateName || 'Interview').replace(/\s+/g, '_')}_${format(start, 'yyyyMMdd')}.ics`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Calendar invite (.ics) downloaded!");
        } catch (e) {
            console.error("ICS download error:", e);
            toast.error("Could not export calendar invite");
        }
    };

    const openReviewModal = (session: Session) => {
        const rev = session.expertReview;
        setReviewForm({
            overallRating: rev?.overallRating || 5,
            technicalRating: rev?.technicalRating || 5,
            communicationRating: rev?.communicationRating || 5,
            problemSolvingRating: rev?.problemSolvingRating || 5,
            designRating: rev?.designRating || 5,
            behavioralRating: rev?.behavioralRating || 5,
            hiringDecision: rev?.hiringDecision || 'Hire',
            feedback: rev?.feedback || '',
            strengths: Array.isArray(rev?.strengths) ? rev.strengths.join(', ') : (rev?.strengths || ''),
            weaknesses: Array.isArray(rev?.weaknesses) ? rev.weaknesses.join(', ') : (rev?.weaknesses || ''),
            suggestions: rev?.suggestions || ''
        });
        setReviewSession(session);
    };
    const handleJoin = async (session: Session) => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);

        if (currentTime < start) {
            toast.error(`Session starts at ${format(start, 'HH:mm')}. Access activates at scheduled start time.`);
            return;
        }
        if (currentTime >= end) {
            toast.error("This session has already ended.");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`/api/sessions/${session.sessionId}/join`, { userId: currentUserId });
            const data = res.data;

            if (res.status === 200 && data.permitted) {
                navigate(`/live-meeting?meetingId=${data.meetingId}`, {
                    state: {
                        role: 'expert',
                        meetingId: data.meetingId
                    }
                });
            } else {
                toast.error(data.message || "Cannot join session at this time.");
            }
        } catch (error) {
            console.error("Join Error:", error);
            toast.error("Failed to join session.");
        } finally {
            setLoading(false);
        }
    };

    // --- SUBMIT REVIEW ---
    const handleSubmitReview = async () => {
        if (!reviewSession) return;
        setSubmittingReview(true);
        try {
            const payload = {
                overallRating: reviewForm.overallRating,
                technicalRating: reviewForm.technicalRating,
                communicationRating: reviewForm.communicationRating,
                problemSolvingRating: reviewForm.problemSolvingRating,
                designRating: reviewForm.designRating,
                behavioralRating: reviewForm.behavioralRating,
                hiringDecision: reviewForm.hiringDecision,
                recommendation: reviewForm.hiringDecision,
                feedback: reviewForm.feedback,
                suggestions: reviewForm.suggestions,
                strengths: reviewForm.strengths.split(',').map(s => s.trim()).filter(Boolean),
                weaknesses: reviewForm.weaknesses.split(',').map(s => s.trim()).filter(Boolean),
                expertId: currentUserId,
                candidateId: reviewSession.candidateId,
                reviewerRole: 'expert'
            };

            const res = await axios.post(`/api/sessions/${reviewSession.sessionId}/review`, payload);

            if (res.data.success) {
                toast.success("Interview Evaluation & Rubric submitted!");
                const walletCredit = res.data.walletCredit;
                if (walletCredit?.credited) {
                    toast.success(`₹${walletCredit.amount} credited to your wallet.`);
                }
                setReviewSession(null);

                const targetSessionId = reviewSession.sessionId;
                const targetId = reviewSession._id;
                const serverSession = res.data.session;
                const isCredited = serverSession?.payoutCredited !== undefined
                    ? Boolean(serverSession.payoutCredited)
                    : Boolean(walletCredit?.credited || true);
                const creditedAmount = Number(
                    serverSession?.payoutAmount ??
                    walletCredit?.amount ??
                    reviewSession.payoutAmount ??
                    reviewSession.price ??
                    0
                );
                const reviewData = res.data.data || {
                    overallRating: payload.overallRating,
                    technicalRating: payload.technicalRating,
                    communicationRating: payload.communicationRating,
                    problemSolvingRating: payload.problemSolvingRating,
                    designRating: payload.designRating,
                    behavioralRating: payload.behavioralRating,
                    hiringDecision: payload.hiringDecision,
                    recommendation: payload.recommendation,
                    feedback: payload.feedback,
                    suggestions: payload.suggestions,
                    strengths: payload.strengths,
                    weaknesses: payload.weaknesses
                };

                // Immediately update local allSessions & active modal
                setAllSessions(prev => prev.map(s => {
                    if ((targetSessionId && s.sessionId === targetSessionId) || (targetId && s._id === targetId)) {
                        return {
                            ...s,
                            status: 'completed',
                            payoutCredited: isCredited,
                            payoutAmount: creditedAmount,
                            payoutCreditedAt: serverSession?.payoutCreditedAt || new Date().toISOString(),
                            expertReview: reviewData
                        };
                    }
                    return s;
                }));

                setSelectedSessionModal(prev => {
                    if (!prev) return null;
                    if ((targetSessionId && prev.sessionId === targetSessionId) || (targetId && prev._id === targetId)) {
                        return {
                            ...prev,
                            status: 'completed',
                            payoutCredited: isCredited,
                            payoutAmount: creditedAmount,
                            payoutCreditedAt: serverSession?.payoutCreditedAt || new Date().toISOString(),
                            expertReview: reviewData
                        };
                    }
                    return prev;
                });

                fetchSessions(false);
            }
        } catch (error: any) {
            console.error("Review Error:", error);
            toast.error(error.response?.data?.message || "Failed to submit review");
        } finally {
            setSubmittingReview(false);
        }
    };

    // Copy Session ID
    const handleCopySessionId = (id: string) => {
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedSessionId(true);
        toast.success("Session ID copied to clipboard");
        setTimeout(() => setCopiedSessionId(false), 2000);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'completed': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getTimerDisplay = (session: Session) => {
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);

        if (currentTime < start) {
            const diff = start.getTime() - currentTime.getTime();
            const totalSeconds = Math.max(0, Math.floor(diff / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (hours > 0) {
                return {
                    text: `Starts in ${hours}h ${minutes.toString().padStart(2, '0')}m`,
                    detailed: `Starts in ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                    color: 'text-blue-700 bg-blue-50 border-blue-200'
                };
            }
            return {
                text: `Starts in ${minutes}m ${seconds.toString().padStart(2, '0')}s`,
                detailed: `Starts in ${minutes}:${seconds.toString().padStart(2, '0')}`,
                color: 'text-amber-700 bg-amber-50 border-amber-200'
            };
        }

        if (currentTime >= start && currentTime < end) {
            const diff = end.getTime() - currentTime.getTime();
            const totalSeconds = Math.max(0, Math.floor(diff / 1000));
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return {
                text: `Live • ${minutes}m left`,
                detailed: `Ends in ${minutes}:${seconds.toString().padStart(2, '0')}`,
                color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
            };
        }

        return { text: 'Concluded', detailed: 'Session Ended', color: 'text-slate-600 bg-slate-100 border-slate-200' };
    };

    // --- MINI CALENDAR DAYS ---
    const miniCalendarDays = useMemo(() => {
        const monthStart = startOfMonth(miniCalendarMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start like reference
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [miniCalendarMonth]);

    // --- WEEKLY VIEW DAYS ---
    const weekDays = useMemo(() => {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }, [selectedDate]);

    // Sessions for current selected date
    const selectedDateSessions = useMemo(() => {
        return filteredSessions.filter(s => isSameDay(new Date(s.startTime), selectedDate));
    }, [filteredSessions, selectedDate]);

    // Sessions for a specific day
    const getSessionsForDate = (date: Date) => {
        return filteredSessions.filter(s => isSameDay(new Date(s.startTime), date));
    };

    if (isAuthLoading || (loadingSessions && allSessions.length === 0)) {
        return <ExpertPageSkeleton variant="calendar" />;
    }
    if (!user) return <div className="p-8 text-center text-slate-500 font-medium">Please log in to view sessions.</div>;

    return (
        <div className="h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-7.5rem)] flex flex-col min-h-0 overflow-hidden font-sans">
            {/* Top Page Header (Reference Style) */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interview Schedule</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Manage your calendar, join live video calls, review candidate resumes, and evaluate sessions.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchSessions(true)}
                        disabled={loadingSessions}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 transition-colors shadow-2xs text-xs font-semibold flex items-center gap-1.5"
                        title="Sync with server"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
                        <span>Sync</span>
                    </button>
                    {liveSessionsCount > 0 && (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{liveSessionsCount} Live Session</span>
                        </span>
                    )}
                </div>
            </header>

            {/* Main Single-Page Calendar Layout (AIRecruit360 reference) */}
            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
                {/* ======================================================== */}
                {/* --- LEFT SIDEBAR: MINI CALENDAR & EVENT FILTERS --- */}
                {/* ======================================================== */}
                <aside className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col gap-3.5 overflow-y-auto thin-scrollbar">
                    {/* Top All Calendar Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                                    <CalendarDays className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 leading-tight">All Calendar</h2>
                                    <p className="text-[11px] text-slate-500">Candidate Sessions</p>
                                </div>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                {allSessions.length}
                            </span>
                        </div>

                        {/* Mini Month Calendar */}
                        <div className="border-t border-slate-100 pt-3 space-y-2.5">
                            {/* Mini Calendar Header */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900">
                                    {format(miniCalendarMonth, 'MMMM yyyy')}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setMiniCalendarMonth(prev => subMonths(prev, 1))}
                                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                                        title="Previous month"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMiniCalendarMonth(new Date());
                                            setSelectedDate(new Date());
                                        }}
                                        className="text-[10px] font-bold text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={() => setMiniCalendarMonth(prev => addMonths(prev, 1))}
                                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                                        title="Next month"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Mini Weekday Headers */}
                            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                                <span>M</span>
                                <span>T</span>
                                <span>W</span>
                                <span>T</span>
                                <span>F</span>
                                <span>S</span>
                                <span>S</span>
                            </div>

                            {/* Mini Days Grid */}
                            <div className="grid grid-cols-7 text-center gap-y-1 text-xs">
                                {miniCalendarDays.map((day, idx) => {
                                    const isCurrentMonth = isSameMonth(day, miniCalendarMonth);
                                    const isSelected = isSameDay(day, selectedDate);
                                    const hasSessions = allSessions.some(s => isSameDay(new Date(s.startTime), day));
                                    const isTodayDay = isToday(day);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedDate(day);
                                                if (!isCurrentMonth) {
                                                    setMiniCalendarMonth(startOfMonth(day));
                                                }
                                            }}
                                            className={`h-7 w-7 mx-auto flex flex-col items-center justify-center rounded-full text-xs font-medium transition-all relative cursor-pointer ${isSelected
                                                ? 'bg-blue-600 text-white font-bold shadow-2xs scale-105'
                                                : isTodayDay
                                                    ? 'text-blue-600 font-bold border border-blue-300'
                                                    : isCurrentMonth
                                                        ? 'text-slate-700 hover:bg-slate-100'
                                                        : 'text-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <span>{format(day, 'd')}</span>
                                            {hasSessions && !isSelected && (
                                                <span className="w-1 h-1 rounded-full bg-blue-600 absolute bottom-0.5"></span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Event Type & Status Filter Card (Reference Style) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Event Status</h3>
                            <span className="text-[10px] text-slate-400">Click to filter</span>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search candidate..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Status Filter List */}
                        <div className="space-y-1.5 pt-1">
                            {[
                                { id: 'all', label: 'All Sessions', count: allSessions.length, color: 'bg-blue-600' },
                                { id: 'confirmed', label: 'Confirmed / Upcoming', count: upcomingSessionsCount, color: 'bg-emerald-500' },
                                { id: 'completed', label: 'Completed (Reviewed)', count: completedSessionsCount, color: 'bg-slate-400' },
                                { id: 'cancelled', label: 'Cancelled', count: allSessions.filter(s => s.status.toLowerCase() === 'cancelled').length, color: 'bg-rose-500' }
                            ].map(item => {
                                const isSelected = statusFilter === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setStatusFilter(item.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${isSelected
                                            ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                                            : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                                            <span>{item.label}</span>
                                        </div>
                                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                            {item.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* ======================================================== */}
                {/* --- MAIN CALENDAR CANVAS (AIRecruit360 reference) --- */}
                {/* ======================================================== */}
                <main className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
                    {/* Calendar Control Header Bar */}
                    <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
                        {/* Month Navigation & Selected Date Heading */}
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-900 min-w-[150px]">
                                {calendarMode === 'daily'
                                    ? format(selectedDate, 'MMMM d, yyyy')
                                    : format(selectedDate, 'MMMM yyyy')}
                            </h2>
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                                <button
                                    onClick={() => {
                                        if (calendarMode === 'daily') setSelectedDate(prev => subDays(prev, 1));
                                        else if (calendarMode === 'weekly') setSelectedDate(prev => subWeeks(prev, 1));
                                        else setSelectedDate(prev => subMonths(prev, 1));
                                    }}
                                    className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                                    title="Previous"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setSelectedDate(new Date())}
                                    className="px-2.5 py-1 text-xs font-semibold hover:bg-white rounded-lg text-slate-700 transition-colors"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => {
                                        if (calendarMode === 'daily') setSelectedDate(prev => addDays(prev, 1));
                                        else if (calendarMode === 'weekly') setSelectedDate(prev => addWeeks(prev, 1));
                                        else setSelectedDate(prev => addMonths(prev, 1));
                                    }}
                                    className="p-1 rounded-lg hover:bg-white text-slate-600 transition-colors"
                                    title="Next"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* View Switchers (Daily / Weekly / Monthly) like reference */}
                        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex items-center text-xs font-semibold shadow-2xs">
                            <button
                                onClick={() => setCalendarMode('daily')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${calendarMode === 'daily'
                                    ? 'bg-white text-blue-600 font-bold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Daily
                            </button>
                            <button
                                onClick={() => setCalendarMode('weekly')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${calendarMode === 'weekly'
                                    ? 'bg-white text-blue-600 font-bold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setCalendarMode('monthly')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${calendarMode === 'monthly'
                                    ? 'bg-white text-blue-600 font-bold shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>

                    {/* ==================== 1. WEEKLY VIEW (AIRecruit360 reference) ==================== */}
                    {calendarMode === 'weekly' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Weekday Column Headers */}
                            <div className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/70 text-xs font-semibold shrink-0">
                                <div className="p-2.5 border-r border-slate-200 text-slate-400 text-center font-mono">
                                    Time
                                </div>
                                {weekDays.map((day, idx) => {
                                    const isCurrentDay = isSameDay(day, selectedDate);
                                    const isTodayDate = isToday(day);
                                    const daySessionsCount = getSessionsForDate(day).length;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedDate(day)}
                                            className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 transition-colors cursor-pointer ${isCurrentDay
                                                ? 'bg-blue-50/60 font-bold text-blue-700'
                                                : 'hover:bg-slate-100/70 text-slate-700'
                                                }`}
                                        >
                                            <div className="text-[11px] text-slate-500 uppercase">{format(day, 'EEE')}</div>
                                            <div className="flex items-center justify-center gap-1 mt-0.5">
                                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${isTodayDate ? 'bg-blue-600 text-white font-bold' : ''
                                                    }`}>
                                                    {format(day, 'd')}
                                                </span>
                                                {daySessionsCount > 0 && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Weekly Time Grid Matrix */}
                            <div className="flex-1 overflow-y-auto thin-scrollbar min-h-0">
                                {HOURS.map(hour => {
                                    return (
                                        <div key={hour} className="grid grid-cols-[70px_repeat(7,1fr)] border-b border-slate-100 min-h-[85px]">
                                            {/* Hour label */}
                                            <div className="p-2 border-r border-slate-100 text-[11px] font-mono text-slate-400 text-center shrink-0">
                                                {hour < 10 ? `0${hour}.00` : `${hour}.00`} {hour < 12 ? 'am' : 'pm'}
                                            </div>

                                            {/* 7 Columns for the week */}
                                            {weekDays.map((day, dayIdx) => {
                                                const daySessions = getSessionsForDate(day);
                                                // Find sessions matching this hour
                                                const matchingSessions = daySessions.filter(s => {
                                                    const sHour = new Date(s.startTime).getHours();
                                                    return sHour === hour;
                                                });

                                                const isCurrentDay = isSameDay(day, selectedDate);

                                                return (
                                                    <div
                                                        key={dayIdx}
                                                        onClick={() => setSelectedDate(day)}
                                                        className={`p-1.5 border-r border-slate-100 last:border-r-0 relative transition-colors ${isCurrentDay ? 'bg-blue-50/15' : ''
                                                            }`}
                                                    >
                                                        {matchingSessions.map(session => {
                                                            const isLive = isSessionActive(session);
                                                            const isCompleted = session.status.toLowerCase() === 'completed';

                                                            return (
                                                                <div
                                                                    key={session._id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedSessionModal(session);
                                                                    }}
                                                                    className={`rounded-xl p-2.5 mb-1.5 transition-all shadow-xs cursor-pointer border ${isLive
                                                                        ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-500/20'
                                                                        : isCompleted
                                                                            ? 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                                                                            : 'bg-white text-slate-900 border-blue-200 hover:border-blue-400 hover:shadow-sm'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${isLive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                                                                            }`}>
                                                                            {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                                                                        </span>
                                                                        {isLive && (
                                                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                                                        )}
                                                                    </div>

                                                                    <h4 className={`text-xs font-bold truncate leading-tight ${isLive ? 'text-white' : 'text-slate-900'
                                                                        }`}>
                                                                        {session.candidateName}
                                                                    </h4>
                                                                    <p className={`text-[10px] truncate mt-0.5 ${isLive ? 'text-blue-100' : 'text-slate-500'
                                                                        }`}>
                                                                        {session.topics?.[0] || '1:1 Mock Interview'}
                                                                    </p>

                                                                    {/* Quick Action Badges */}
                                                                    <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-200/40">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleViewResume(session);
                                                                            }}
                                                                            className={`text-[10px] font-semibold underline flex items-center gap-0.5 ${isLive ? 'text-white hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
                                                                                }`}
                                                                            title="View Resume in New Tab"
                                                                        >
                                                                            <FileText className="w-2.5 h-2.5" />
                                                                            <span>Resume</span>
                                                                        </button>
                                                                        {isCompleted && !(session as any).expertReview && (
                                                                            <span className="text-[10px] text-amber-600 font-bold ml-auto flex items-center gap-0.5">
                                                                                <Star className="w-2.5 h-2.5 fill-amber-500" />
                                                                                Review
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ==================== 2. DAILY VIEW ==================== */}
                    {calendarMode === 'daily' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto thin-scrollbar p-5 space-y-4">
                            {/* Day Header Banner */}
                            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Daily Schedule</span>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {selectedDateSessions.length} {selectedDateSessions.length === 1 ? 'interview session scheduled' : 'interview sessions scheduled'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedDate(new Date())}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
                                    >
                                        Jump to Today
                                    </button>
                                </div>
                            </div>

                            {/* Sessions for selected day */}
                            {selectedDateSessions.length > 0 ? (
                                <div className="space-y-3.5">
                                    {selectedDateSessions.map(session => {
                                        const isLive = isSessionActive(session);
                                        const isCompleted = session.status.toLowerCase() === 'completed';
                                        const isEnded = isSessionEnded(session);

                                        return (
                                            <div
                                                key={session._id}
                                                className={`rounded-2xl border p-5 transition-all shadow-xs ${isLive
                                                    ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20'
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                                    }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                    {/* Candidate & Metadata */}
                                                    <div className="flex items-start gap-3.5">
                                                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center shrink-0 border border-blue-200">
                                                            {session.candidateName?.[0] || 'C'}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-900 text-base">{session.candidateName}</h4>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold capitalize ${getStatusColor(session.status)}`}>
                                                                    {session.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                                <span>{session.candidateDetails?.email || session.candidateId}</span>
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                                                <span className="flex items-center gap-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                                    {format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${getTimerDisplay(session).color}`}>
                                                                    {getTimerDisplay(session).text}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions: View Resume, Download Resume, Review, Join */}
                                                    <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                                                        {isLive ? (
                                                            <button
                                                                onClick={() => handleJoin(session)}
                                                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                                                            >
                                                                <Video className="w-4 h-4" />
                                                                <span>Join Live Meeting</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setSelectedSessionModal(session)}
                                                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                                                            >
                                                                <span>Session Details</span>
                                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                            </button>
                                                        )}

                                                        {/* Candidate Resume & Calendar Sync Actions */}
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => handleViewResume(session)}
                                                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 shadow-2xs cursor-pointer"
                                                                title="Open candidate resume in new tab"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                                                <span>Resume</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadResume(session)}
                                                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                                                                title="Download Resume"
                                                            >
                                                                <Download className="w-3.5 h-3.5 text-slate-600" />
                                                            </button>

                                                            {/* 1-Click Google Calendar */}
                                                            <a
                                                                href={generateGoogleCalendarUrl(session)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 transition-colors shadow-2xs"
                                                                title="Add to Google Calendar"
                                                            >
                                                                <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                                                            </a>

                                                            {/* Download .ics */}
                                                            <button
                                                                onClick={() => downloadIcsFile(session)}
                                                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                                                                title="Download iCal (.ics) Event"
                                                            >
                                                                <CalendarDays className="w-3.5 h-3.5 text-slate-600" />
                                                            </button>
                                                        </div>

                                                        {/* Post-Session Review for completed sessions */}
                                                        {isCompleted && (
                                                            (session as any).expertReview ? (
                                                                <button
                                                                    onClick={() => openReviewModal(session)}
                                                                    className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                                                                    title="Click to view/edit evaluation"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>Reviewed {(session as any).expertReview.hiringDecision ? `(${(session as any).expertReview.hiringDecision})` : ''}</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => openReviewModal(session)}
                                                                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                                                >
                                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                                    <span>Write Review & Marks</span>
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                                    <CalendarIcon className="w-12 h-12 text-slate-300 stroke-1" />
                                    <p className="text-sm font-semibold text-slate-600">No interview sessions scheduled for {format(selectedDate, 'MMMM d, yyyy')}</p>
                                    <p className="text-xs text-slate-400 max-w-sm">
                                        Select a date with a session marker from the mini calendar on the left or switch to Weekly view.
                                    </p>
                                    <button
                                        onClick={() => setCalendarMode('weekly')}
                                        className="mt-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs hover:bg-blue-100"
                                    >
                                        View Full Weekly Calendar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== 3. MONTHLY VIEW ==================== */}
                    {calendarMode === 'monthly' && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600 py-2 shrink-0">
                                <span>Mon</span>
                                <span>Tue</span>
                                <span>Wed</span>
                                <span>Thu</span>
                                <span>Fri</span>
                                <span>Sat</span>
                                <span>Sun</span>
                            </div>

                            {/* Month Matrix */}
                            <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto thin-scrollbar min-h-0 bg-slate-200 gap-px">
                                {miniCalendarDays.map((day, idx) => {
                                    const daySessions = getSessionsForDate(day);
                                    const isCurrentMonthDay = isSameMonth(day, miniCalendarMonth);
                                    const isSelected = isSameDay(day, selectedDate);
                                    const isTodayDate = isToday(day);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setSelectedDate(day);
                                                if (daySessions.length > 0) {
                                                    setCalendarMode('daily');
                                                }
                                            }}
                                            className={`bg-white p-2 min-h-[85px] flex flex-col justify-between transition-colors cursor-pointer ${!isCurrentMonthDay ? 'bg-slate-50/70 text-slate-400' : 'text-slate-800'
                                                } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/20' : 'hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-blue-600 text-white font-bold' : ''
                                                    }`}>
                                                    {format(day, 'd')}
                                                </span>
                                                {daySessions.length > 0 && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md">
                                                        {daySessions.length}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1 mt-1 overflow-y-auto max-h-[60px] no-scrollbar">
                                                {daySessions.slice(0, 2).map(session => (
                                                    <div
                                                        key={session._id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedSessionModal(session);
                                                        }}
                                                        className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100 truncate font-semibold hover:bg-blue-100"
                                                    >
                                                        {format(new Date(session.startTime), 'HH:mm')} • {session.candidateName}
                                                    </div>
                                                ))}
                                                {daySessions.length > 2 && (
                                                    <span className="text-[10px] text-slate-400 block text-center">
                                                        +{daySessions.length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ======================================================== */}
            {/* --- SESSION DETAILS MODAL / DRAWER --- */}
            {/* ======================================================== */}
            {selectedSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setSelectedSessionModal(null)}
                    ></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interview Session</span>
                                <h3 className="font-bold text-slate-900 text-lg">{selectedSessionModal.candidateName}</h3>
                            </div>
                            <button
                                onClick={() => setSelectedSessionModal(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 overflow-y-auto thin-scrollbar">
                            {/* Badges & Payout */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    {(selectedSessionModal.topics?.length ? selectedSessionModal.topics : ['1:1 Mock Interview']).map((topic, i) => (
                                        <span key={i} className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2.5 py-0.5 rounded-md border font-bold capitalize ${getStatusColor(selectedSessionModal.status)}`}>
                                        {selectedSessionModal.status}
                                    </span>
                                    {selectedSessionModal.status?.toLowerCase() === 'completed' && (
                                        selectedSessionModal.payoutCredited ? (
                                            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                                                Wallet credited: ₹{Number(selectedSessionModal.payoutAmount ?? selectedSessionModal.price ?? 0)}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold border border-amber-200 bg-amber-50 text-amber-700">
                                                Wallet credit pending
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Schedule & Info Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Date & Time</p>
                                    <p className="font-semibold text-slate-900">
                                        {format(new Date(selectedSessionModal.startTime), 'EEE, d MMM yyyy')}
                                    </p>
                                    <p className="text-slate-600 mt-0.5">
                                        {format(new Date(selectedSessionModal.startTime), 'HH:mm')} - {format(new Date(selectedSessionModal.endTime), 'HH:mm')}
                                    </p>
                                </div>

                                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Session ID</p>
                                    <div className="flex items-center justify-between font-mono text-slate-800">
                                        <span className="truncate max-w-[150px]">{selectedSessionModal.sessionId}</span>
                                        <button
                                            onClick={() => handleCopySessionId(selectedSessionModal.sessionId)}
                                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
                                            title="Copy"
                                        >
                                            {copiedSessionId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <p className={`mt-1 font-semibold ${getTimerDisplay(selectedSessionModal).color} px-1.5 py-0.5 rounded text-[11px] inline-block`}>
                                        {getTimerDisplay(selectedSessionModal).detailed}
                                    </p>
                                </div>
                            </div>

                            {/* Calendar Sync Card (Phase 2) */}
                            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/70 flex flex-wrap items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                                        <CalendarIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900 leading-tight">Calendar Sync</p>
                                        <p className="text-[11px] text-slate-500">Add to your work calendar so you stay on schedule</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={generateGoogleCalendarUrl(selectedSessionModal)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Google Calendar</span>
                                    </a>
                                    <button
                                        onClick={() => downloadIcsFile(selectedSessionModal)}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                    >
                                        <Download className="w-3.5 h-3.5 text-slate-600" />
                                        <span>Download .ics</span>
                                    </button>
                                </div>
                            </div>

                            {/* Meeting Hero Action */}
                            <div className="pt-1">
                                <button
                                    onClick={() => handleJoin(selectedSessionModal)}
                                    disabled={!isSessionActive(selectedSessionModal) || loading}
                                    className={`w-full py-3 px-4 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-2 shadow-sm ${isSessionActive(selectedSessionModal)
                                        ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-md'
                                        : 'bg-slate-300 cursor-not-allowed text-slate-500'
                                        }`}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                    {loading ? 'Joining Room...' : isSessionActive(selectedSessionModal) ? 'Join Live Meeting Room' : 'Join Meeting (Opens at Scheduled Time)'}
                                </button>
                                {!isSessionActive(selectedSessionModal) && (
                                    <p className="text-center text-[11px] text-slate-400 mt-1.5">
                                        Meeting access activates automatically at scheduled start time ({format(new Date(selectedSessionModal.startTime), 'HH:mm')}).
                                    </p>
                                )}
                            </div>

                            {/* Candidate Dossier & Resume Card (Phase 2 Briefing) */}
                            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                                        Candidate Briefing & Dossier
                                    </h4>
                                    <button
                                        onClick={() => {
                                            setSelectedCandidateProfile(selectedSessionModal);
                                        }}
                                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <span>Full Dossier</span>
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-3 shadow-2xs">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                                                {(selectedSessionModal.candidateName || "CA").slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-xs truncate">{selectedSessionModal.candidateName}</p>
                                                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span>{selectedSessionModal.candidateDetails?.email || selectedSessionModal.candidateId}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleViewResume(selectedSessionModal)}
                                                className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                                                title="Open candidate resume in new tab"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span>View Resume</span>
                                            </button>
                                            <button
                                                onClick={() => handleDownloadResume(selectedSessionModal)}
                                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs cursor-pointer"
                                                title="Download Resume PDF"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Skills & Focus Pills */}
                                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Focus:</span>
                                        {(selectedSessionModal.topics?.length ? selectedSessionModal.topics : ['1:1 Technical Interview']).map((t, idx) => (
                                            <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                                {t}
                                            </span>
                                        ))}
                                        {selectedSessionModal.candidateDetails?.skills && selectedSessionModal.candidateDetails.skills.slice(0, 3).map((skill, idx) => (
                                            <span key={`sk-${idx}`} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Structured Evaluation Rubric & Feedback Section */}
                            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                        Interview Evaluation & Rubric
                                    </h4>
                                    {(selectedSessionModal as any).expertReview && (
                                        <button
                                            onClick={() => openReviewModal(selectedSessionModal)}
                                            className="text-xs font-semibold text-blue-600 hover:underline"
                                        >
                                            Edit Evaluation
                                        </button>
                                    )}
                                </div>

                                {(selectedSessionModal as any).expertReview ? (
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                                        {/* Decision Header */}
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold uppercase text-slate-500">Recommendation:</span>
                                                {(() => {
                                                    const dec = (selectedSessionModal as any).expertReview.hiringDecision || 'Hire';
                                                    if (dec === 'Strong Hire') {
                                                        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">🟢 Strong Hire</span>;
                                                    } else if (dec === 'Hire') {
                                                        return <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300">🔵 Hire</span>;
                                                    } else if (dec === 'Lean Hire') {
                                                        return <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">🟡 Lean Hire</span>;
                                                    } else {
                                                        return <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">🔴 No Hire</span>;
                                                    }
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                                                <Star className="w-4 h-4 fill-current" />
                                                <span>{(selectedSessionModal as any).expertReview.overallRating || 5}/5 Overall</span>
                                            </div>
                                        </div>

                                        {/* Rubric Breakdown Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                                                <span className="text-slate-400 block text-[10px]">Technical / DSA</span>
                                                <span className="font-bold text-slate-800">{(selectedSessionModal as any).expertReview.technicalRating || '-'}/5</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                                                <span className="text-slate-400 block text-[10px]">System Design</span>
                                                <span className="font-bold text-slate-800">{(selectedSessionModal as any).expertReview.designRating || '-'}/5</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                                                <span className="text-slate-400 block text-[10px]">Problem Solving</span>
                                                <span className="font-bold text-slate-800">{(selectedSessionModal as any).expertReview.problemSolvingRating || '-'}/5</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                                                <span className="text-slate-400 block text-[10px]">Communication</span>
                                                <span className="font-bold text-slate-800">{(selectedSessionModal as any).expertReview.communicationRating || '-'}/5</span>
                                            </div>
                                            <div className="p-2 rounded-lg bg-white border border-slate-200">
                                                <span className="text-slate-400 block text-[10px]">Behavioral / Fit</span>
                                                <span className="font-bold text-slate-800">{(selectedSessionModal as any).expertReview.behavioralRating || '-'}/5</span>
                                            </div>
                                        </div>

                                        {/* Written Feedback Preview */}
                                        {(selectedSessionModal as any).expertReview.feedback && (
                                            <p className="text-slate-600 text-xs italic bg-white p-2.5 rounded-lg border border-slate-200">
                                                "{(selectedSessionModal as any).expertReview.feedback}"
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (isSessionEnded(selectedSessionModal)) {
                                                openReviewModal(selectedSessionModal);
                                            } else {
                                                toast.error("Evaluation unlocks after the session concludes.");
                                            }
                                        }}
                                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${isSessionEnded(selectedSessionModal)
                                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-2xs cursor-pointer'
                                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isSessionEnded(selectedSessionModal) ? 'Write Evaluation & Rubric Marks' : 'Locked Until Session Concludes'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
                            <SecondaryButton onClick={() => setSelectedSessionModal(null)}>Close</SecondaryButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* --- CANDIDATE PROFILE MODAL --- */}
            {/* ======================================================== */}
            {selectedCandidateProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                        onClick={() => setSelectedCandidateProfile(null)}
                    ></div>
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
                        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {selectedCandidateProfile.candidateName || "Candidate Profile"}
                                </h3>
                                <p className="text-xs text-slate-500">Applicant Details & Qualifications</p>
                            </div>
                            <button
                                onClick={() => setSelectedCandidateProfile(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto thin-scrollbar">
                            <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold shrink-0 border border-blue-200">
                                    {(selectedCandidateProfile.candidateName || "CA").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h4 className="font-bold text-sm text-slate-900">Personal Information</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-slate-700 font-medium truncate">
                                                {selectedCandidateProfile.candidateDetails?.email || "Not provided"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-slate-700 font-medium">
                                                {selectedCandidateProfile.candidateDetails?.phone || "Not provided"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-slate-700 font-medium">
                                                {selectedCandidateProfile.candidateDetails?.location || "Not specified"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Skills Section */}
                            <div className="space-y-2.5">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Award className="w-3.5 h-3.5 text-blue-600" />
                                    Skills & Expertise
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {(selectedCandidateProfile.candidateDetails?.skills && selectedCandidateProfile.candidateDetails.skills.length > 0) ? (
                                        selectedCandidateProfile.candidateDetails.skills.map((skill, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md border border-blue-100">
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No skills listed</span>
                                    )}
                                </div>
                            </div>

                            {/* Work Experience */}
                            <div className="space-y-2.5">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                                    Work Experience
                                </h4>
                                <div className="space-y-2.5">
                                    {(selectedCandidateProfile.candidateDetails?.experience && selectedCandidateProfile.candidateDetails.experience.length > 0) ? (
                                        selectedCandidateProfile.candidateDetails.experience.map((exp, i) => (
                                            <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                                                <h5 className="font-bold text-slate-900">{exp.position}</h5>
                                                <p className="text-slate-600 font-medium">{exp.company}</p>
                                                <p className="text-slate-400 text-[11px] mt-0.5">
                                                    {new Date(exp.startDate).getFullYear()} - {exp.current ? 'Present' : (exp.endDate ? new Date(exp.endDate).getFullYear() : '')}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No work experience listed</p>
                                    )}
                                </div>
                            </div>

                            {/* Education */}
                            <div className="space-y-2.5">
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                                    Education
                                </h4>
                                <div className="space-y-2.5">
                                    {(selectedCandidateProfile.candidateDetails?.education && selectedCandidateProfile.candidateDetails.education.length > 0) ? (
                                        selectedCandidateProfile.candidateDetails.education.map((edu, i) => (
                                            <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                                                <h5 className="font-bold text-slate-900">{edu.degree || edu.institution}</h5>
                                                <p className="text-slate-600">{edu.field || edu.institution}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No education details listed</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <button
                                onClick={() => handleViewResume(selectedCandidateProfile)}
                                className="px-3.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View Candidate Resume</span>
                            </button>
                            <SecondaryButton onClick={() => setSelectedCandidateProfile(null)}>Close</SecondaryButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* --- STRUCTURED INTERVIEW EVALUATION RUBRIC MODAL --- */}
            {/* ======================================================== */}
            {reviewSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setReviewSession(null)}
                    ></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    <span>Interview Evaluation Rubric</span>
                                </h3>
                                <p className="text-xs text-slate-500">Structured candidate assessment & hiring recommendation</p>
                            </div>
                            <button
                                onClick={() => setReviewSession(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 overflow-y-auto thin-scrollbar">
                            {/* Candidate Summary Card */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
                                        {(reviewSession.candidateName || "C").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-sm truncate">{reviewSession.candidateName}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {format(new Date(reviewSession.startTime), 'EEE, d MMM yyyy')} • {format(new Date(reviewSession.startTime), 'HH:mm')} - {format(new Date(reviewSession.endTime), 'HH:mm')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {(reviewSession.topics?.length ? reviewSession.topics : ['Technical Interview']).slice(0, 2).map((top, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold">
                                            {top}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* 1. HIRING RECOMMENDATION SELECTOR */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    1. Final Hiring Recommendation <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {[
                                        { id: 'Strong Hire', label: 'Strong Hire', icon: '🟢', desc: 'Exceeds bar', activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20' },
                                        { id: 'Hire', label: 'Hire', icon: '🔵', desc: 'Meets requirements', activeClass: 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20' },
                                        { id: 'Lean Hire', label: 'Lean Hire', icon: '🟡', desc: 'Borderline / Potential', activeClass: 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20' },
                                        { id: 'No Hire', label: 'No Hire', icon: '🔴', desc: 'Below bar', activeClass: 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20' }
                                    ].map(item => {
                                        const isSelected = reviewForm.hiringDecision === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setReviewForm(prev => ({ ...prev, hiringDecision: item.id as any }))}
                                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                                                    ? item.activeClass
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                                                    <span>{item.icon}</span>
                                                    <span>{item.label}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500">{item.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 2. STRUCTURED COMPETENCY RUBRIC */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        2. Core Competencies Rubric (1 - 5)
                                    </label>
                                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                        Rubric Avg: {(
                                            (reviewForm.technicalRating + reviewForm.problemSolvingRating + reviewForm.designRating + reviewForm.communicationRating + reviewForm.behavioralRating) / 5
                                        ).toFixed(1)} / 5.0
                                    </span>
                                </div>

                                <div className="space-y-2.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                                    {[
                                        { key: 'technicalRating', label: 'Technical & DSA Core', desc: 'Algorithm correctness, data structure choices, code efficiency' },
                                        { key: 'problemSolvingRating', label: 'Problem Solving & Logic', desc: 'Edge cases, breakdown of complex problems, trade-off reasoning' },
                                        { key: 'designRating', label: 'System Design & Architecture', desc: 'Scalability, modularity, API clarity, distributed concepts' },
                                        { key: 'communicationRating', label: 'Communication & Articulation', desc: 'Clarity of thought, active listening, explanation quality' },
                                        { key: 'behavioralRating', label: 'Behavioral & Culture Fit', desc: 'Receptiveness to hints, collaboration, engineering attitude' }
                                    ].map(crit => {
                                        const currentVal = (reviewForm as any)[crit.key] || 1;
                                        return (
                                            <div key={crit.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200/80">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{crit.label}</p>
                                                    <p className="text-[10px] text-slate-400">{crit.desc}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {[1, 2, 3, 4, 5].map(score => (
                                                        <button
                                                            key={score}
                                                            type="button"
                                                            onClick={() => setReviewForm(prev => ({ ...prev, [crit.key]: score }))}
                                                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentVal === score
                                                                ? 'bg-blue-600 text-white shadow-2xs scale-105'
                                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                                                }`}
                                                        >
                                                            {score}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 3. OVERALL PERFORMANCE STARS */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                    3. Overall Rating
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setReviewForm(prev => ({ ...prev, overallRating: star }))}
                                                className={`transition-transform hover:scale-110 cursor-pointer ${star <= reviewForm.overallRating ? 'text-amber-400' : 'text-slate-200'}`}
                                            >
                                                <Star className="w-6 h-6 fill-current" />
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">
                                        {reviewForm.overallRating} of 5 Stars
                                    </span>
                                </div>
                            </div>

                            {/* 4. KEY STRENGTHS */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        4. Candidate Strengths
                                    </label>
                                    <span className="text-[10px] text-slate-400">Comma separated or click suggestions</span>
                                </div>
                                <input
                                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="e.g. Strong DSA fundamentals, clean code, thoughtful communication"
                                    value={reviewForm.strengths}
                                    onChange={e => setReviewForm(prev => ({ ...prev, strengths: e.target.value }))}
                                />
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {['Optimal DSA Solutions', 'Clean Modular Code', 'Crisp Communication', 'Solid Design Intuition', 'Fast Debugging'].map((tag, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                const current = reviewForm.strengths ? reviewForm.strengths.split(',').map(s => s.trim()) : [];
                                                if (!current.includes(tag)) {
                                                    setReviewForm(prev => ({
                                                        ...prev,
                                                        strengths: current.concat(tag).join(', ')
                                                    }));
                                                }
                                            }}
                                            className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold border border-emerald-200 transition-colors cursor-pointer"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 5. AREAS FOR IMPROVEMENT */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                                        5. Areas for Improvement
                                    </label>
                                    <span className="text-[10px] text-slate-400">Comma separated or click suggestions</span>
                                </div>
                                <input
                                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="e.g. Edge case verification, time complexity analysis"
                                    value={reviewForm.weaknesses}
                                    onChange={e => setReviewForm(prev => ({ ...prev, weaknesses: e.target.value }))}
                                />
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {['Edge Cases Handling', 'Time Complexity Analysis', 'Database Schema Scaling', 'Clarifying Assumptions Early'].map((tag, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                const current = reviewForm.weaknesses ? reviewForm.weaknesses.split(',').map(s => s.trim()) : [];
                                                if (!current.includes(tag)) {
                                                    setReviewForm(prev => ({
                                                        ...prev,
                                                        weaknesses: current.concat(tag).join(', ')
                                                    }));
                                                }
                                            }}
                                            className="px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-semibold border border-amber-200 transition-colors cursor-pointer"
                                        >
                                            + {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 6. DETAILED FEEDBACK & SUGGESTIONS */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                        6. Written Evaluation & Feedback
                                    </label>
                                    <textarea
                                        className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[90px]"
                                        placeholder="Detailed qualitative feedback on coding structure, approach, and interview execution..."
                                        value={reviewForm.feedback}
                                        onChange={e => setReviewForm(prev => ({ ...prev, feedback: e.target.value }))}
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                                        7. Actionable Next Steps / Practice Recommendations
                                    </label>
                                    <textarea
                                        className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[75px]"
                                        placeholder="Specific topics, algorithms, or resources for the candidate to review..."
                                        value={reviewForm.suggestions}
                                        onChange={e => setReviewForm(prev => ({ ...prev, suggestions: e.target.value }))}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 sticky bottom-0">
                            <span className="text-xs text-slate-500">
                                Payout of 80% credited to your wallet upon submit
                            </span>
                            <div className="flex items-center gap-2">
                                <SecondaryButton onClick={() => setReviewSession(null)}>Cancel</SecondaryButton>
                                <PrimaryButton
                                    onClick={handleSubmitReview}
                                    disabled={submittingReview}
                                    loading={submittingReview}
                                >
                                    Submit Rubric & Complete
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
