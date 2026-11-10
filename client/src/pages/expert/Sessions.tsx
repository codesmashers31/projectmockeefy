// src/pages/expert/Sessions.tsx - Verified build for Vercel deployment
import { useEffect, useState, useMemo, useCallback } from 'react';
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
    CalendarDays,
    Lock,
    Sparkles,
    CalendarCheck,
    SlidersHorizontal,
    ArrowUpRight,
    Wallet
} from 'lucide-react';
import {
    format,
    isToday,
    isTomorrow,
    isYesterday,
    isSameDay,
    startOfWeek,
    endOfWeek,
    addDays,
    subDays,
    differenceInMinutes
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

type StatusFilterType = 'upcoming' | 'all' | 'completed' | 'cancelled';
type DateQuickFilterType = 'all' | 'today' | 'tomorrow' | 'this_week' | 'next_week';

export default function Sessions() {
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [allSessions, setAllSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- FILTERS STATE ---
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('upcoming');
    const [dateQuickFilter, setDateQuickFilter] = useState<DateQuickFilterType>('all');
    const [customDateFilter, setCustomDateFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState("");

    // --- PAGINATION STATE ---
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10; // 10 date groups per page

    // Reset pagination to page 1 whenever any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, dateQuickFilter, customDateFilter, searchTerm]);

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

    // Expert's configured timezone (defaults to Asia/Kolkata)
    const expertTimezone = useMemo(() => {
        return (user as any)?.personalInfo?.timezone || (user as any)?.timezone || 'Asia/Kolkata';
    }, [user]);

    // Formatters bound to expert's configured timezone
    const getDateKeyInTz = useCallback((date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        try {
            return new Intl.DateTimeFormat('en-CA', {
                timeZone: expertTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(d);
        } catch {
            return format(d, 'yyyy-MM-dd');
        }
    }, [expertTimezone]);

    const formatTimeInTz = useCallback((date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: expertTimezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }).format(d);
        } catch {
            return format(d, 'hh:mm a');
        }
    }, [expertTimezone]);

    const formatDateHeadingInTz = useCallback((date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: expertTimezone,
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(d);
        } catch {
            return format(d, 'EEEE, d MMMM yyyy');
        }
    }, [expertTimezone]);

    const todayKeyInTz = useMemo(() => getDateKeyInTz(currentTime), [getDateKeyInTz, currentTime]);
    const tomorrowKeyInTz = useMemo(() => getDateKeyInTz(addDays(currentTime, 1)), [getDateKeyInTz, currentTime]);
    const yesterdayKeyInTz = useMemo(() => getDateKeyInTz(subDays(currentTime, 1)), [getDateKeyInTz, currentTime]);

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
                // Keep raw sorted by startTime ascending (chronological order)
                const seen = new Set<string>();
                const uniqueSessions: Session[] = [];
                for (const item of data) {
                    const idKey = String(item._id || item.sessionId || '');
                    if (idKey && !seen.has(idKey)) {
                        seen.add(idKey);
                        uniqueSessions.push(item);
                    } else if (!idKey) {
                        uniqueSessions.push(item);
                    }
                }
                const sorted = uniqueSessions.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
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

    // Helper: is session active right now? (terminal states cannot be active)
    const isSessionActive = (session: Session) => {
        if (!session) return false;
        const status = session.status?.toLowerCase();
        if (status === 'completed' || status === 'cancelled') {
            return false;
        }
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);
        return currentTime >= start && currentTime < end;
    };

    // Helper: is session ended?
    const isSessionEnded = (session: Session) => {
        if (!session) return false;
        const status = session.status?.toLowerCase();
        if (status === 'cancelled') return false;
        if (status === 'completed') return true;
        if (Boolean((session as any).expertReview || (session as any).review?.reviewerRole === 'expert')) return true;
        return currentTime >= new Date(session.endTime);
    };

    const isSessionReviewed = (session: Session | null | undefined): boolean => {
        if (!session) return false;
        return Boolean(
            (session as any).expertReview ||
            (session as any).review?.reviewerRole === 'expert' ||
            (session.status?.toLowerCase() === 'completed' && session.payoutCredited)
        );
    };

    const getSessionPayoutAmount = (session: Session | null | undefined): number => {
        if (!session) return 0;
        const directPayout = Number(session.payoutAmount || 0);
        if (directPayout > 0) return Math.max(1, Math.round(directPayout * 100) / 100);
        const price = Number(session.price || 0);
        if (price > 0) {
            const calculated = Math.round(price * 0.8 * 100) / 100;
            return Math.max(1, calculated);
        }
        return 1;
    };

    // --- REAL METRICS COUNTS ---
    const upcomingSessionsCount = useMemo(() => {
        return allSessions.filter(s => {
            const status = s.status?.toLowerCase();
            return status !== 'cancelled' && status !== 'completed' && currentTime < new Date(s.endTime);
        }).length;
    }, [allSessions, currentTime]);

    const completedSessionsCount = useMemo(() => {
        return allSessions.filter(s => s.status?.toLowerCase() === 'completed').length;
    }, [allSessions]);

    const todaySessionsCount = useMemo(() => {
        return allSessions.filter(s => getDateKeyInTz(s.startTime) === todayKeyInTz && s.status?.toLowerCase() !== 'cancelled').length;
    }, [allSessions]);

    const liveSessionsCount = useMemo(() => {
        return allSessions.filter(s => isSessionActive(s)).length;
    }, [allSessions, currentTime]);

    // --- FILTERED SESSIONS LIST ---
    const filteredSessions = useMemo(() => {
        return allSessions.filter(session => {
            const status = session.status?.toLowerCase() || '';
            const sessionStart = new Date(session.startTime);
            const sessionEnd = new Date(session.endTime);

            // 1. Status Filter
            if (statusFilter === 'upcoming') {
                if (status === 'cancelled' || status === 'completed' || currentTime >= sessionEnd) {
                    return false;
                }
            } else if (statusFilter === 'completed') {
                if (status !== 'completed' && !isSessionEnded(session)) return false;
            } else if (statusFilter === 'cancelled') {
                if (status !== 'cancelled') return false;
            }

            // 2. Search Term
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const matches =
                    session.candidateName?.toLowerCase().includes(term) ||
                    session.topics?.some(t => t.toLowerCase().includes(term)) ||
                    session.sessionId?.toLowerCase().includes(term) ||
                    session.candidateDetails?.email?.toLowerCase().includes(term);
                if (!matches) return false;
            }

            // 3. Custom Date Filter (if set)
            if (customDateFilter) {
                const dateKey = getDateKeyInTz(sessionStart);
                if (dateKey !== customDateFilter) return false;
            }

            // 4. Date Quick Filter
            if (dateQuickFilter === 'today') {
                if (getDateKeyInTz(sessionStart) !== todayKeyInTz) return false;
            } else if (dateQuickFilter === 'tomorrow') {
                if (getDateKeyInTz(sessionStart) !== tomorrowKeyInTz) return false;
            } else if (dateQuickFilter === 'this_week') {
                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });
                const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
                if (sessionStart < weekStart || sessionStart > weekEnd) return false;
            } else if (dateQuickFilter === 'next_week') {
                const now = new Date();
                const nextWeekStart = addDays(startOfWeek(now, { weekStartsOn: 1 }), 7);
                const nextWeekEnd = addDays(endOfWeek(now, { weekStartsOn: 1 }), 7);
                if (sessionStart < nextWeekStart || sessionStart > nextWeekEnd) return false;
            }

            return true;
        });
    }, [allSessions, statusFilter, searchTerm, customDateFilter, dateQuickFilter, currentTime]);

    // --- DATE-BASED GROUPING ---
    // Group filtered sessions chronologically by their calendar date (yyyy-MM-dd)
    const groupedDateSessions = useMemo(() => {
        const groups: { [key: string]: { dateKey: string; date: Date; sessions: Session[] } } = {};

        // Sort filtered sessions chronologically
        const sorted = [...filteredSessions].sort((a, b) => {
            const timeA = new Date(a.startTime).getTime();
            const timeB = new Date(b.startTime).getTime();
            // For completed/cancelled, show newest first; for upcoming, show soonest first
            if (statusFilter === 'completed' || statusFilter === 'cancelled') {
                return timeB - timeA;
            }
            return timeA - timeB;
        });

        sorted.forEach(session => {
            const startDate = new Date(session.startTime);
            const key = getDateKeyInTz(startDate);
            if (!groups[key]) {
                groups[key] = {
                    dateKey: key,
                    date: startDate,
                    sessions: []
                };
            }
            groups[key].sessions.push(session);
        });

        return Object.values(groups);
    }, [filteredSessions, statusFilter, getDateKeyInTz]);

    const totalPages = Math.max(1, Math.ceil(groupedDateSessions.length / pageSize));
    const paginatedDateSessions = useMemo(() => {
        const startIdx = (currentPage - 1) * pageSize;
        return groupedDateSessions.slice(startIdx, startIdx + pageSize);
    }, [groupedDateSessions, currentPage, pageSize]);

    // --- RESUME UTILITIES ---
    const getSessionResumeUrl = (session: Session, mode: 'view' | 'download' = 'view') => {
        const id = session.sessionId || session._id;
        const token = localStorage.getItem('token') || '';
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
        return `${API_BASE_URL}/api/sessions/${id}/resume?mode=${mode}${tokenParam}`;
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
            const token = localStorage.getItem('token');
            const res = await fetch(resumeUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
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

    // --- CALENDAR INTEGRATIONS ---
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
        if (!isSessionEnded(session)) {
            toast.info("Candidate evaluation unlocks after the meeting concludes.");
            return;
        }
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
        const status = session.status?.toLowerCase();
        if (status === 'completed') {
            toast.error("This session has already ended and is marked completed.");
            return;
        }
        if (status === 'cancelled') {
            toast.error("This session has been cancelled.");
            return;
        }
        const start = new Date(session.startTime);
        const end = new Date(session.endTime);

        if (currentTime < start) {
            toast.error(`Session starts at ${formatTimeInTz(start)}. Access activates at scheduled start time.`);
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
        } catch (error: any) {
            console.error("Join Error:", error);
            toast.error(error.response?.data?.message || "Failed to join session.");
        } finally {
            setLoading(false);
        }
    };

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
                const reviewData = res.data.data || payload;

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

    const handleCopySessionId = (id: string) => {
        if (!id) return;
        navigator.clipboard.writeText(id);
        setCopiedSessionId(true);
        toast.success("Session ID copied to clipboard");
        setTimeout(() => setCopiedSessionId(false), 2000);
    };

    const getStatusBadge = (status: string) => {
        const lower = (status || '').toLowerCase();
        switch (lower) {
            case 'confirmed':
                return {
                    label: 'Confirmed',
                    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/90'
                };
            case 'completed':
                return {
                    label: 'Completed',
                    classes: 'bg-slate-100 text-slate-700 border-slate-200/90'
                };
            case 'cancelled':
                return {
                    label: 'Cancelled',
                    classes: 'bg-rose-50 text-rose-700 border-rose-200/90'
                };
            default:
                return {
                    label: status || 'Scheduled',
                    classes: 'bg-blue-50 text-blue-700 border-blue-200/90'
                };
        }
    };

    const getCountdownLabel = (session: Session) => {
        const status = session.status?.toLowerCase();

        // 1. Cancelled status (highest terminal priority)
        if (status === 'cancelled') {
            return {
                text: 'Cancelled',
                badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                isLive: false
            };
        }

        // 2. Completed status (terminal priority over any time calculation)
        if (status === 'completed' || isSessionReviewed(session)) {
            const reviewed = isSessionReviewed(session);
            return {
                text: reviewed ? 'Evaluation Completed' : 'Completed • Awaiting Review',
                badgeClass: reviewed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
                isLive: false
            };
        }

        const start = new Date(session.startTime);
        const end = new Date(session.endTime);

        // 4. Live / In Progress status (Only for confirmed/live sessions within window)
        if (currentTime >= start && currentTime < end) {
            const diffMs = end.getTime() - currentTime.getTime();
            const minsLeft = Math.max(1, Math.floor(diffMs / 60000));
            return {
                text: `Live Now • ${minsLeft}m left`,
                badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
                isLive: true
            };
        }

        // 5. Upcoming / Confirmed status (Before start)
        if (currentTime < start) {
            const diffMs = start.getTime() - currentTime.getTime();
            const totalMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(totalMins / 60);
            const mins = totalMins % 60;

            if (totalMins < 60) {
                return {
                    text: `Starts in ${Math.max(1, totalMins)}m`,
                    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-bold animate-pulse',
                    isLive: false
                };
            }
            if (hours < 24) {
                return {
                    text: `Starts in ${hours}h ${mins}m`,
                    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                    isLive: false
                };
            }
            const days = Math.floor(hours / 24);
            return {
                text: `In ${days} ${days === 1 ? 'day' : 'days'}`,
                badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
                isLive: false
            };
        }

        return {
            text: 'Concluded',
            badgeClass: 'bg-slate-50 text-slate-500 border-slate-200',
            isLive: false
        };
    };

    if (isAuthLoading || (loadingSessions && allSessions.length === 0)) {
        return <ExpertPageSkeleton variant="calendar" />;
    }
    if (!user) return <div className="p-8 text-center text-slate-500 font-medium">Please log in to view sessions.</div>;

    return (
        <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-6">
                {/* ======================================================== */}
                {/* --- 1. PAGE HEADER --- */}
                {/* ======================================================== */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interview Sessions</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Manage your upcoming interviews and review your session history.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {liveSessionsCount > 0 && (
                            <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-2 shadow-2xs animate-pulse">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span>{liveSessionsCount} Live Now</span>
                            </span>
                        )}

                        <button
                            onClick={() => navigate('/dashboard/availability')}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors shadow-2xs text-xs font-semibold flex items-center gap-2 cursor-pointer"
                        >
                            <CalendarDays className="w-4 h-4 text-slate-500" />
                            <span>Set Availability</span>
                        </button>

                        <button
                            onClick={() => fetchSessions(true)}
                            disabled={loadingSessions}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors shadow-2xs text-xs font-semibold flex items-center gap-2 cursor-pointer"
                            title="Sync with server"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingSessions ? 'animate-spin' : ''}`} />
                            <span>Sync</span>
                        </button>
                    </div>
                </header>

                {/* ======================================================== */}
                {/* --- 2. COMPACT SUMMARY METRICS --- */}
                {/* ======================================================== */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {/* Upcoming Sessions */}
                    <div
                        onClick={() => { setStatusFilter('upcoming'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'upcoming'
                                ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-500/10'
                                : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <CalendarCheck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{upcomingSessionsCount}</span>
                            <span className="text-xs text-slate-500 font-medium">Interviews</span>
                        </div>
                    </div>

                    {/* Today's Agenda */}
                    <div
                        onClick={() => { setDateQuickFilter('today'); setCustomDateFilter(''); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            dateQuickFilter === 'today'
                                ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/10'
                                : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Agenda</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{todaySessionsCount}</span>
                            <span className="text-xs text-slate-500 font-medium">Scheduled today</span>
                        </div>
                    </div>

                    {/* Completed Sessions */}
                    <div
                        onClick={() => { setStatusFilter('completed'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'completed'
                                ? 'bg-white border-purple-400 shadow-md ring-2 ring-purple-500/10'
                                : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{completedSessionsCount}</span>
                            <span className="text-xs text-slate-500 font-medium">Total interviews</span>
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* --- 3. FILTER & SEARCH TOOLBAR --- */}
                {/* ======================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">
                    {/* Top Row: Status Tabs & Search */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar pb-1 md:pb-0">
                            {[
                                { id: 'upcoming', label: 'Upcoming', count: upcomingSessionsCount },
                                { id: 'all', label: 'All Sessions', count: allSessions.length },
                                { id: 'completed', label: 'Completed', count: completedSessionsCount },
                                { id: 'cancelled', label: 'Cancelled', count: allSessions.filter(s => s.status?.toLowerCase() === 'cancelled').length }
                            ].map(tab => {
                                const active = statusFilter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setStatusFilter(tab.id as StatusFilterType)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                                            active
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                                            active ? 'bg-white/20 text-white' : (tab.badgeColor || 'bg-white text-slate-700 border border-slate-200')
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[240px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search candidate, topic, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bottom Row: Quick Date Filter Jumps */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                                Date View:
                            </span>
                            {[
                                { id: 'all', label: 'All Dates' },
                                { id: 'today', label: 'Today' },
                                { id: 'tomorrow', label: 'Tomorrow' },
                                { id: 'this_week', label: 'This Week' },
                                { id: 'next_week', label: 'Next Week' }
                            ].map(item => {
                                const active = dateQuickFilter === item.id && !customDateFilter;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setDateQuickFilter(item.id as DateQuickFilterType);
                                            setCustomDateFilter('');
                                        }}
                                        className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                                            active
                                                ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                                                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Specific Date Picker / Filter reset */}
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customDateFilter}
                                onChange={(e) => {
                                    setCustomDateFilter(e.target.value);
                                    setDateQuickFilter('all');
                                }}
                                className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
                                title="Filter by exact date"
                            />
                            {(customDateFilter || dateQuickFilter !== 'all' || searchTerm) && (
                                <button
                                    onClick={() => {
                                        setCustomDateFilter('');
                                        setDateQuickFilter('all');
                                        setSearchTerm('');
                                    }}
                                    className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                                >
                                    Reset filters
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* --- 4. DATE-BASED SESSION AGENDA STREAM --- */}
                {/* ======================================================== */}
                <div className="space-y-6">
                    {groupedDateSessions.length === 0 ? (
                        /* Empty State Card */
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-2xs">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                                <CalendarDays className="w-8 h-8 text-blue-600" />
                            </div>
                            <div className="max-w-md mx-auto space-y-1.5">
                                <h3 className="text-base font-bold text-slate-900">
                                    {statusFilter === 'upcoming'
                                        ? 'No Upcoming Interviews Scheduled'
                                        : 'No Sessions Found'}
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                    New candidate bookings matching your availability will appear here in chronological order.
                                </p>
                            </div>
                            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                                <button
                                    onClick={() => navigate('/dashboard/availability')}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                                >
                                    Configure Availability Slots
                                </button>
                                {(statusFilter !== 'upcoming' || dateQuickFilter !== 'all' || searchTerm) && (
                                    <button
                                        onClick={() => {
                                            setStatusFilter('upcoming');
                                            setDateQuickFilter('all');
                                            setCustomDateFilter('');
                                            setSearchTerm('');
                                        }}
                                        className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                                    >
                                        View All Upcoming
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        paginatedDateSessions.map(({ dateKey, date, sessions }) => {
                            const isTodayDate = dateKey === todayKeyInTz;
                            const isTomorrowDate = dateKey === tomorrowKeyInTz;
                            const isYesterdayDate = dateKey === yesterdayKeyInTz;

                            // Format exact header date in expert's configured timezone
                            const formattedDate = formatDateHeadingInTz(date);

                            return (
                                <section key={dateKey} className="space-y-3">
                                    {/* Date Group Heading Banner */}
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2.5">
                                            {isTodayDate ? (
                                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                    TODAY
                                                </span>
                                            ) : isTomorrowDate ? (
                                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                                                    TOMORROW
                                                </span>
                                            ) : isYesterdayDate ? (
                                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 border border-slate-300">
                                                    YESTERDAY
                                                </span>
                                            ) : null}

                                            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                                <span>{formattedDate}</span>
                                            </h2>
                                        </div>

                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
                                            {sessions.length} {sessions.length === 1 ? 'Interview' : 'Interviews'}
                                        </span>
                                    </div>

                                    {/* Session Cards Grid / Vertical Stack */}
                                    <div className="space-y-3">
                                        {sessions.map(session => {
                                            const start = new Date(session.startTime);
                                            const end = new Date(session.endTime);
                                            const durationMinutes = Math.max(1, differenceInMinutes(end, start));
                                            const statusBadge = getStatusBadge(session.status);
                                            const countdown = getCountdownLabel(session);
                                            const payout = getSessionPayoutAmount(session);
                                            const activeNow = isSessionActive(session);
                                            const ended = isSessionEnded(session);
                                            const reviewed = isSessionReviewed(session);

                                            // Exact start & end time strings (never rounded, exact source of truth)
                                            const timeString = `${formatTimeInTz(start)} – ${formatTimeInTz(end)}`;

                                            return (
                                                <div
                                                    key={session.sessionId || session._id}
                                                    className={`group relative bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 shadow-xs hover:shadow-md ${
                                                        activeNow
                                                            ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                                                            : 'border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                        {/* Left: Time Block + Candidate Information */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-0">
                                                            {/* Exact Time Column with Tabular Numerals */}
                                                            <div className="flex flex-col justify-center sm:min-w-[190px] pr-2 sm:border-r sm:border-slate-100">
                                                                <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-slate-900 tracking-tight font-mono tabular-nums">
                                                                    <Clock className={`w-4 h-4 shrink-0 ${activeNow ? 'text-emerald-600 animate-pulse' : 'text-blue-600'}`} />
                                                                    <span>{timeString}</span>
                                                                </div>

                                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                    <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                                                        {durationMinutes} mins
                                                                    </span>

                                                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${countdown.badgeClass}`}>
                                                                        {countdown.text}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Candidate Identity & Topics */}
                                                            <div className="flex items-start gap-3 min-w-0">
                                                                {/* Avatar */}
                                                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200 shadow-2xs">
                                                                    {(session.candidateName || "CA").slice(0, 2).toUpperCase()}
                                                                </div>

                                                                {/* Details */}
                                                                <div className="min-w-0 space-y-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h4
                                                                            onClick={() => setSelectedCandidateProfile(session)}
                                                                            className="font-bold text-slate-900 text-sm sm:text-base hover:text-blue-600 cursor-pointer truncate transition-colors"
                                                                        >
                                                                            {session.candidateName || "Candidate"}
                                                                        </h4>

                                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.classes}`}>
                                                                            {statusBadge.label}
                                                                        </span>

                                                                        {payout > 0 && (
                                                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                                                <Wallet className="w-3 h-3 text-emerald-600" />
                                                                                ₹{payout} Payout
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Candidate Email / Identifier */}
                                                                    <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                                                                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                                                        <span className="truncate">{session.candidateDetails?.email || session.candidateId}</span>
                                                                        <span className="text-slate-300">•</span>
                                                                        <span className="font-mono text-[10px] text-slate-400">ID: {session.sessionId || session._id}</span>
                                                                    </p>

                                                                    {/* Topic Badges */}
                                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                        {(session.topics?.length ? session.topics : ['1:1 Technical Interview']).map((t, idx) => (
                                                                            <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                                                                {t}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right: Actions Container */}
                                                        <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                                            {session.status?.toLowerCase() === 'cancelled' ? (
                                                                <span className="text-xs text-rose-600 font-bold px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200">
                                                                    Cancelled
                                                                </span>
                                                            ) : session.status?.toLowerCase() === 'completed' || ended ? (
                                                                /* Action: Concluded Session / Evaluation (Prioritized over Live) */
                                                                reviewed ? (
                                                                    <button
                                                                        onClick={() => setSelectedSessionModal(session)}
                                                                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                        <span>Evaluation Completed</span>
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => openReviewModal(session)}
                                                                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors animate-pulse"
                                                                    >
                                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                                        <span>Review Candidate</span>
                                                                    </button>
                                                                )
                                                            ) : activeNow ? (
                                                                /* Action: Live Meeting Room Join (Only for active non-completed sessions) */
                                                                <button
                                                                    onClick={() => handleJoin(session)}
                                                                    disabled={loading}
                                                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all animate-pulse"
                                                                >
                                                                    <Video className="w-4 h-4" />
                                                                    <span>Join Live Meeting</span>
                                                                </button>
                                                            ) : !ended ? (
                                                                /* Action: Upcoming Confirmed Meeting */
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleJoin(session)}
                                                                        className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                                                                        title={`Access activates at scheduled start time (${formatTimeInTz(start)})`}
                                                                    >
                                                                        <Video className="w-3.5 h-3.5 text-slate-400" />
                                                                        <span>Join ({formatTimeInTz(start)})</span>
                                                                    </button>

                                                                    {/* Quick Google Calendar Link */}
                                                                    <a
                                                                        href={generateGoogleCalendarUrl(session)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-blue-600 shadow-2xs transition-colors"
                                                                        title="Add to Google Calendar"
                                                                    >
                                                                        <CalendarIcon className="w-3.5 h-3.5" />
                                                                    </a>

                                                                    <button
                                                                        onClick={() => downloadIcsFile(session)}
                                                                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
                                                                        title="Download .ics Calendar Invite"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : null}

                                                            {/* Secondary Action: View Candidate Resume */}
                                                            <button
                                                                onClick={() => handleViewResume(session)}
                                                                className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                                                title="Open candidate resume"
                                                            >
                                                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                                <span className="hidden sm:inline">Resume</span>
                                                            </button>

                                                            {/* Secondary Action: Session Details Modal */}
                                                            <button
                                                                onClick={() => setSelectedSessionModal(session)}
                                                                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                                            >
                                                                <span>Details</span>
                                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })
                    )}

                    {/* Agenda Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 pt-5 px-2">
                            <p className="text-xs text-slate-500 font-medium">
                                Showing page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({groupedDateSessions.length} active {groupedDateSessions.length === 1 ? 'date' : 'dates'})
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                                >
                                    Previous
                                </button>
                                <span className="text-xs font-bold text-slate-700 px-2">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* --- 5. SESSION DETAILS MODAL --- */}
            {/* ======================================================== */}
            {selectedSessionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setSelectedSessionModal(null)}
                    ></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    <span>Session Briefing & Details</span>
                                </h3>
                                <p className="text-xs text-slate-500">Comprehensive session timeline and briefing</p>
                            </div>
                            <button
                                onClick={() => setSelectedSessionModal(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 overflow-y-auto thin-scrollbar">
                            {/* Session Quick Status Row */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled Time</span>
                                    <p className="text-sm font-bold text-slate-900 font-mono">
                                        {formatDateHeadingInTz(new Date(selectedSessionModal.startTime))}
                                    </p>
                                    <p className="text-xs font-semibold text-blue-600 font-mono">
                                        {formatTimeInTz(new Date(selectedSessionModal.startTime))} – {formatTimeInTz(new Date(selectedSessionModal.endTime))}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${getStatusBadge(selectedSessionModal.status).classes}`}>
                                        {getStatusBadge(selectedSessionModal.status).label}
                                    </span>
                                </div>
                            </div>

                            {/* Calendar Sync Options */}
                            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-900 leading-tight">Sync With Your Calendar</p>
                                    <p className="text-[11px] text-slate-500">Export invite to stay reminded on your calendar app</p>
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
                                        <span>.ics</span>
                                    </button>
                                </div>
                            </div>

                            {/* Hero Action: Join Room or Evaluation */}
                            <div>
                                {selectedSessionModal.status?.toLowerCase() === 'completed' || isSessionEnded(selectedSessionModal) ? (
                                    isSessionReviewed(selectedSessionModal) ? (
                                        <div className="w-full py-3 px-4 rounded-xl font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <span>Evaluation Completed</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openReviewModal(selectedSessionModal)}
                                            className="w-full py-3 px-4 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-md transition-all animate-pulse"
                                        >
                                            <Star className="w-4 h-4 fill-current" />
                                            <span>Review Candidate</span>
                                        </button>
                                    )
                                ) : selectedSessionModal.status?.toLowerCase() === 'cancelled' ? (
                                    <div className="w-full py-3 px-4 rounded-xl font-bold text-rose-700 bg-rose-50 border border-rose-200 text-xs flex items-center justify-center gap-2">
                                        <span>Session Cancelled</span>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleJoin(selectedSessionModal)}
                                            disabled={!isSessionActive(selectedSessionModal) || loading}
                                            className={`w-full py-3 px-4 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-2 shadow-sm ${
                                                isSessionActive(selectedSessionModal)
                                                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-md'
                                                    : 'bg-slate-300 cursor-not-allowed text-slate-500'
                                            }`}
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                            {loading ? 'Joining Room...' : isSessionActive(selectedSessionModal) ? 'Join Live Meeting Room' : 'Join Meeting (Opens at Scheduled Time)'}
                                        </button>
                                        {!isSessionActive(selectedSessionModal) && (
                                            <p className="text-center text-[11px] text-slate-400 mt-1.5">
                                                Access opens at scheduled start time ({formatTimeInTz(new Date(selectedSessionModal.startTime))}).
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Candidate Briefing Card */}
                            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                        <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                                        Candidate Dossier & Resume
                                    </h4>
                                    <button
                                        onClick={() => setSelectedCandidateProfile(selectedSessionModal)}
                                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <span>Full Profile</span>
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

                                    {/* Focus Topics */}
                                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Focus:</span>
                                        {(selectedSessionModal.topics?.length ? selectedSessionModal.topics : ['1:1 Technical Interview']).map((t, idx) => (
                                            <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Evaluation Status Banner */}
                            {Boolean((selectedSessionModal as any).expertReview || (selectedSessionModal as any).review?.reviewerRole === 'expert') ? (
                                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 leading-tight">
                                                    Interview Evaluation Completed
                                                </h4>
                                                <p className="text-[11px] text-emerald-700">Review submitted & wallet payout released</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openReviewModal(selectedSessionModal)}
                                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                                        >
                                            Edit Evaluation
                                        </button>
                                    </div>
                                </div>
                            ) : isSessionEnded(selectedSessionModal) ? (
                                <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 leading-tight">
                                                    Evaluation Required
                                                </h4>
                                                <p className="text-[11px] text-rose-700">Submit rubric evaluation to release your payout</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-800 border border-rose-300">
                                            Action Needed
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openReviewModal(selectedSessionModal)}
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <Star className="w-3.5 h-3.5 fill-current" />
                                        <span>Write Evaluation & Rubric Marks</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                                        <Lock className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Evaluation Rubric Locked</h4>
                                        <p className="text-[11px] text-slate-500">Unlocks automatically once this meeting concludes.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
                            <SecondaryButton onClick={() => setSelectedSessionModal(null)}>Close</SecondaryButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* --- 6. CANDIDATE PROFILE MODAL --- */}
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
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
                                className="px-3.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
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
            {/* --- 7. STRUCTURED INTERVIEW EVALUATION RUBRIC MODAL --- */}
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
                                            {formatDateHeadingInTz(new Date(reviewSession.startTime))} • {formatTimeInTz(new Date(reviewSession.startTime))} - {formatTimeInTz(new Date(reviewSession.endTime))}
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
                                Payout credited to your wallet upon submit
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
