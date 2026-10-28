import { useState, useEffect, useMemo } from 'react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import {
  FileText,
  Search,
  RefreshCw,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  ShieldCheck,
  Calendar,
  Eye,
  X,
  UserCheck,
  Clock,
  Filter,
  FileCheck2,
  FileSignature
} from 'lucide-react';
import { getProfileImageUrl } from '../../lib/imageUtils';
import PdfViewer from '../../components/PdfViewer';
import AdminPageSkeleton, { AdminPageError } from '../../components/AdminPageSkeleton';

interface AgreementRecord {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  profileImage?: string;
  company: string;
  title: string;
  signedAt?: string;
  signedBy?: string;
  isSigned: boolean;
  agreedTerms: boolean;
  agreementPdf?: { url: string; name: string } | null;
  signatureFile?: { url: string; name: string } | null;
  expertStatus: string;
}

export default function AdminAgreements() {
  const [agreements, setAgreements] = useState<AgreementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<AgreementRecord | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      // Fetch signed agreements (or pass filter=all if needed)
      const res = await axios.get('/api/admin/agreements');
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to load expert agreements');
      }
      setAgreements(res.data.agreements || []);
      setLoadError(null);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error fetching admin agreements:', error);
      setLoadError('Expert agreements could not be loaded. Check your connection and try again.');
      toast.error('Failed to load expert agreements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgreements();
  }, []);

  // Filtered & Searched list
  const filteredAgreements = useMemo(() => {
    return agreements.filter((rec) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const normalizedStatus = (rec.expertStatus || '').toUpperCase();
        if (statusFilter === 'VERIFIED' && normalizedStatus !== 'VERIFIED') return false;
        if (statusFilter === 'PENDING' && normalizedStatus !== 'PENDING') return false;
        if (statusFilter === 'REJECTED' && normalizedStatus !== 'REJECTED') return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (rec.name || '').toLowerCase();
      const email = (rec.email || '').toLowerCase();
      const company = (rec.company || '').toLowerCase();
      const title = (rec.title || '').toLowerCase();
      const signedBy = (rec.signedBy || '').toLowerCase();

      return (
        name.includes(q) ||
        email.includes(q) ||
        company.includes(q) ||
        title.includes(q) ||
        signedBy.includes(q)
      );
    });
  }, [agreements, statusFilter, searchQuery]);

  // Analytics Metrics
  const stats = useMemo(() => {
    const total = agreements.length;
    const verified = agreements.filter(
      (a) => (a.expertStatus || '').toLowerCase() === 'verified'
    ).length;
    const pending = agreements.filter(
      (a) => (a.expertStatus || '').toLowerCase() === 'pending'
    ).length;

    const companies = new Set(
      agreements
        .map((a) => (a.company || '').trim())
        .filter((c) => c && c !== 'Not specified')
    );

    return {
      total,
      verified,
      pending,
      uniqueCompanies: companies.size,
    };
  }, [agreements]);

  const handleOpenPdf = (record: AgreementRecord) => {
    setSelectedRecord(record);
    setPdfLoadError(false);
    setPdfModalOpen(true);
  };

  const handleOpenDetails = (record: AgreementRecord) => {
    setSelectedRecord(record);
    setDetailsModalOpen(false);
    setDetailsModalOpen(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not recorded';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPdfUrl = (record: AgreementRecord | null) => {
    if (!record) return '';
    const raw = record.agreementPdf?.url || record.signatureFile?.url || '';
    return getProfileImageUrl(raw);
  };

  const getSignatureUrl = (record: AgreementRecord | null) => {
    if (!record) return '';
    const raw = record.signatureFile?.url || '';
    return getProfileImageUrl(raw);
  };

  if (loading && !hasLoaded) {
    return <AdminPageSkeleton variant="agreements" rows={6} columns={5} />;
  }

  if (loadError && !hasLoaded) {
    return (
      <AdminPageError
        title="Agreements unavailable"
        message={loadError}
        onRetry={fetchAgreements}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#004fcb] flex items-center justify-center border border-blue-100 shadow-sm">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Expert Agreements & Compliance
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Review signed service agreements, employer non-conflict statements, and proof of work declarations.
              </p>
            </div>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError} Previously loaded agreements are still shown.</span>
            <button type="button" onClick={fetchAgreements} className="font-semibold underline" disabled={loading}>Retry</button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAgreements}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
            title="Refresh agreements list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#004fcb]' : 'text-gray-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Signed
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#004fcb] flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">Experts with active signed agreements</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Verified Mentors
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">{stats.verified}</div>
            <p className="text-xs text-gray-500 mt-1">Fully approved & verified with signed agreement</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending Review
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
            <p className="text-xs text-gray-500 mt-1">Signed agreement awaiting profile verification</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Companies
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-700">{stats.uniqueCompanies}</div>
            <p className="text-xs text-gray-500 mt-1">Unique employers declared in agreements</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by expert, company, designation, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#004fcb]/20 focus:border-[#004fcb] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-[#004fcb] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Agreements ({agreements.length})
          </button>
          <button
            onClick={() => setStatusFilter('VERIFIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'VERIFIED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Verified ({stats.verified})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending ({stats.pending})
          </button>
        </div>
      </div>

      {/* Main Agreements Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredAgreements.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 text-[#004fcb] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <FileSignature className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No agreements found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No signed expert agreements match your search "${searchQuery}".`
                : 'No experts have signed the platform agreement yet.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Expert Details</th>
                  <th className="px-6 py-4">Company & Designation</th>
                  <th className="px-6 py-4">Signed Date & Signer</th>
                  <th className="px-6 py-4">Compliance Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredAgreements.map((rec) => {
                  const pdfUrl = getPdfUrl(rec);
                  const isVerified = (rec.expertStatus || '').toLowerCase() === 'verified';
                  const isPending = (rec.expertStatus || '').toLowerCase() === 'pending';

                  return (
                    <tr
                      key={rec._id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Expert Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getProfileImageUrl(rec.profileImage, rec.name)}
                            alt={rec.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/media/avatars/300-1.png';
                            }}
                          />
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-[#004fcb] transition-colors">
                              {rec.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{rec.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company & Designation */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[200px]" title={rec.company}>
                              {rec.company || 'Not Specified'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[200px]" title={rec.title}>
                              {rec.title || 'Expert'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Signed Date & Signer */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{formatDate(rec.signedAt)}</span>
                          </div>
                          {rec.signedBy && (
                            <div className="text-xs text-gray-500">
                              Signed as: <span className="font-medium text-gray-800">{rec.signedBy}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Compliance Status */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          {/* Agreement signed badge */}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span>Agreement Signed</span>
                          </div>

                          {/* Profile verification status */}
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                isVerified
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              Profile: {rec.expertStatus}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {pdfUrl ? (
                            <button
                              onClick={() => handleOpenPdf(rec)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#004fcb] text-white hover:bg-[#003bb5] rounded-lg text-xs font-semibold shadow-sm transition-all"
                              title="View Agreement PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View PDF</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No PDF attached</span>
                          )}

                          <button
                            onClick={() => handleOpenDetails(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                            title="Inspect details & declarations"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF VIEWER MODAL */}
      {pdfModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#004fcb] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    Expert Service Agreement
                    <span className="text-xs font-normal text-gray-500">
                      • {selectedRecord.name}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Signed on {formatDate(selectedRecord.signedAt)} for {selectedRecord.company}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPdfModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors ml-1"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Dedicated PDF Viewer without auto-download */}
            <div className="flex-1 overflow-hidden relative bg-slate-100">
              {getPdfUrl(selectedRecord) ? (
                <PdfViewer
                  url={getPdfUrl(selectedRecord)}
                  fileName={selectedRecord.agreementPdf?.name || `Mockeefy_Agreement_${selectedRecord.name}.pdf`}
                  className="h-full border-0 rounded-none shadow-none"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-white">
                  <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
                  <h4 className="font-semibold text-gray-900 text-base">No PDF attached</h4>
                  <p className="text-sm text-gray-500 max-w-md mt-1">
                    This expert has signed the agreement, but no PDF file URL was recorded.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-2.5 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Legally binding platform terms signed via Mockeefy Digital Signature.</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Signer: <strong className="text-gray-700">{selectedRecord.signedBy || selectedRecord.name}</strong></span>
                <span>•</span>
                <span>Company: <strong className="text-gray-700">{selectedRecord.company}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED INSPECTION MODAL */}
      {detailsModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getProfileImageUrl(selectedRecord.profileImage, selectedRecord.name)}
                  alt={selectedRecord.name}
                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedRecord.name}</h3>
                  <p className="text-xs text-gray-500">{selectedRecord.email}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Employment Profile */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Declared Employment Details
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500">Current Employer / Company</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedRecord.company}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Job Title / Designation</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedRecord.title}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Signed Full Name</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedRecord.signedBy || selectedRecord.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Date & Time of Signature</span>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(selectedRecord.signedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Verified Declarations */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Signed Compliance Declarations
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-emerald-950">
                        Employer Non-Conflict & Moonlighting Warranty
                      </h5>
                      <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                        The expert confirmed that mentoring and conducting practice interviews on Mockeefy does not violate any employment contract, dual employment clause, or non-compete obligation with their working company ({selectedRecord.company}).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-blue-950">
                        Readiness to Submit Proof of Employment
                      </h5>
                      <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                        The expert declared they are in possession of valid proof of working (such as an official company ID, offer letter, or work email verification) and ready to present it to Mockeefy administrators upon request.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-purple-950">
                        Confidentiality & Non-Disclosure (IP Protection)
                      </h5>
                      <p className="text-xs text-purple-800 mt-0.5 leading-relaxed">
                        The expert agreed not to disclose proprietary code, live internal interview questions, or confidential intellectual property from their working employer.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Signature Preview if exists */}
              {selectedRecord.signatureFile?.url && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Digital Signature File
                  </h4>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={getSignatureUrl(selectedRecord)}
                        alt="Signature Preview"
                        className="h-12 max-w-[160px] object-contain bg-white px-3 py-1 rounded border border-gray-200"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-800">
                          {selectedRecord.signatureFile.name || 'Digital Signature'}
                        </p>
                        <p className="text-[11px] text-gray-400">Attached to generated agreement</p>
                      </div>
                    </div>
                    <a
                      href={getSignatureUrl(selectedRecord)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#004fcb] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Full
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  handleOpenPdf(selectedRecord);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#004fcb] text-white hover:bg-[#003bb5] rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>Open Agreement PDF</span>
              </button>

              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-medium transition-colors"
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
