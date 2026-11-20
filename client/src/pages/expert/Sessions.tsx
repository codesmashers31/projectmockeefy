// src/pages/expert/Sessions.tsx - Verified build for Vercel deployment

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

import { useNavigate, useSearchParams, useParams } from 'react-router-dom';

import CardFloatingWave from '../../components/CardFloatingWave';

import {

    Video,

    Clock,

    AlertCircle,

    AlertTriangle,

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

    Wallet,

    PhoneOff,

    UserX

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

import { formatScoreDisplay, formatDisplayName } from '../../lib/utils';

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

    actualEndTime?: string | null;

    earlyEnded?: boolean;

    candidateJoinedAt?: string | null;

    attendanceStatus?: string;

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

    const [backendTotalPages, setBackendTotalPages] = useState(1);

    const [backendTotalItems, setBackendTotalItems] = useState(0);

    const pageSize = 10; // 10 date groups per page

    const abortControllerRef = useRef<AbortController | null>(null);

    const [searchParams] = useSearchParams();

    const params = useParams<{ sessionId?: string }>();

    const hasHandledActionRef = useRef<string | null>(null);



    // Reset pagination to page 1 whenever any filter changes

    useEffect(() => {

        setCurrentPage(1);

    }, [statusFilter, dateQuickFilter, customDateFilter, searchTerm]);



    // Auto-open modal when navigated with sessionId and/or action (e.g. from Dashboard Dossier or Scorecard)

    useEffect(() => {

        const action = searchParams.get('action');

        const sid = searchParams.get('sessionId') || params.sessionId;

        const actionKey = `${sid}-${action || 'view'}`;

        if (sid && allSessions.length > 0 && hasHandledActionRef.current !== actionKey) {

            const target = allSessions.find(s => s.sessionId === sid || s._id === sid);

            if (target) {

                hasHandledActionRef.current = actionKey;

                if (action === 'dossier' || action === 'profile' || action === 'candidate') {

                    setSelectedCandidateProfile(target);

                } else if (action === 'feedback' || action === 'scorecard' || action === 'review') {

                    if (isSessionEnded(target)) {

                        openReviewModal(target);

                    } else {

                        setSelectedSessionModal(target);

                    }

                } else {

                    setSelectedSessionModal(target);

                }

            }

        }

    }, [allSessions, searchParams, params.sessionId]);



    // --- ACTIVE & MODAL STATE ---

    const [selectedSessionModal, setSelectedSessionModal] = useState<Session | null>(null);

    const [selectedCandidateProfile, setSelectedCandidateProfile] = useState<Session | null>(null);

    const [reviewSession, setReviewSession] = useState<Session | null>(null);

    const handleCloseCandidateProfile = () => {
        setSelectedCandidateProfile(null);
        if (searchParams.get('sessionId') || searchParams.get('action') || params.sessionId) {
            navigate('/dashboard/sessions', { replace: true });
        }
    };

    const handleCloseSessionModal = () => {
        setSelectedSessionModal(null);
        if (searchParams.get('sessionId') || searchParams.get('action') || params.sessionId) {
            navigate('/dashboard/sessions', { replace: true });
        }
    };

    const handleCloseReviewModal = () => {
        setReviewSession(null);
        if (searchParams.get('sessionId') || searchParams.get('action') || params.sessionId) {
            navigate('/dashboard/sessions', { replace: true });
        }
    };

    const [noShowModalSession, setNoShowModalSession] = useState<Session | null>(null);

    const [noShowReason, setNoShowReason] = useState('');

    const [submittingNoShow, setSubmittingNoShow] = useState(false);

    const [endSessionModalSession, setEndSessionModalSession] = useState<Session | null>(null);

    const [endingSession, setEndingSession] = useState(false);

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

        // Abort any ongoing request to avoid race conditions

        if (abortControllerRef.current) {

            abortControllerRef.current.abort();

        }

        const controller = new AbortController();

        abortControllerRef.current = controller;

        const signal = controller.signal;



        if (isAuthLoading) return;

        if (!currentUserId) {

            if (showLoading) setLoadingSessions(false);

            return;

        }

        if (showLoading) setLoadingSessions(true);

        try {

            // Build query parameters based on filters and pagination

            const params = new URLSearchParams();

            params.append('page', String(currentPage));

            params.append('limit', String(pageSize));

            if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

            if (dateQuickFilter && dateQuickFilter !== 'all') params.append('dateFilter', dateQuickFilter);

            if (customDateFilter) params.append('customDate', customDateFilter);

            if (searchTerm) params.append('search', searchTerm);



            const res = await axios.get(`/api/sessions/user/${currentUserId}/role/expert?${params.toString()}`, { signal });

            const data = res.data;

            // Expect server to return { sessions, totalPages, totalItems } or array fallback

            const sessionList: Session[] = Array.isArray(data.sessions) ? data.sessions : (Array.isArray(data) ? data : []);

            // Update pagination metadata if provided

            if (typeof data.totalPages === 'number') setBackendTotalPages(data.totalPages);

            if (typeof data.totalItems === 'number') setBackendTotalItems(data.totalItems);



            const seen = new Set<string>();

            const uniqueSessions: Session[] = [];

            for (const item of sessionList) {

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

        } catch (err: any) {

            if (axios.isCancel(err) || err?.name === 'CanceledError' || err?.name === 'AbortError') {

                console.log('Fetch sessions request cancelled');

            } else {

                console.error('Failed to fetch sessions', err);

                toast.error('Could not load sessions');

            }

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



    // Helper: is session marked as no-show?

    const isSessionNoShow = (session: Session | null | undefined): boolean => {

        if (!session) return false;

        const st = (session.status || '').toLowerCase();

        return st === 'no-show' || st === 'candidate_no_show' || st === 'no_show';

    };



    const noShowGraceMinutes = 15;



    const canMarkNoShow = (session: Session | null | undefined): boolean => {

        if (!session) return false;

        const st = (session.status || '').toLowerCase();

        if (st !== 'confirmed' && st !== 'upcoming') return false;

        if ((session as any).candidateJoinedAt || (session as any).attendanceStatus === 'attended') return false;

        const startTime = new Date(session.startTime).getTime();

        const endTime = new Date(session.endTime).getTime();

        const graceEnd = startTime + noShowGraceMinutes * 60 * 1000;

        return currentTime.getTime() >= graceEnd && currentTime.getTime() < endTime;

    };



    const handleConfirmNoShow = async () => {

        if (!noShowModalSession) return;

        setSubmittingNoShow(true);

        try {

            const res = await axios.post(`/api/sessions/${noShowModalSession.sessionId}/no-show`, {

                reason: noShowReason.trim() || undefined

            });

            if (res.data?.success) {

                toast.success("Candidate marked as absent.");

                const updated = res.data.data;

                setAllSessions(prev => prev.map(s => (s.sessionId === updated.sessionId ? { ...s, ...updated } : s)));

                if (selectedSessionModal?.sessionId === updated.sessionId) {

                    setSelectedSessionModal(prev => prev ? { ...prev, ...updated } : prev);

                }

                setNoShowModalSession(null);

                setNoShowReason('');

            } else {

                toast.error(res.data?.message || "Failed to mark no-show");

            }

        } catch (err: any) {

            console.error("Mark no-show error:", err);

            toast.error(err.response?.data?.message || "Could not mark candidate as no-show");

        } finally {

            setSubmittingNoShow(false);

        }

    };



    const handleConfirmEndSession = async () => {

        if (!endSessionModalSession) return;

        setEndingSession(true);

        try {

            const res = await axios.post(`/api/sessions/${endSessionModalSession.sessionId}/end`);

            if (res.data?.success) {

                toast.success("Interview ended successfully. You can now write your candidate evaluation.");

                const updated = res.data.data;

                setAllSessions(prev => prev.map(s => (s.sessionId === updated.sessionId ? { ...s, ...updated } : s)));

                if (selectedSessionModal?.sessionId === updated.sessionId) {

                    setSelectedSessionModal(prev => prev ? { ...prev, ...updated } : prev);

                }

                const targetSession = { ...endSessionModalSession, ...updated };

                setEndSessionModalSession(null);

                // Immediately open the review modal so the expert can proceed with evaluation

                openReviewModal(targetSession);

            } else {

                toast.error(res.data?.message || "Failed to end session");

            }

        } catch (err: any) {

            console.error("End session error:", err);

            toast.error(err.response?.data?.message || "Could not end session");

        } finally {

            setEndingSession(false);

        }

    };



    // Helper: is session active right now? (terminal states cannot be active)

    const isSessionActive = (session: Session) => {

        if (!session) return false;

        const status = session.status?.toLowerCase();

        if (status === 'completed' || status === 'cancelled' || status === 'no-show' || status === 'candidate_no_show' || status === 'no_show') {

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
        if (directPayout > 0) return Math.round(directPayout * 100) / 100;
        const price = Number(session.price || 0);
        if (price > 0) {
            const totalPaise = Math.round(price * 100);
            return Math.min(totalPaise, Math.round(totalPaise * 0.80)) / 100;
        }
        return 0;
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



    // Total date groups pages based on grouping

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

            const computedOverall = Number((

                (reviewForm.technicalRating + reviewForm.communicationRating + reviewForm.problemSolvingRating + reviewForm.designRating + reviewForm.behavioralRating) / 5

            ).toFixed(1));



            const payload = {

                overallRating: computedOverall,

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
                if (searchParams.get('sessionId') || searchParams.get('action') || params.sessionId) {
                    navigate('/dashboard/sessions', { replace: true });
                }



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

        <div className="sidebar-main-card relative w-full rounded-2xl border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-3.5 sm:p-5 md:p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-4 animate-in fade-in duration-200">

            {/* Decorative ambient blue lighting */}

            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />

            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />



            <div className="relative z-10 space-y-4">

                {/* ======================================================== */}

                {/* --- 1. PAGE HEADER --- */}

                {/* ======================================================== */}

                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#0755E8] shadow-2xs shrink-0">
                            <CalendarDays className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Interview Sessions</h1>
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#0755E8] border border-blue-200/80">
                                    Sessions
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Manage your upcoming interviews, countdowns, and review candidate session scorecards.
                            </p>
                        </div>
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
                {/* --- 2. 4 BALANCED MODERN KPI CARDS (Full Width, Zero Empty Space) --- */}
                {/* ======================================================== */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
                    {/* Card 1: Upcoming Sessions */}
                    <div
                        onClick={() => { setStatusFilter('upcoming'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`relative overflow-hidden p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            statusFilter === 'upcoming'
                                ? 'bg-gradient-to-b from-[#EBF3FF] via-white to-white border-blue-400 shadow-md ring-2 ring-blue-500/15'
                                : 'bg-gradient-to-b from-[#F5F8FF] via-white to-white border-blue-100/90 hover:border-blue-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1.5 relative z-10">
                            <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <CalendarCheck className="w-3.5 h-3.5" />
                            </div>
                            <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>

                        <div className="relative z-10 space-y-0.5">
                            <span className="text-[10.5px] font-bold text-blue-700 uppercase tracking-wider block">Upcoming</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{upcomingSessionsCount}</span>
                                <span className="text-[11px] text-slate-500 font-medium">Interviews</span>
                            </div>
                        </div>

                        {/* Floating Undulating Wave */}
                        <CardFloatingWave colorClass="text-blue-400/50" heightClass="h-8 sm:h-9" />
                    </div>

                    {/* Card 2: Today's Agenda */}
                    <div
                        onClick={() => { setDateQuickFilter('today'); setCustomDateFilter(''); }}
                        className={`relative overflow-hidden p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            dateQuickFilter === 'today'
                                ? 'bg-gradient-to-b from-[#ECFDF5] via-white to-white border-emerald-400 shadow-md ring-2 ring-emerald-500/15'
                                : 'bg-gradient-to-b from-[#F2FBF7] via-white to-white border-emerald-100/90 hover:border-emerald-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1.5 relative z-10">
                            <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <Clock className="w-3.5 h-3.5" />
                            </div>
                            <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>

                        <div className="relative z-10 space-y-0.5">
                            <span className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider block">Today's Agenda</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{todaySessionsCount}</span>
                                <span className="text-[11px] text-slate-500 font-medium">Scheduled today</span>
                            </div>
                        </div>

                        {/* Floating Undulating Wave */}
                        <CardFloatingWave colorClass="text-emerald-400/50" heightClass="h-8 sm:h-9" />
                    </div>

                    {/* Card 3: Completed Sessions */}
                    <div
                        onClick={() => { setStatusFilter('completed'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`relative overflow-hidden p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            statusFilter === 'completed'
                                ? 'bg-gradient-to-b from-[#FAF5FF] via-white to-white border-purple-400 shadow-md ring-2 ring-purple-500/15'
                                : 'bg-gradient-to-b from-[#FBF8FF] via-white to-white border-purple-100/90 hover:border-purple-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1.5 relative z-10">
                            <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="w-5 h-5 rounded-full bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600">
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>

                        <div className="relative z-10 space-y-0.5">
                            <span className="text-[10.5px] font-bold text-purple-700 uppercase tracking-wider block">Completed</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{completedSessionsCount}</span>
                                <span className="text-[11px] text-slate-500 font-medium">Total interviews</span>
                            </div>
                        </div>

                        {/* Floating Undulating Wave */}
                        <CardFloatingWave colorClass="text-purple-400/50" heightClass="h-8 sm:h-9" />
                    </div>

                    {/* Card 4: All Sessions (Fills the 4th column evenly, eliminating right whitespace) */}
                    <div
                        onClick={() => { setStatusFilter('all'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`relative overflow-hidden p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                            statusFilter === 'all' && dateQuickFilter === 'all'
                                ? 'bg-gradient-to-b from-[#FEF3C7] via-white to-white border-amber-400 shadow-md ring-2 ring-amber-500/15'
                                : 'bg-gradient-to-b from-[#FFFBEB] via-white to-white border-amber-100/90 hover:border-amber-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1.5 relative z-10">
                            <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                <Award className="w-3.5 h-3.5" />
                            </div>
                            <div className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600">
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>

                        <div className="relative z-10 space-y-0.5">
                            <span className="text-[10.5px] font-bold text-amber-800 uppercase tracking-wider block">All Sessions</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{allSessions.length}</span>
                                <span className="text-[11px] text-slate-500 font-medium">Total bookings</span>
                            </div>
                        </div>

                        {/* Floating Undulating Wave */}
                        <CardFloatingWave colorClass="text-amber-400/50" heightClass="h-8 sm:h-9" />
                    </div>
                </div>



                {/* ======================================================== */}

                {/* --- 3. FILTER & SEARCH TOOLBAR --- */}

                {/* ======================================================== */}

                <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 space-y-3.5 shadow-xs">

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

                                                                            className="font-bold text-slate-900 text-sm sm:text-base hover:text-blue-600 cursor-pointer truncate transition-colors capitalize"

                                                                        >

                                                                            {formatDisplayName(session.candidateName || "Candidate")}

                                                                        </h4>



                                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${statusBadge.classes}`}>

                                                                            {statusBadge.label}

                                                                        </span>



                                                                        {payout > 0 && (

                                                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${

                                                                                session.payoutCredited

                                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'

                                                                                    : 'bg-amber-50 text-amber-800 border-amber-200'

                                                                            }`}>

                                                                                <Wallet className={`w-3 h-3 ${session.payoutCredited ? 'text-emerald-600' : 'text-amber-600'}`} />

                                                                                ₹{payout} {session.payoutCredited ? 'Credited' : 'Pending Feedback'}

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

                                                                /* Action: Live Meeting Room Join & Mark Absent */

                                                                (() => {

                                                                    const cardStartMs = start.getTime();

                                                                    const cardGraceEndMs = cardStartMs + noShowGraceMinutes * 60 * 1000;

                                                                    const cardNowMs = currentTime.getTime();

                                                                    const cardGraceRemMs = Math.max(0, cardGraceEndMs - cardNowMs);

                                                                    const cardGraceRemMin = Math.floor(cardGraceRemMs / 60000);

                                                                    const cardGraceRemSec = Math.floor((cardGraceRemMs % 60000) / 1000);

                                                                    const hasCandidateJoinedCard = Boolean((session as any).candidateJoinedAt || (session as any).attendanceStatus === 'attended');

                                                                    const canMarkAbsentCard = canMarkNoShow(session);

                                                                    const isSessionConcludedCard = isSessionEnded(session);



                                                                    return (

                                                                        <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">

                                                                            <div className="flex items-center gap-2">

                                                                                <button

                                                                                    onClick={() => handleJoin(session)}

                                                                                    disabled={loading}

                                                                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all animate-pulse"

                                                                                >

                                                                                    <Video className="w-4 h-4" />

                                                                                    <span>Join Live Meeting</span>

                                                                                </button>



                                                                                {hasCandidateJoinedCard ? (

                                                                                    <span className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1.5">

                                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />

                                                                                        <span>Candidate Joined</span>

                                                                                    </span>

                                                                                ) : canMarkAbsentCard ? (

                                                                                    <button

                                                                                        onClick={() => setNoShowModalSession(session)}

                                                                                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"

                                                                                    >

                                                                                        <UserX className="w-3.5 h-3.5 text-white" />

                                                                                        <span>Mark Absent</span>

                                                                                    </button>

                                                                                ) : isSessionConcludedCard ? (

                                                                                    <button

                                                                                        disabled={true}

                                                                                        className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed"

                                                                                    >

                                                                                        <span>Session Concluded</span>

                                                                                    </button>

                                                                                ) : (

                                                                                    <button

                                                                                        disabled={true}

                                                                                        title="Candidate has 15 minutes from the scheduled start time to join."

                                                                                        className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed"

                                                                                    >

                                                                                        <Lock className="w-3 h-3 text-slate-400" />

                                                                                        <span>Mark Absent (Locked - {cardGraceRemMin}m {cardGraceRemSec.toString().padStart(2, '0')}s)</span>

                                                                                    </button>

                                                                                )}

                                                                            </div>

                                                                            {!hasCandidateJoinedCard && (

                                                                                <p className="text-[11px] text-slate-500 max-w-xs text-right leading-tight">

                                                                                    {canMarkAbsentCard

                                                                                        ? "Candidate has not joined within the grace period. You may now mark them absent."

                                                                                        : isSessionConcludedCard

                                                                                        ? "Session concluded."

                                                                                        : "Candidate has 15 minutes from the scheduled start time to join. You can mark them absent only after the grace period if they have not joined."}

                                                                                </p>

                                                                            )}

                                                                        </div>

                                                                    );

                                                                })()

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

                        onClick={handleCloseSessionModal}

                    ></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90">

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

                                onClick={handleCloseSessionModal}

                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"

                            >

                                <X className="w-5 h-5" />

                            </button>

                        </div>



                        {/* Modal Body */}

                        <div className="p-6 space-y-6 overflow-y-auto thin-scrollbar">

                            {/* Session Quick Status Row */}

                            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/40 via-slate-50 to-white border border-blue-100/90 shadow-2xs">

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

                            <div className="p-4 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/60 to-indigo-50/30 shadow-2xs flex items-center justify-between gap-3">

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

                                {isSessionNoShow(selectedSessionModal) ? (

                                    <div className="w-full py-3.5 px-4 rounded-xl font-bold text-amber-900 bg-amber-50 border border-amber-300 text-xs flex flex-col items-center justify-center gap-1">

                                        <div className="flex items-center gap-1.5">

                                            <AlertTriangle className="w-4 h-4 text-amber-600" />

                                            <span>Candidate Marked as No-Show</span>

                                        </div>

                                        <span className="text-[11px] font-normal text-amber-700 text-center">

                                            Evaluation skipped • Payout credited: ₹{getSessionPayoutAmount(selectedSessionModal)} • Excluded from certificate eligibility

                                        </span>

                                    </div>

                                ) : selectedSessionModal.status?.toLowerCase() === 'completed' || isSessionEnded(selectedSessionModal) ? (

                                    <div className="space-y-2">

                                        {isSessionReviewed(selectedSessionModal) ? (

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

                                                <span>Review Candidate & Write Evaluation</span>

                                            </button>

                                        )}

                                        {selectedSessionModal.earlyEnded && (

                                            <p className="text-center text-[11px] text-slate-500 font-medium">

                                                Interview completed early at {formatTimeInTz(new Date(selectedSessionModal.actualEndTime || selectedSessionModal.startTime))}.

                                            </p>

                                        )}

                                    </div>

                                ) : selectedSessionModal.status?.toLowerCase() === 'cancelled' ? (

                                    <div className="w-full py-3 px-4 rounded-xl font-bold text-rose-700 bg-rose-50 border border-rose-200 text-xs flex items-center justify-center gap-2">

                                        <span>Session Cancelled</span>

                                    </div>

                                ) : (

                                    <>

                                        {(() => {

                                            const modalStart = new Date(selectedSessionModal.startTime).getTime();

                                            const modalEnd = new Date(selectedSessionModal.endTime).getTime();

                                            const nowMs = currentTime.getTime();

                                            const bufferStartMs = modalStart - 5 * 60 * 1000;

                                            const isModalSessionStarted = nowMs >= bufferStartMs;

                                            const hasCandidateJoinedModal = Boolean((selectedSessionModal as any).candidateJoinedAt || (selectedSessionModal as any).attendanceStatus === 'attended');

                                            const graceEndMs = modalStart + noShowGraceMinutes * 60 * 1000;

                                            const isGraceActive = nowMs >= modalStart && nowMs < graceEndMs;

                                            const isSessionExpired = nowMs >= modalEnd;

                                            const graceRemainingMs = Math.max(0, graceEndMs - nowMs);

                                            const graceRemainingMin = Math.floor(graceRemainingMs / 60000);

                                            const graceRemainingSec = Math.floor((graceRemainingMs % 60000) / 1000);

                                            const canMarkNoShowModal = nowMs >= graceEndMs && nowMs < modalEnd && !hasCandidateJoinedModal;



                                            return (

                                                <div className="space-y-3">

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



                                                    {/* Session Controls: End Session & Candidate No-Show */}

                                                    {isModalSessionStarted && (

                                                        <div className="mt-2.5 p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/80 space-y-2.5 text-left">

                                                            <div className="flex items-center justify-between text-xs">

                                                                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">

                                                                    Attendance & Session Actions

                                                                </span>

                                                                {hasCandidateJoinedModal ? (

                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">

                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Candidate In Session

                                                                    </span>

                                                                ) : (

                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">

                                                                        <Clock className="w-3 h-3 text-amber-600" /> Awaiting Candidate

                                                                    </span>

                                                                )}

                                                            </div>



                                                            {hasCandidateJoinedModal ? (

                                                                /* Candidate HAS joined: Expert can End Session early */

                                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-200/60">

                                                                    <p className="text-xs text-slate-600 leading-relaxed">

                                                                        Candidate joined. If you have finished the interview before the scheduled end time, end the session now to proceed directly to evaluation.

                                                                    </p>

                                                                    <button

                                                                        type="button"

                                                                        onClick={() => setEndSessionModalSession(selectedSessionModal)}

                                                                        disabled={endingSession}

                                                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0 hover:shadow-xs active:scale-98"

                                                                    >

                                                                        <PhoneOff className="w-3.5 h-3.5 text-rose-600" />

                                                                        <span>End Session</span>

                                                                    </button>

                                                                </div>

                                                            ) : (

                                                                /* Candidate has NOT joined: 15-Minute Grace Period or Mark Absent */

                                                                <div className="space-y-2.5 pt-1 border-t border-slate-200/60">

                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">

                                                                        <div className="space-y-0.5">

                                                                            <p className="text-xs font-semibold text-slate-800">

                                                                                {isSessionExpired

                                                                                    ? `Session Concluded`

                                                                                    : isGraceActive

                                                                                    ? `${noShowGraceMinutes}-Minute Grace Period Active`

                                                                                    : nowMs < modalStart

                                                                                    ? `Scheduled Start Pending`

                                                                                    : `Candidate Absent Window Open`}

                                                                            </p>

                                                                            <p className="text-[11px] text-slate-500">

                                                                                {isSessionExpired

                                                                                    ? `Session concluded.`

                                                                                    : isGraceActive

                                                                                    ? `Candidate has 15 minutes from the scheduled start time to join. You can mark them absent only after the grace period if they have not joined.`

                                                                                    : nowMs < modalStart

                                                                                    ? `Session begins at ${formatTimeInTz(new Date(selectedSessionModal.startTime))}.`

                                                                                    : `Candidate has not joined within the grace period. You may now mark them absent.`}

                                                                            </p>

                                                                        </div>



                                                                        {canMarkNoShowModal ? (

                                                                            <button

                                                                                type="button"

                                                                                onClick={() => setNoShowModalSession(selectedSessionModal)}

                                                                                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 hover:shadow-md active:scale-98"

                                                                            >

                                                                                <UserX className="w-3.5 h-3.5 text-white" />

                                                                                <span>Mark Absent</span>

                                                                            </button>

                                                                        ) : isSessionExpired ? (

                                                                            <div className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-not-allowed">

                                                                                <span>Session Concluded</span>

                                                                            </div>

                                                                        ) : (

                                                                            <button

                                                                                type="button"

                                                                                disabled={true}

                                                                                title="Candidate has 15 minutes from the scheduled start time to join. You can mark them absent only after the grace period if they have not joined."

                                                                                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-not-allowed"

                                                                            >

                                                                                <Lock className="w-3.5 h-3.5 text-slate-400" />

                                                                                <span>Mark Absent (Locked - {graceRemainingMin}m {graceRemainingSec.toString().padStart(2, '0')}s)</span>

                                                                            </button>

                                                                        )}

                                                                    </div>



                                                                    {isGraceActive && (

                                                                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">

                                                                            <div

                                                                                className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-linear"

                                                                                style={{ width: `${Math.min(100, Math.max(0, ((nowMs - modalStart) / (noShowGraceMinutes * 60 * 1000)) * 100))}%` }}

                                                                            />

                                                                        </div>

                                                                    )}

                                                                </div>

                                                            )}

                                                        </div>

                                                    )}

                                                </div>

                                            );

                                        })()}

                                    </>

                                )}

                            </div>



                            {/* Candidate Briefing Card */}

                            <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3 shadow-2xs">

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

                            <SecondaryButton onClick={handleCloseSessionModal}>Close</SecondaryButton>

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

                        onClick={handleCloseCandidateProfile}

                    ></div>

                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">

                        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">

                            <div>

                                <h3 className="text-lg font-bold text-slate-900 capitalize">

                                    {formatDisplayName(selectedCandidateProfile.candidateName || "Candidate Profile")}

                                </h3>

                                <p className="text-xs text-slate-500">Applicant Details & Qualifications</p>

                            </div>

                            <button

                                onClick={handleCloseCandidateProfile}

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

                            <SecondaryButton onClick={handleCloseCandidateProfile}>Close</SecondaryButton>

                        </div>

                    </div>

                </div>

            )}



            {/* ======================================================== */}

            {/* --- 7. STRUCTURED INTERVIEW EVALUATION RUBRIC MODAL --- */}

            {/* ======================================================== */}

            {/* --- END SESSION CONFIRMATION MODAL --- */}

            {/* ======================================================== */}

            {endSessionModalSession && (

                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">

                    <div

                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"

                        onClick={() => !endingSession && setEndSessionModalSession(null)}

                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200 space-y-4">

                        <div className="flex items-center gap-3">

                            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">

                                <PhoneOff className="w-5 h-5" />

                            </div>

                            <div>

                                <h3 className="font-bold text-slate-900 text-base">End this interview?</h3>

                                <p className="text-xs text-slate-500">Conclude early & unlock evaluation</p>

                            </div>

                        </div>



                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">

                            The interview will be marked as completed at the current time. You can proceed with your evaluation and feedback.

                        </p>



                        <div className="flex items-center justify-end gap-2.5 pt-2">

                            <button

                                type="button"

                                disabled={endingSession}

                                onClick={() => setEndSessionModalSession(null)}

                                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"

                            >

                                Cancel

                            </button>

                            <button

                                type="button"

                                disabled={endingSession}

                                onClick={handleConfirmEndSession}

                                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"

                            >

                                {endingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}

                                <span>{endingSession ? 'Ending Interview...' : 'Confirm & End Session'}</span>

                            </button>

                        </div>

                    </div>

                </div>

            )}



            {/* ======================================================== */}

            {/* No-Show Confirmation Dialog */}

            {noShowModalSession && (

                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">

                    <div

                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"

                        onClick={() => !submittingNoShow && setNoShowModalSession(null)}

                    />

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">

                        {/* Header */}

                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">

                            <div className="flex items-center gap-2.5">

                                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">

                                    <AlertTriangle className="w-5 h-5" />

                                </div>

                                <div>

                                    <h3 className="font-bold text-slate-900 text-base">Mark Candidate as No-Show?</h3>

                                    <p className="text-xs text-slate-500">Scheduled interview attendance verification</p>

                                </div>

                            </div>

                            <button

                                onClick={() => !submittingNoShow && setNoShowModalSession(null)}

                                disabled={submittingNoShow}

                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"

                            >

                                <X className="w-5 h-5" />

                            </button>

                        </div>



                        {/* Body */}

                        <div className="p-6 space-y-4">

                            <p className="text-sm text-slate-700 leading-relaxed font-medium">

                                The candidate has not joined the meeting within the {noShowGraceMinutes}-minute grace period. Confirming this will close the session under the no-show policy.

                            </p>



                            {/* Candidate & Session Details */}

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">

                                <div className="flex justify-between items-center">

                                    <span className="text-slate-500 font-medium">Candidate:</span>

                                    <span className="font-bold text-slate-900">{noShowModalSession.candidateName || 'Candidate'}</span>

                                </div>

                                <div className="flex justify-between items-center">

                                    <span className="text-slate-500 font-medium">Scheduled Time:</span>

                                    <span className="font-semibold text-slate-800">

                                        {formatTimeInTz(new Date(noShowModalSession.startTime))} - {formatTimeInTz(new Date(noShowModalSession.endTime))}

                                    </span>

                                </div>

                                <div className="flex justify-between items-center">

                                    <span className="text-slate-500 font-medium">Grace Period Status:</span>

                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">

                                        {noShowGraceMinutes}-min Grace Period Elapsed

                                    </span>

                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">

                                    <span className="text-slate-500 font-medium">Applicable Expert Payout:</span>

                                    <span className="font-extrabold text-emerald-700 text-sm">

                                        ₹{getSessionPayoutAmount(noShowModalSession)}

                                    </span>

                                </div>

                            </div>



                            {/* Optional Reason */}

                            <div>

                                <label className="block text-xs font-semibold text-slate-700 mb-1">

                                    Absence Notes / Reason (Optional)

                                </label>

                                <textarea

                                    value={noShowReason}

                                    onChange={(e) => setNoShowReason(e.target.value)}

                                    placeholder={`e.g. Candidate did not join within ${noShowGraceMinutes}-minute grace window`}

                                    rows={2}

                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"

                                />

                            </div>

                        </div>



                        {/* Footer Buttons */}

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">

                            <SecondaryButton

                                onClick={() => setNoShowModalSession(null)}

                                disabled={submittingNoShow}

                            >

                                Cancel

                            </SecondaryButton>

                            <button

                                onClick={handleConfirmNoShow}

                                disabled={submittingNoShow}

                                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"

                            >

                                {submittingNoShow ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}

                                <span>{submittingNoShow ? 'Confirming...' : 'Confirm Mark Absent'}</span>

                            </button>

                        </div>

                    </div>

                </div>

            )}



            {reviewSession && (

                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">

                    <div

                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"

                        onClick={handleCloseReviewModal}

                    ></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90">

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

                                onClick={handleCloseReviewModal}

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

                                        Rubric Avg: {formatScoreDisplay(

                                            (reviewForm.technicalRating + reviewForm.problemSolvingRating + reviewForm.designRating + reviewForm.communicationRating + reviewForm.behavioralRating) / 5

                                        )} / 5

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



                            {/* 3. OVERALL PERFORMANCE (AUTHORITATIVE COMPUTED AVERAGE) */}

                            {(() => {

                                const computedRubricAvg = Number(((reviewForm.technicalRating + reviewForm.problemSolvingRating + reviewForm.designRating + reviewForm.communicationRating + reviewForm.behavioralRating) / 5).toFixed(1));

                                return (

                                    <div className="space-y-1.5">

                                        <div className="flex items-center justify-between">

                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">

                                                3. Overall Rating (Authoritative Rubric Average)

                                            </label>

                                            <span className="text-[10px] text-slate-400 font-medium">Equal-weight 5-category arithmetic average</span>

                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">

                                            <div className="flex gap-1.5">

                                                {[1, 2, 3, 4, 5].map((star) => (

                                                    <div

                                                        key={star}

                                                        className={`${star <= Math.round(computedRubricAvg) ? 'text-amber-400' : 'text-slate-200'}`}

                                                    >

                                                        <Star className="w-6 h-6 fill-current" />

                                                    </div>

                                                ))}

                                            </div>

                                            <span className="text-sm font-bold text-slate-800">

                                                {formatScoreDisplay(computedRubricAvg)} / 5

                                            </span>

                                        </div>

                                    </div>

                                );

                            })()}



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

                                <SecondaryButton onClick={handleCloseReviewModal}>Cancel</SecondaryButton>

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

