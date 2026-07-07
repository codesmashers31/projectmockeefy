import { useState, useEffect } from "react";
import axios from "../../lib/axios";
import { toast } from "sonner";
import {
  Wallet,
  Landmark,
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  Filter,
  DollarSign,
  Users,
  Check,
  X,
  ArrowUpRight
} from "lucide-react";

interface ExpertSummary {
  expertId: string;
  name: string;
  email: string;
  availableBalance: number;
  frozenBalance: number;
  totalWithdrawn: number;
}

interface PayoutRequest {
  _id: string;
  expertId: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  payoutMethodType: 'bank' | 'upi';
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'HOLD' | 'FAILED' | 'REVERSED';
  createdAt: string;
  utrNumber?: string;
  adminRemarks?: string;
  notes?: string;
  paymentDate?: string;
}

interface Analytics {
  pendingTotal: number;
  paidTotal: number;
  rejectedTotal: number;
  activeExpertCount: number;
  expertSummary: ExpertSummary[];
}

export default function PayoutManagement() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    pendingTotal: 0,
    paidTotal: 0,
    rejectedTotal: 0,
    activeExpertCount: 0,
    expertSummary: []
  });
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Request Modal State
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  
  // Resolution Form States
  const [resolutionStatus, setResolutionStatus] = useState<'PAID' | 'REJECTED' | 'PROCESSING' | 'HOLD'>('PAID');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  const fetchPayoutData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/payouts/admin/requests', {
        params: {
          status: statusFilter || undefined,
          methodType: methodFilter || undefined
        }
      });
      if (res.data.success) {
        setRequests(res.data.data);
        setAnalytics(res.data.analytics);
      }
    } catch (error: any) {
      console.error("Error fetching admin payout requests:", error);
      toast.error("Failed to load payout requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutData();
  }, [statusFilter, methodFilter]);

  const handleResolve = async () => {
    if (!selectedRequest) return;

    try {
      setIsResolving(true);
      const payload = {
        status: resolutionStatus,
        adminRemarks,
        transactionReference: transactionRef,
        notes,
        paymentDate: new Date()
      };

      const res = await axios.put(`/api/payouts/admin/request/${selectedRequest._id}`, payload);
      if (res.data.success) {
        toast.success(`Payout request marked as ${resolutionStatus} successfully!`);
        setSelectedRequest(null);
        setAdminRemarks('');
        setTransactionRef('');
        setNotes('');
        fetchPayoutData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resolve payout request.");
    } finally {
      setIsResolving(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const name = req.expertId?.name?.toLowerCase() || '';
    const email = req.expertId?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-4 sm:p-6 lg:p-8 font-sans bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Manual Payout Ledger</h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700 tracking-wide uppercase">
              <Clock className="w-3.5 h-3.5" /> Wednesday Payouts
            </span>
          </div>
          <p className="text-sm text-slate-500">Review pending withdrawals, verify expert sessions, and process manual bank / UPI payouts.</p>
        </div>
        <button
          onClick={fetchPayoutData}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          Refresh Data
        </button>
      </div>

      {/* Analytics Widget Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Pending Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] group hover:border-amber-400 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pending Audit</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950">₹{analytics.pendingTotal.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform duration-300">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Awaiting Wednesday manual transfer
          </p>
        </div>

        {/* Paid Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] group hover:border-emerald-400 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Manually Disbursed</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950">₹{analytics.paidTotal.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform duration-300">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-emerald-600 font-semibold">Processed with UTR records</p>
        </div>

        {/* Rejected Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] group hover:border-red-400 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Rejected</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950">₹{analytics.rejectedTotal.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-red-50 text-red-600 rounded-xl group-hover:scale-105 transition-transform duration-300">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-red-600 font-semibold">Funds returned to available wallets</p>
        </div>

        {/* Unique Experts */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-[130px] group hover:border-blue-400 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Registered Experts</p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-950">{analytics.activeExpertCount}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-105 transition-transform duration-300">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-blue-600 font-semibold">Active ledger accounts tracked</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search experts by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-medium bg-slate-50/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600 uppercase">Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 bg-white rounded-xl text-xs font-semibold px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Audit</option>
            <option value="PROCESSING">Processing</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
            <option value="HOLD">Hold</option>
          </select>

          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="border border-slate-200 bg-white rounded-xl text-xs font-semibold px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
          >
            <option value="">All Payout Modes</option>
            <option value="bank">Bank Account</option>
            <option value="upi">UPI ID</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4.5 font-bold uppercase tracking-wider text-[11px]">Requested Date</th>
                <th className="px-6 py-4.5 font-bold uppercase tracking-wider text-[11px]">Expert Details</th>
                <th className="px-6 py-4.5 font-bold uppercase tracking-wider text-[11px]">Payout Amount</th>
                <th className="px-6 py-4.5 font-bold uppercase tracking-wider text-[11px]">Payout Credentials</th>
                <th className="px-6 py-4.5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4.5 font-bold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Syncing Ledger Accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-semibold">
                    No matching payout requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req._id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Date */}
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {new Date(req.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>

                    {/* Expert Details */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 text-sm leading-tight">{req.expertId?.name || 'Unknown Expert'}</p>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">{req.expertId?.email || 'N/A'}</p>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4">
                      <span className="text-base font-extrabold text-slate-950">₹{req.amount.toLocaleString()}</span>
                    </td>

                    {/* Credentials */}
                    <td className="px-6 py-4">
                      {req.payoutMethodType === 'bank' ? (
                        <div className="flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">Bank Account</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                              {req.accountHolderName} | {req.accountNumber} ({req.ifscCode})
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-800">UPI</p>
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{req.upiId}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase
                        ${req.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                          req.status === 'REJECTED' || req.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'}`}
                      >
                        {req.status === 'PAID' ? <CheckCircle className="w-3.5 h-3.5" /> :
                         req.status === 'REJECTED' ? <XCircle className="w-3.5 h-3.5" /> :
                         <Clock className="w-3.5 h-3.5" />}
                        {req.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setResolutionStatus(req.status === 'PENDING' ? 'PAID' : (req.status as any));
                          setAdminRemarks(req.adminRemarks || '');
                          setTransactionRef(req.utrNumber || '');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs transition-all tracking-wide cursor-pointer inline-flex items-center gap-1"
                      >
                        Review Payout <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Resolution Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-250 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Review Withdrawal Request</h3>
                <p className="text-xs text-slate-500 mt-0.5">Reference ID: {selectedRequest._id}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Expert Info Box */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Requester Profile</p>
                  <p className="font-bold text-slate-900 text-base leading-tight mt-1">{selectedRequest.expertId?.name}</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{selectedRequest.expertId?.email}</p>
                </div>
                {/* Find current ledger balance if present */}
                {analytics.expertSummary.find(e => e.expertId === selectedRequest.expertId?._id) && (
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Wallet Available</p>
                    <p className="font-extrabold text-slate-900 text-lg mt-1">
                      ₹{analytics.expertSummary.find(e => e.expertId === selectedRequest.expertId?._id)?.availableBalance.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                      Frozen: ₹{analytics.expertSummary.find(e => e.expertId === selectedRequest.expertId?._id)?.frozenBalance.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Amount Box */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50/50 border border-blue-100 p-4.5 rounded-2xl">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Requested Amount</p>
                  <p className="text-2xl font-extrabold text-blue-900 mt-1">₹{selectedRequest.amount.toLocaleString()}</p>
                </div>
                <div className="bg-indigo-50/50 border border-indigo-100 p-4.5 rounded-2xl">
                  <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Payment Destination</p>
                  <p className="text-base font-extrabold text-indigo-900 mt-1 uppercase">
                    {selectedRequest.payoutMethodType === 'bank' ? 'Direct Bank IMPS' : 'UPI Reference'}
                  </p>
                </div>
              </div>

              {/* Exact Credentials Details */}
              <div className="border border-slate-200 rounded-2xl p-5 space-y-3.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Credentials details</h4>
                
                {selectedRequest.payoutMethodType === 'bank' ? (
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Account Holder Name</p>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedRequest.accountHolderName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">IFSC Code</p>
                      <p className="font-bold text-slate-900 mt-0.5">{selectedRequest.ifscCode}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-400 font-semibold">Account Number</p>
                      <p className="font-extrabold text-slate-950 mt-0.5 text-base tracking-wide bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block select-all">
                        {selectedRequest.accountNumber}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-xs text-slate-400 font-semibold">UPI ID Address</p>
                    <p className="font-extrabold text-slate-950 mt-0.5 text-base tracking-wide bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block select-all">
                      {selectedRequest.upiId}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Resolution Form */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-sm font-extrabold text-slate-900">Process Payout Action</h4>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Set Request Resolution Status</label>
                  <div className="flex gap-2">
                    {['PAID', 'REJECTED', 'PROCESSING', 'HOLD'].map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setResolutionStatus(status as any)}
                        className={`flex-1 font-bold py-2 rounded-xl text-xs transition-all uppercase tracking-wide border cursor-pointer ${
                          resolutionStatus === status
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {resolutionStatus === 'PAID' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">UTR / Bank Transaction Reference</label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={e => setTransactionRef(e.target.value)}
                      placeholder="Enter GPay Ref / IMPS UTR number"
                      className="w-full border border-slate-350 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Resolution remarks (Sent to Expert)</label>
                  <textarea
                    rows={2}
                    value={adminRemarks}
                    onChange={e => setAdminRemarks(e.target.value)}
                    placeholder="Enter approval details or rejection reasons (e.g. 'Transferred successfully via GPay')"
                    className="w-full border border-slate-350 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Internal Admin Notes (Private)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Wednesday batch validation done"
                    className="w-full border border-slate-350 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={isResolving}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isResolving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>Save Resolution</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
