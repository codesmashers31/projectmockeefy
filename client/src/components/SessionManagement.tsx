import { useState, useEffect, useMemo } from "react";
import axios from '../lib/axios';
import { getProfileImageUrl } from "../lib/imageUtils";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Filter,
  X,
  User,
  Calendar,
  DollarSign,
  Maximize2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Copy,
  ExternalLink,
  UserCheck,
  GraduationCap,
  Sparkles,
  Video,
  FileText,
  Star,
  Clock,
  Layers,
  Globe,
  Award,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";

export interface UserProfileDetails {
  id?: string | null;
  userId?: string | null;
  name?: string;
  email?: string | null;
  phone?: string | null;
  profileImage?: string | null;
  title?: string | null;
  company?: string | null;
  category?: string | null;
  level?: string | null;
  totalExperience?: number | null;
  domains?: string[];
  tools?: string[];
  languages?: string[];
  linkedin?: string | null;
  status?: string;
  avgRating?: number | null;
  totalSessions?: number;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  gender?: string | null;
  education?: string | null;
  experienceLevel?: string | null;
  jobType?: string | null;
  technicalSkills?: string[];
  bio?: string | null;
  userType?: string;
}

interface Session {
  _id: string;
  sessionId: string;
  expertId: string;
  candidateId: string;
  expertName?: string;
  candidateName?: string;
  expertDetails?: UserProfileDetails;
  candidateDetails?: UserProfileDetails;
  startTime: string; // ISO Date string
  endTime: string;
  topics: string[];
  price: number;
  status: string; // 'pending' | 'confirmed' | 'completed' | 'cancelled'
  duration?: number;
  meetingLink?: string;
  notes?: string;
}

