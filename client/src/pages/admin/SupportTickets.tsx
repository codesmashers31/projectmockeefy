import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Headphones,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  ChevronRight,
  X,
  Trash2,
  Calendar,
  User as UserIcon,
  Mail,
  FileText,
  Send,
  Ticket,
  ShieldAlert,
} from 'lucide-react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import { useDataSync } from '../../context/SocketContext';
import AdminPageSkeleton, { AdminPageError } from '../../components/AdminPageSkeleton';

interface SupportTicketItem {
  _id: string;
  ticketId: string;
  userId?: string | null;
  userEmail: string;
  userName: string;
  userType: string;
  topic: string;
  sessionId?: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  adminNotes?: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketCounts {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [counts, setCounts] = useState<TicketCounts>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket for Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editStatus, setEditStatus] = useState<'open' | 'in_progress' | 'resolved'>('open');
  const [editPriority, setEditPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [editAdminNotes, setEditAdminNotes] = useState('');
  const [copiedSessionId, setCopiedSessionId] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await axios.get('/api/support/admin/tickets', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          topic: topicFilter !== 'all' ? topicFilter : undefined,
          search: searchQuery.trim() || undefined,
        },
      });

      if (res.data?.success) {
        setTickets(res.data.data || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      } else {
        throw new Error(res.data?.message || 'Failed to fetch support tickets');
      }
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      setLoadError(err.response?.data?.message || err.message || 'Error loading tickets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, topicFilter, searchQuery]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time synchronization when a ticket is created or updated
  useDataSync(['SUPPORT_TICKET_CREATED', 'SUPPORT_TICKET_UPDATED'], () => {
    fetchTickets();
  });

  const handleOpenTicketModal = (t: SupportTicketItem) => {
    setSelectedTicket(t);
    setEditStatus(t.status);
    setEditPriority(t.priority || 'normal');
    setEditAdminNotes(t.adminNotes || '');
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      const res = await axios.patch(`/api/support/admin/tickets/${selectedTicket._id}`, {
        status: editStatus,
        priority: editPriority,
        adminNotes: editAdminNotes,
      });

      if (res.data?.success) {
        toast.success(`Ticket #${selectedTicket.ticketId} updated successfully`);
        setSelectedTicket(null);
        fetchTickets();
      } else {
        toast.error(res.data?.message || 'Failed to update ticket');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await axios.delete(`/api/support/admin/tickets/${ticketId}`);
      if (res.data?.success) {
        toast.success('Ticket deleted successfully');
        if (selectedTicket?._id === ticketId) {
          setSelectedTicket(null);
        }
        fetchTickets();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete ticket');
    }
  };

  const handleCopySessionId = (sid: string) => {
    navigator.clipboard.writeText(sid);
    setCopiedSessionId(true);
    toast.success('Session ID copied to clipboard');
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Open
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={11} className="text-emerald-600" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#0755E8] flex items-center justify-center">
              <Headphones size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Support Tickets & Help Desk</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage user complaints, session conflict reports, certificates and refund inquiries.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchTickets()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-2xs cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-[#0755E8]' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Total Tickets</p>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Ticket size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{counts.total}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">All-time received tickets</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-rose-700">Open & Pending</p>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{counts.open}</p>
          <p className="text-[11px] text-rose-500/80 mt-0.5">Needs immediate review</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-amber-700">In Progress</p>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{counts.inProgress}</p>
          <p className="text-[11px] text-amber-500/80 mt-0.5">Under investigation</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-700">Resolved</p>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{counts.resolved}</p>
          <p className="text-[11px] text-emerald-500/80 mt-0.5">Closed & resolved</p>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl overflow-x-auto text-xs font-semibold text-gray-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'hover:text-gray-900'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'open'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Open ({counts.open})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'in_progress'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              In Progress ({counts.inProgress})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Resolved ({counts.resolved})
            </button>
          </div>

          {/* Topic Dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:border-[#0755E8]"
            >
              <option value="all">All Topics</option>
              <option value="Interviewer Issue or No-Show">Interviewer Issue or No-Show</option>
              <option value="Certificate Did Not Come">Certificate Did Not Come</option>
              <option value="Wallet or Refund Issue">Wallet or Refund Issue</option>
              <option value="Audio or Video Problem">Audio or Video Problem</option>
              <option value="Other Question">Other Question</option>
            </select>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ticket ID, user email, name, session ID, or problem keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#0755E8] transition-all"
          />
        </div>
      </div>

      {/* 4. Tickets Table or List */}
      {loading && tickets.length === 0 ? (
        <AdminPageSkeleton variant="table" rows={6} />
      ) : loadError ? (
        <AdminPageError message={loadError} onRetry={fetchTickets} />
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 mx-auto flex items-center justify-center">
            <Headphones size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-900">No Support Tickets Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all' || topicFilter !== 'all'
              ? 'No tickets match your active search or filter criteria. Try clearing filters.'
              : 'There are currently no support tickets submitted by users.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Issue Topic</th>
                  <th className="py-3 px-4">Session Ref</th>
                  <th className="py-3 px-4">Message Snippet</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Ticket ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200 inline-block text-[11px]">
                        {t.ticketId}
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{t.userName || 'Candidate'}</div>
                      <div className="text-[11px] text-gray-500">{t.userEmail}</div>
                      <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-semibold">
                        {t.userType || 'candidate'}
                      </span>
                    </td>

                    {/* Topic */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px]">
                        {t.topic}
                      </span>
                    </td>

                    {/* Session ID */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                      {t.sessionId ? (
                        <button
                          onClick={() => handleCopySessionId(t.sessionId!)}
                          title="Click to copy session ID"
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium cursor-pointer"
                        >
                          <span>{t.sessionId.substring(0, 12)}...</span>
                          <Copy size={11} className="text-gray-400 hover:text-blue-600" />
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Message Preview */}
                    <td className="py-3 px-4 max-w-xs truncate text-gray-600" title={t.message}>
                      {t.message}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">{renderStatusBadge(t.status)}</td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenTicketModal(t)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer shadow-2xs"
                      >
                        <span>Manage</span>
                        <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Manage / Resolve Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl p-6 space-y-5 text-left relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Ticket size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">
                      Ticket #{selectedTicket.ticketId}
                    </h2>
                    {renderStatusBadge(selectedTicket.status)}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Submitted on {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* User & Issue Details */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl text-xs border border-gray-200/60">
              <div>
                <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                  Submitted By
                </span>
                <span className="font-bold text-gray-900 block mt-0.5">
                  {selectedTicket.userName || 'Candidate'}
                </span>
                <span className="text-[11px] text-gray-600 block mt-0.5 break-all">
                  {selectedTicket.userEmail}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                  Issue Topic
                </span>
                <span className="font-bold text-gray-900 block mt-0.5">{selectedTicket.topic}</span>
                {selectedTicket.sessionId && (
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-gray-600">
                    <span>Session: {selectedTicket.sessionId}</span>
                    <button
                      onClick={() => handleCopySessionId(selectedTicket.sessionId!)}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      {copiedSessionId ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                User's Message
              </label>
              <div className="p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedTicket.message}
              </div>
            </div>

            {/* Status & Priority Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Update Ticket Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0755E8]"
                >
                  <option value="open">Open (Awaiting action)</option>
                  <option value="in_progress">In Progress (Under investigation)</option>
                  <option value="resolved">Resolved (Complete)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700">Priority Level</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0755E8]"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Admin Resolution Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-700">
                Admin Resolution Notes / Internal Log
              </label>
              <textarea
                rows={3}
                placeholder="Log internal resolution action (e.g. 'Sent candidate certificate via email', 'Processed refund', 'Contacted interviewer')..."
                value={editAdminNotes}
                onChange={(e) => setEditAdminNotes(e.target.value)}
                className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-[#0755E8] leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDeleteTicket(selectedTicket._id)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 cursor-pointer px-2 py-1"
              >
                <Trash2 size={13} />
                <span>Delete Ticket</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isUpdating}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0755E8] hover:bg-[#0645C7] rounded-lg cursor-pointer shadow-2xs transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save & Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
