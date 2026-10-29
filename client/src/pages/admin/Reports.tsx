import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle, FileText, RefreshCw, Search } from 'lucide-react';
import axios from '../../lib/axios';
import AdminPageSkeleton, { AdminPageError } from '../../components/AdminPageSkeleton';

interface Report {
    id: string; // _id
    expertName: string;
    candidateName: string;
    date: string;
    status: 'Draft' | 'Submitted';
    scores: {
        total: number; // calculated or stored
    };
    category: string;
    certificateId?: string;
}

export default function Reports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await axios.get('/api/admin/reports');
            if (!res.data.success || !Array.isArray(res.data.reports)) {
                throw new Error(res.data.message || 'Invalid reports response');
            }
            setReports(res.data.reports);
            setHasLoaded(true);
        } catch (error) {
            console.error('Failed to load admin reports:', error);
            setLoadError('Reports could not be loaded. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const filteredReports = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return reports;
        return reports.filter(report =>
            report.candidateName.toLowerCase().includes(query)
            || report.expertName.toLowerCase().includes(query)
            || report.category.toLowerCase().includes(query)
        );
    }, [reports, searchQuery]);

    if (loading && !hasLoaded) {
        return <AdminPageSkeleton variant="table" rows={6} columns={5} />;
    }

    if (loadError && !hasLoaded) {
        return (
            <AdminPageError
                title="Reports unavailable"
                message={loadError}
                onRetry={fetchReports}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Certifications</h1>
                    <p className="text-gray-500 mt-1">Review interview performance and issue certificates.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchReports} disabled={loading} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} type="search" placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004fcb]" />
                    </div>
                </div>
            </div>

            {loadError && (
                <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
                    <span>{loadError} Previously loaded reports are still shown.</span>
                    <button type="button" onClick={fetchReports} className="font-semibold underline" disabled={loading}>Retry</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Candidate & Expert</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Session Details</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredReports.map((report) => (
                            <tr key={report.id} className="hover:bg-blue-50/10 transition-colors">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-bold text-gray-900">{report.candidateName}</p>
                                        <p className="text-xs text-gray-500">Interviewed by <span className="text-gray-700">{report.expertName}</span></p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{report.category}</span>
                                        <span className="text-xs text-gray-400">{report.date}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {report.status === 'Submitted' ? (
                                        <span className={`font-bold ${report.scores.total >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                                            {report.scores.total}%
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${report.status === 'Submitted' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {report.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 tooltip" title="View Full Report">
                                            <FileText className="w-4 h-4" />
                                        </button>
                                        {report.status === 'Submitted' && (
                                            report.certificateId ? (
                                                <button className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100">
                                                    <CheckCircle className="w-3 h-3" /> Issued
                                                </button>
                                            ) : (
                                                <span title="Certificate issuing is not available for admin reports yet" className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-400">
                                                    <Award className="w-3 h-3" /> Not issued
                                                </span>
                                            )
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredReports.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                                    {searchQuery ? 'No reports match your search.' : 'No interview reports have been submitted yet.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