function ParticipantAvatar({
  src,
  name,
  className = "w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-2xs",
  fallbackGradient = "from-blue-600 to-indigo-700",
  fallbackTextSize = "text-base",
  badge = null,
}: {
  src?: string | null;
  name?: string;
  className?: string;
  fallbackGradient?: string;
  fallbackTextSize?: string;
  badge?: React.ReactNode;
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = useMemo(() => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  const resolvedUrl = useMemo(() => {
    if (!src || imgError) return null;
    return getProfileImageUrl(src, name);
  }, [src, name, imgError]);

  return (
    <div className="relative shrink-0 inline-block">
      {!imgError && resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={name || "Profile"}
          className={className}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`flex items-center justify-center font-bold text-white shadow-2xs select-none bg-gradient-to-br ${fallbackGradient} ${className}`}
        >
          <span className={fallbackTextSize}>{initials}</span>
        </div>
      )}
      {badge}
    </div>
  );
}

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAsc, setSortAsc] = useState(false); // Default desc (newest first)
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'both' | 'expert' | 'candidate'>('both');
  const pageSize = 8;

  const fetchSessions = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await axios.get("/api/sessions/all");
      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error(response.data.message || "Invalid sessions response");
      }
      // Transform incoming data to handle MongoDB Extended JSON format
      const formattedSessions = response.data.data.map((session: any) => ({
        ...session,
        _id: session._id?.$oid || session._id,
        startTime: session.startTime?.$date || session.startTime,
        endTime: session.endTime?.$date || session.endTime,
      }));
      setSessions(formattedSessions);

      // If a session was already selected, refresh it with updated data
      if (selectedSession) {
        const found = formattedSessions.find((s: Session) => s._id === selectedSession._id || s.sessionId === selectedSession.sessionId);
        if (found) setSelectedSession(found);
      }

      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setLoadError("Sessions could not be loaded. Check your connection and try again.");
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesStatus = filterStatus === "All" || s.status.toLowerCase() === filterStatus.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        (s.expertName?.toLowerCase() || "").includes(searchLower) ||
        (s.candidateName?.toLowerCase() || "").includes(searchLower) ||
        (s.expertDetails?.email?.toLowerCase() || "").includes(searchLower) ||
        (s.candidateDetails?.email?.toLowerCase() || "").includes(searchLower) ||
        s.sessionId.toLowerCase().includes(searchLower);

      return matchesStatus && matchesSearch;
    });
  }, [sessions, filterStatus, searchTerm]);

  // Sort by date
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [filteredSessions, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedSessions.length / pageSize);
  const paginatedSessions = sortedSessions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSelectSession = (session: Session) => {
    setSelectedSession(session);
    // On small mobile screens, open modal directly for accessibility
    if (window.innerWidth < 1024) {
      setShowModal(true);
    }
  };

  // Helper functions for UI
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'upcoming': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    // MAIN CONTAINER - Uses fixed height to enable inner column scrolling
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden p-6 md:p-8">

      {/* LEFT/CENTER: Session List */}
      <div className={`flex flex-col flex-1 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden transition-all duration-300 ${selectedSession ? 'lg:flex-[2]' : 'lg:flex-[3]'}`}>

        {/* Sticky Header */}
        <div className="p-6 border-b border-gray-100 bg-white z-10 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sessions</h2>
              <p className="text-sm text-gray-500">Manage and monitor all platform consultations</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchSessions}
                className="p-2 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by expert, user, email, or session ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-3 bg-gray-50/50">
          {loadError && hasLoaded && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>{loadError} Previously loaded sessions are still shown.</p>
              <button type="button" onClick={fetchSessions} className="mt-2 font-semibold underline" disabled={loading}>Retry</button>
            </div>
          )}
          {loading && !hasLoaded ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#0755E8]/30 shimmer-shining" />
                      <div className="h-3.5 w-20 rounded bg-slate-200/80 shimmer-shining" />
                    </div>
                    <div className="h-3 w-14 rounded bg-slate-100 shimmer-shining" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="h-4 w-36 rounded bg-slate-200/80 shimmer-shining" />
                      <div className="h-3 w-28 rounded bg-slate-100 shimmer-shining" />
                    </div>
                    <div className="text-right space-y-1 shrink-0">
                      <div className="h-4 w-12 rounded bg-[#EAF2FF] shimmer-shining ml-auto" />
                      <div className="h-3 w-10 rounded bg-slate-100 shimmer-shining ml-auto" />
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-slate-100 shimmer-shining" />
                    <div className="h-3 w-16 rounded bg-slate-100 shimmer-shining" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError && !hasLoaded ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p>{loadError}</p>
              <button type="button" onClick={fetchSessions} className="mt-2 font-semibold underline">Retry</button>
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="space-y-3">
              {paginatedSessions.map((session) => {
                const isSelected = selectedSession?._id === session._id;
                return (
                  <div
                    key={session._id}
                    onClick={() => handleSelectSession(session)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/15 shadow-md bg-blue-50/10'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          session.status?.toLowerCase() === 'completed' ? 'bg-emerald-500' :
                          session.status?.toLowerCase() === 'confirmed' ? 'bg-blue-500' :
                          session.status?.toLowerCase() === 'cancelled' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}></span>
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{session.status}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">#{session.sessionId.slice(-6)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{session.expertName || "Unknown Expert"}</h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          with <span className="font-medium text-gray-700">{session.candidateName || "Candidate"}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 text-sm">₹{session.price?.toLocaleString() || 0}</p>
                        <p className="text-xs text-gray-500">{session.duration || 30} min</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{formatDate(session.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        <span>{formatTime(session.startTime)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <RefreshCw className="w-10 h-10 text-gray-300 mb-2" />
              <h3 className="text-gray-900 font-medium">No sessions found</h3>
              <p className="text-gray-500 text-sm">Try changing search filters</p>
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        {!loading && filteredSessions.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between text-sm">
            <span className="text-gray-500 text-xs">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredSessions.length)} of {filteredSessions.length} sessions
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Session Details Panel */}
      {selectedSession ? (
        <div className="hidden lg:flex flex-col bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden w-[420px] xl:w-[460px]">
          {/* Panel Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/70">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Session Details</h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">#{selectedSession.sessionId}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setModalTab('both'); setShowModal(true); }}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="View Full Profile Comparison"
              >
                <Maximize2 size={16} />
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="Close Panel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-5">
            {/* Status & Quick Financials */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border flex flex-col justify-center ${getStatusColor(selectedSession.status)}`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</span>
                <span className="font-bold capitalize text-sm mt-0.5">{selectedSession.status}</span>
              </div>
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 flex flex-col justify-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Financials</span>
                <span className="font-bold text-amber-900 text-sm mt-0.5">₹{selectedSession.price?.toLocaleString() || 0}</span>
              </div>
            </div>

            {/* EXPERT SECTION */}
            <div className="bg-white rounded-xl border border-blue-100 shadow-2xs overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 px-3.5 py-2 border-b border-blue-100/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 tracking-wide uppercase">
                  <UserCheck size={14} className="text-blue-600" />
                  <span>Expert Profile</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {selectedSession.expertDetails?.level || 'Mentor'}
                </span>
              </div>

              <div className="p-3.5 space-y-3">
                {/* Identity */}
                <div className="flex items-start gap-3">
                  <ParticipantAvatar
                    src={selectedSession.expertDetails?.profileImage}
                    name={selectedSession.expertName}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-2xs"
                    fallbackGradient="from-blue-600 to-indigo-700"
                    fallbackTextSize="text-base"
                    badge={<div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>}
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate" title={selectedSession.expertName}>
                      {selectedSession.expertName}
                    </h4>
                    <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5 truncate">
                      <Briefcase size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">
                        {selectedSession.expertDetails?.title || 'Expert'}
                        {selectedSession.expertDetails?.company ? ` • ${selectedSession.expertDetails.company}` : ''}
                      </span>
                    </div>
                    {selectedSession.expertDetails?.category && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          <Layers size={10} />
                          {selectedSession.expertDetails.category}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact details */}
                <div className="bg-gray-50/80 rounded-lg p-2.5 space-y-1.5 text-xs border border-gray-100">
                  <div className="flex items-center justify-between text-gray-600 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{selectedSession.expertDetails?.email || 'No email provided'}</span>
                    </div>
                    {selectedSession.expertDetails?.email && (
                      <button
                        onClick={() => copyToClipboard(selectedSession.expertDetails?.email!, 'Expert email')}
                        className="text-gray-400 hover:text-blue-600 p-1 hover:bg-white rounded transition"
                        title="Copy Email"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-gray-600 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span>{selectedSession.expertDetails?.phone || 'No phone provided'}</span>
                    </div>
                    {selectedSession.expertDetails?.phone && (
                      <button
                        onClick={() => copyToClipboard(selectedSession.expertDetails?.phone!, 'Expert phone')}
                        className="text-gray-400 hover:text-blue-600 p-1 hover:bg-white rounded transition"
                        title="Copy Phone"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>

                  {(selectedSession.expertDetails?.city || selectedSession.expertDetails?.country) && (
                    <div className="flex items-center gap-2 text-gray-600 pt-0.5">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span>{[selectedSession.expertDetails.city, selectedSession.expertDetails.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Footer info & Actions */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1 font-mono truncate max-w-[190px]" title={selectedSession.expertId}>
                    <span>ID: {selectedSession.expertId?.slice(0, 10)}...</span>
                    <button
                      onClick={() => copyToClipboard(selectedSession.expertId, 'Expert ID')}
                      className="text-gray-400 hover:text-gray-700 p-0.5"
                      title="Copy Full ID"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                  <button
                    onClick={() => { setModalTab('expert'); setShowModal(true); }}
                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 hover:underline"
                  >
                    <span>View Profile</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* CANDIDATE (USER) SECTION */}
            <div className="bg-white rounded-xl border border-emerald-100 shadow-2xs overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50/40 px-3.5 py-2 border-b border-emerald-100/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 tracking-wide uppercase">
                  <User size={14} className="text-emerald-600" />
                  <span>Candidate / User Profile</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {selectedSession.candidateDetails?.userType || 'Candidate'}
                </span>
              </div>

              <div className="p-3.5 space-y-3">
                {/* Identity */}
                <div className="flex items-start gap-3">
                  <ParticipantAvatar
                    src={selectedSession.candidateDetails?.profileImage}
                    name={selectedSession.candidateName}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-2xs"
                    fallbackGradient="from-emerald-600 to-teal-700"
                    fallbackTextSize="text-base"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm truncate" title={selectedSession.candidateName}>
                      {selectedSession.candidateName}
                    </h4>
                    <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5 truncate">
                      <Briefcase size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">
                        {selectedSession.candidateDetails?.title || selectedSession.candidateDetails?.experienceLevel || 'Learner / Candidate'}
                        {selectedSession.candidateDetails?.company ? ` • ${selectedSession.candidateDetails.company}` : ''}
                      </span>
                    </div>
                    {selectedSession.candidateDetails?.education && (
                      <div className="text-[11px] text-gray-500 truncate mt-0.5 flex items-center gap-1" title={selectedSession.candidateDetails.education}>
                        <GraduationCap size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{selectedSession.candidateDetails.education}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact details */}
                <div className="bg-gray-50/80 rounded-lg p-2.5 space-y-1.5 text-xs border border-gray-100">
                  <div className="flex items-center justify-between text-gray-600 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{selectedSession.candidateDetails?.email || 'No email provided'}</span>
                    </div>
                    {selectedSession.candidateDetails?.email && (
                      <button
                        onClick={() => copyToClipboard(selectedSession.candidateDetails?.email!, 'Candidate email')}
                        className="text-gray-400 hover:text-emerald-600 p-1 hover:bg-white rounded transition"
                        title="Copy Email"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-gray-600 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span>{selectedSession.candidateDetails?.phone || 'No phone provided'}</span>
                    </div>
                    {selectedSession.candidateDetails?.phone && (
                      <button
                        onClick={() => copyToClipboard(selectedSession.candidateDetails?.phone!, 'Candidate phone')}
                        className="text-gray-400 hover:text-emerald-600 p-1 hover:bg-white rounded transition"
                        title="Copy Phone"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>

                  {(selectedSession.candidateDetails?.city || selectedSession.candidateDetails?.country) && (
                    <div className="flex items-center gap-2 text-gray-600 pt-0.5">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span>{[selectedSession.candidateDetails.city, selectedSession.candidateDetails.state, selectedSession.candidateDetails.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Footer info & Actions */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1 font-mono truncate max-w-[190px]" title={selectedSession.candidateId}>
                    <span>ID: {selectedSession.candidateId?.slice(0, 10)}...</span>
                    <button
                      onClick={() => copyToClipboard(selectedSession.candidateId, 'Candidate ID')}
                      className="text-gray-400 hover:text-gray-700 p-0.5"
                      title="Copy Full ID"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                  <button
                    onClick={() => { setModalTab('candidate'); setShowModal(true); }}
                    className="text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-0.5 hover:underline"
                  >
                    <span>View Profile</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Timing & Meeting Link */}
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold mb-2 flex items-center gap-1.5">
                <Calendar size={13} /> Date & Time
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Date</div>
                  <div className="font-bold text-sm text-gray-900">{formatDate(selectedSession.startTime)}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Duration</div>
                  <div className="font-bold text-sm text-gray-900">{selectedSession.duration || 30}m</div>
                </div>
                <div className="col-span-2 bg-white p-3 rounded-xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Time Slot</div>
                  <div className="font-bold text-sm text-gray-900">
                    {formatTime(selectedSession.startTime)} - {formatTime(selectedSession.endTime)}
                  </div>
                </div>
              </div>

              {/* Meeting Link row if exists */}
              {selectedSession.meetingLink && (
                <div className="mt-2.5 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Video size={15} className="text-blue-600 shrink-0" />
                    <span className="truncate text-blue-900 font-medium">{selectedSession.meetingLink}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyToClipboard(selectedSession.meetingLink!, 'Meeting Link')}
                      className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                      title="Copy Meeting Link"
                    >
                      <Copy size={13} />
                    </button>
                    <a
                      href={selectedSession.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                      title="Open Meeting Link"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Topics */}
            {selectedSession.topics && selectedSession.topics.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 uppercase font-bold mb-2">Topics & Focus Areas</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSession.topics.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-xs font-medium text-gray-700 rounded-md border border-gray-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2">
              <button
                onClick={() => { setModalTab('both'); setShowModal(true); }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Maximize2 size={14} />
                <span>Open Full Profile Comparison</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-col bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 items-center justify-center text-center p-8 w-[420px] xl:w-[460px]">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xs mb-4">
            <Maximize2 className="text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-900 text-base">Select a Session</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-[240px]">
            Click on any consultation from the list to view both the Expert and Candidate details.
          </p>
        </div>
      )}

      {/* DETAILED COMPARISON MODAL */}
      {showModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <UserCheck size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-lg">Session Participants Details</h3>
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${getStatusColor(selectedSession.status)}`}>
                      {selectedSession.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Session ID: #{selectedSession.sessionId} • {formatDate(selectedSession.startTime)} at {formatTime(selectedSession.startTime)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-gray-100 bg-white">
              <button
                onClick={() => setModalTab('both')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
                  modalTab === 'both'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <UserCheck size={14} />
                <span>Side-by-Side Comparison</span>
              </button>
              <button
                onClick={() => setModalTab('expert')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
                  modalTab === 'expert'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Award size={14} />
                <span>Expert Profile</span>
              </button>
              <button
                onClick={() => setModalTab('candidate')}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
                  modalTab === 'candidate'
                    ? 'border-emerald-600 text-emerald-600 bg-emerald-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <User size={14} />
                <span>Candidate Profile</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto thin-scrollbar p-6 bg-gray-50/40">
              {modalTab === 'both' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* EXPERT COLUMN */}
                  <div className="bg-white rounded-2xl border border-blue-100 shadow-xs overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
                      <div className="flex items-center gap-4">
                        <ParticipantAvatar
                          src={selectedSession.expertDetails?.profileImage}
                          name={selectedSession.expertName}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-md shrink-0"
                          fallbackGradient="from-blue-600 to-indigo-700"
                          fallbackTextSize="text-2xl"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full inline-block mb-1">
                            {selectedSession.expertDetails?.level || 'Expert Mentor'}
                          </span>
                          <h4 className="font-bold text-lg text-white truncate">{selectedSession.expertName}</h4>
                          <p className="text-xs text-blue-100 truncate mt-0.5">
                            {selectedSession.expertDetails?.title || 'Expert'}
                            {selectedSession.expertDetails?.company ? ` @ ${selectedSession.expertDetails.company}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4 flex-1">
                      {/* Contact Info */}
                      <div>
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Details</h5>
                        <div className="space-y-2 bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1.5"><Mail size={13} /> Email</span>
                            <span className="font-semibold text-gray-900 select-all">{selectedSession.expertDetails?.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1.5"><Phone size={13} /> Phone</span>
                            <span className="font-semibold text-gray-900 select-all">{selectedSession.expertDetails?.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1.5"><MapPin size={13} /> Location</span>
                            <span className="font-semibold text-gray-900">
                              {[selectedSession.expertDetails?.city, selectedSession.expertDetails?.country].filter(Boolean).join(', ') || 'Not specified'}
                            </span>
                          </div>
                          {selectedSession.expertDetails?.linkedin && (
                            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                              <span className="text-gray-500 flex items-center gap-1.5"><Globe size={13} /> LinkedIn</span>
                              <a
                                href={selectedSession.expertDetails.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <span>Profile</span>
                                <ExternalLink size={11} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Domain & Level */}
                      <div>
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Specialization & Domain</h5>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSession.expertDetails?.category && (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-100">
                              {selectedSession.expertDetails.category}
                            </span>
                          )}
                          {selectedSession.expertDetails?.totalExperience !== undefined && selectedSession.expertDetails?.totalExperience !== null && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                              {selectedSession.expertDetails.totalExperience} Years Experience
                            </span>
                          )}
                          {selectedSession.expertDetails?.domains?.map((d, i) => (
                            <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg border border-gray-200">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tools & Tech */}
                      {selectedSession.expertDetails?.tools && selectedSession.expertDetails.tools.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tools & Technologies</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSession.expertDetails.tools.map((tool, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded border border-gray-200">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Identifiers */}
                      <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
                        <div>Expert ID: <span className="font-mono text-gray-600">{selectedSession.expertId}</span></div>
                        {selectedSession.expertDetails?.userId && (
                          <div>User ID: <span className="font-mono text-gray-600">{selectedSession.expertDetails.userId}</span></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CANDIDATE COLUMN */}
                  <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5">
                      <div className="flex items-center gap-4">
                        <ParticipantAvatar
                          src={selectedSession.candidateDetails?.profileImage}
                          name={selectedSession.candidateName}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-md shrink-0"
                          fallbackGradient="from-emerald-600 to-teal-700"
                          fallbackTextSize="text-2xl"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full inline-block mb-1">
                            {selectedSession.candidateDetails?.userType || 'Candidate / User'}
                          </span>
                          <h4 className="font-bold text-lg text-white truncate">{selectedSession.candidateName}</h4>
                          <p className="text-xs text-emerald-100 truncate mt-0.5">
                            {selectedSession.candidateDetails?.title || selectedSession.candidateDetails?.experienceLevel || 'Learner'}
                            {selectedSession.candidateDetails?.company ? ` @ ${selectedSession.candidateDetails.company}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4 flex-1">
                      {/* Contact Info */}
                      <div>
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Details</h5>
                        <div className="space-y-2 bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1.5"><Mail size={13} /> Email</span>
                            <span className="font-semibold text-gray-900 select-all">{selectedSession.candidateDetails?.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1.5"><Phone size={13} /> Phone</span>
                            <span className="font-semibold text-gray-900 select-all">{selectedSession.candidateDetails?.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 flex items-center gap-1.5"><MapPin size={13} /> Location</span>
                            <span className="font-semibold text-gray-900">
                              {[selectedSession.candidateDetails?.city, selectedSession.candidateDetails?.state, selectedSession.candidateDetails?.country].filter(Boolean).join(', ') || 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Academic & Career Background */}
                      <div>
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Education & Profile</h5>
                        <div className="space-y-2 text-xs">
                          {selectedSession.candidateDetails?.education ? (
                            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2">
                              <GraduationCap size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                              <div>
                                <div className="font-semibold text-gray-800">Education</div>
                                <div className="text-gray-600 mt-0.5">{selectedSession.candidateDetails.education}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500 italic text-xs">No formal education listed</div>
                          )}

                          {selectedSession.candidateDetails?.experienceLevel && (
                            <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                              <span className="text-gray-600">Experience Tier</span>
                              <span className="font-bold text-emerald-800">{selectedSession.candidateDetails.experienceLevel}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Technical Skills */}
                      {selectedSession.candidateDetails?.technicalSkills && selectedSession.candidateDetails.technicalSkills.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Technical Skills</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSession.candidateDetails.technicalSkills.map((s, i) => (
                              <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] rounded border border-emerald-100">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resume / Profile Access */}
                      <div className="pt-2">
                        <a
                          href={`/api/sessions/${selectedSession.sessionId}/resume?mode=view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition"
                        >
                          <FileText size={14} />
                          <span>View Candidate Resume (PDF)</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {/* Identifiers */}
                      <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-400 space-y-1">
                        <div>Candidate User ID: <span className="font-mono text-gray-600">{selectedSession.candidateId}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'expert' && (
                <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-6">
                  {/* Expert Big Header */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-gray-100">
                    <ParticipantAvatar
                      src={selectedSession.expertDetails?.profileImage}
                      name={selectedSession.expertName}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-100 shadow-md shrink-0"
                      fallbackGradient="from-blue-600 to-indigo-700"
                      fallbackTextSize="text-3xl"
                    />
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                          {selectedSession.expertDetails?.level || 'Mentor'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Status: {selectedSession.expertDetails?.status || 'Active'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedSession.expertName}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedSession.expertDetails?.title || 'Expert Consultant'}
                        {selectedSession.expertDetails?.company ? ` at ${selectedSession.expertDetails.company}` : ''}
                      </p>
                      {selectedSession.expertDetails?.category && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                            <Layers size={13} />
                            Domain: {selectedSession.expertDetails.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expert Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact & Bio */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact & Social Links</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-2"><Mail size={15} /> Email</span>
                          <span className="font-semibold text-gray-900 select-all">{selectedSession.expertDetails?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-2"><Phone size={15} /> Phone</span>
                          <span className="font-semibold text-gray-900 select-all">{selectedSession.expertDetails?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-2"><MapPin size={15} /> Location</span>
                          <span className="font-semibold text-gray-900">
                            {[selectedSession.expertDetails?.city, selectedSession.expertDetails?.country].filter(Boolean).join(', ') || 'Not specified'}
                          </span>
                        </div>
                        {selectedSession.expertDetails?.linkedin && (
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-gray-500 flex items-center gap-2"><Globe size={15} /> LinkedIn</span>
                            <a
                              href={selectedSession.expertDetails.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-blue-600 hover:underline flex items-center gap-1 text-sm"
                            >
                              <span>Open Profile</span>
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        )}
                      </div>

                      {selectedSession.expertDetails?.bio && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Biography</h4>
                          <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                            {selectedSession.expertDetails.bio}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Expertise, Skills & Metrics */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Specialties & Tools</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1.5">Domains</div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSession.expertDetails?.domains && selectedSession.expertDetails.domains.length > 0 ? (
                              selectedSession.expertDetails.domains.map((d, i) => (
                                <span key={i} className="px-2.5 py-1 bg-white text-gray-700 text-xs font-medium rounded-md border border-gray-200">
                                  {d}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">No specific domains listed</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1.5">Tools & Technologies</div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSession.expertDetails?.tools && selectedSession.expertDetails.tools.length > 0 ? (
                              selectedSession.expertDetails.tools.map((tool, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">
                                  {tool}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">None specified</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1.5">Languages</div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSession.expertDetails?.languages && selectedSession.expertDetails.languages.length > 0 ? (
                              selectedSession.expertDetails.languages.map((lang, i) => (
                                <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-100">
                                  {lang}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">English (Default)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metrics Card */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                          <div className="text-xs text-blue-700 font-medium">Completed Sessions</div>
                          <div className="text-lg font-bold text-blue-900 mt-1">{selectedSession.expertDetails?.totalSessions ?? 0}</div>
                        </div>
                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                          <div className="text-xs text-amber-700 font-medium">Average Rating</div>
                          <div className="text-lg font-bold text-amber-900 mt-1 flex items-center justify-center gap-1">
                            <Star size={16} className="text-amber-500 fill-amber-500" />
                            <span>{selectedSession.expertDetails?.avgRating ? Number(selectedSession.expertDetails.avgRating).toFixed(1) : '5.0'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'candidate' && (
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 space-y-6">
                  {/* Candidate Big Header */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pb-6 border-b border-gray-100">
                    <ParticipantAvatar
                      src={selectedSession.candidateDetails?.profileImage}
                      name={selectedSession.candidateName}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-100 shadow-md shrink-0"
                      fallbackGradient="from-emerald-600 to-teal-700"
                      fallbackTextSize="text-3xl"
                    />
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                          {selectedSession.candidateDetails?.userType || 'Candidate'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Status: {selectedSession.candidateDetails?.status || 'Active'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedSession.candidateName}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedSession.candidateDetails?.title || selectedSession.candidateDetails?.experienceLevel || 'Learner / Aspiring Professional'}
                        {selectedSession.candidateDetails?.company ? ` at ${selectedSession.candidateDetails.company}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Candidate Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact & Identity */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Information</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-2"><Mail size={15} /> Email</span>
                          <span className="font-semibold text-gray-900 select-all">{selectedSession.candidateDetails?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-2"><Phone size={15} /> Phone</span>
                          <span className="font-semibold text-gray-900 select-all">{selectedSession.candidateDetails?.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-2"><MapPin size={15} /> Location</span>
                          <span className="font-semibold text-gray-900">
                            {[selectedSession.candidateDetails?.city, selectedSession.candidateDetails?.state, selectedSession.candidateDetails?.country].filter(Boolean).join(', ') || 'Not specified'}
                          </span>
                        </div>
                        {selectedSession.candidateDetails?.gender && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Gender</span>
                            <span className="font-semibold text-gray-900">{selectedSession.candidateDetails.gender}</span>
                          </div>
                        )}
                      </div>

                      {selectedSession.candidateDetails?.bio && (
                        <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bio</h4>
                          <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                            {selectedSession.candidateDetails.bio}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Academic & Professional Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Academic & Skills Background</h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        {selectedSession.candidateDetails?.education && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Education</div>
                            <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                              <GraduationCap size={16} className="text-emerald-600 shrink-0" />
                              <span>{selectedSession.candidateDetails.education}</span>
                            </div>
                          </div>
                        )}

                        {selectedSession.candidateDetails?.experienceLevel && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Experience Level</div>
                            <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md">
                              {selectedSession.candidateDetails.experienceLevel}
                            </span>
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1.5">Technical Skills</div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSession.candidateDetails?.technicalSkills && selectedSession.candidateDetails.technicalSkills.length > 0 ? (
                              selectedSession.candidateDetails.technicalSkills.map((sk, i) => (
                                <span key={i} className="px-2.5 py-1 bg-white text-emerald-800 text-xs font-medium rounded-md border border-emerald-100">
                                  {sk}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400 italic">No skills listed</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* View Resume Action */}
                      <div className="pt-2">
                        <a
                          href={`/api/sessions/${selectedSession.sessionId}/resume?mode=view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
                        >
                          <FileText size={16} />
                          <span>View Full Candidate Resume (PDF)</span>
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
