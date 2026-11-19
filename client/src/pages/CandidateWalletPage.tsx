import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { useDataSync } from "../context/SocketContext";
import { toast } from "sonner";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Undo2,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";

interface WalletData {
  availableBalance: number;
  frozenBalance: number;
  currency: string;
  totalCredited: number;
  totalSpent: number;
  totalRefunded: number;
  pendingCredits: number;
  transactionCount: number;
}

interface WalletTxn {
  _id: string;
  type: "CREDIT" | "DEBIT" | "FREEZE" | "UNFREEZE";
  amount: number;
  paymentId?: string;
  orderId?: string;
  sessionId?: string;
  reason?: string;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export default function CandidateWalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If logged-in user is an expert, redirect to expert earnings
  if (user?.userType?.toLowerCase() === "expert") {
    return <Navigate to="/dashboard/withdraw" replace />;
  }

  const [wallet, setWallet] = useState<WalletData>({
    availableBalance: 0,
    frozenBalance: 0,
    currency: "INR",
    totalCredited: 0,
    totalSpent: 0,
    totalRefunded: 0,
    pendingCredits: 0,
    transactionCount: 0,
  });

  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");

  const formatCurrency = (val: number) => {
    const rounded = Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
    return rounded.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  const fetchWalletDetails = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [balanceRes, txnsRes] = await Promise.all([
        axios.get("/api/wallet/balance"),
        axios.get("/api/wallet/transactions?limit=50"),
      ]);

      if (balanceRes.data?.success && balanceRes.data.data) {
        setWallet(balanceRes.data.data);
      }

      if (txnsRes.data?.success && Array.isArray(txnsRes.data.data)) {
        setTransactions(txnsRes.data.data);
      }
    } catch (err: any) {
      console.error("[CandidateWalletPage] Error fetching wallet data:", err);
      toast.error("Failed to load wallet data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletDetails();
  }, [fetchWalletDetails]);

  // Real-time synchronization for wallet balance and transactions
  useDataSync(["WALLET_UPDATED", "RECONNECTED"], (payload) => {
    if (payload.data && typeof payload.data.availableBalance === "number") {
      setWallet(prev => ({ ...prev, availableBalance: payload.data.availableBalance }));
    }
    fetchWalletDetails(true);
  });

  const filteredTxns = transactions.filter((t) => {
    if (filterType === "ALL") return true;
    return t.type === filterType;
  });

  return (
    <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-xs overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">
      {/* Decorative ambient blue lighting */}
      <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-[#0755E8] flex items-center justify-center shadow-2xs shrink-0">
              <Wallet size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Candidate Wallet</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-[#0755E8] border border-blue-200/80">
                  Credits
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage your platform credits and view your interview booking transaction ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => fetchWalletDetails(true)}
              disabled={refreshing}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-[#0755E8]" : ""} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <Link
              to="/find-mentor"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0755E8] hover:bg-[#0645C7] rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles size={14} />
              <span>Book an Interview</span>
            </Link>
          </div>
        </div>

        {/* Balance & Statistics Cards (3-column layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Available Balance Card */}
          <div className="bg-gradient-to-br from-[#0755E8] to-[#043399] rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                  Available Balance
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-xs">
                  Active
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight">
                  ₹{formatCurrency(wallet.availableBalance)}
                </span>
                <span className="text-xs font-medium text-blue-200 uppercase">INR</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100">
              <span>Ready to spend on bookings</span>
              <Link to="/find-mentor" className="underline hover:text-white font-semibold">
                Use now →
              </Link>
            </div>
          </div>

          {/* Total Credited */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Credited
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{formatCurrency(wallet.totalCredited)}
                </span>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-500">
              From cutoff safeties & credits
            </p>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[160px] sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Spent
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-slate-900">
                  ₹{formatCurrency(wallet.totalSpent)}
                </span>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-500">
              Applied toward interview sessions
            </p>
          </div>
        </div>

        {/* Safety & Educational Card */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-[#0755E8] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">100% Candidate Money Safety Guarantee</h4>
              <p className="text-[11.5px] text-slate-600 mt-0.5 leading-relaxed">
                If an interview slot reaches the 10-minute cutoff or is booked concurrently by another candidate before your session confirms, your payment is 100% protected and immediately credited here. You can apply your balance toward any session booking across Mockeefy with instant 1-click checkout.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <Link
              to="/refund-cancellation"
              className="text-xs font-semibold text-[#0755E8] hover:underline inline-flex items-center gap-1"
            >
              <span>Refund Policy</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Transactions Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {/* Table Header & Filter Tabs */}
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Transaction History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent, immutable ledger of all wallet transactions
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto">
              {(["ALL", "CREDIT", "DEBIT"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    filterType === type
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {type === "ALL" ? "All" : type === "CREDIT" ? "Credits" : "Debits"}
                </button>
              ))}
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-[#0755E8] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Loading ledger transactions...</p>
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Wallet size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Transactions Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Your wallet is empty. Credits from expired booking cutoffs or refunds will appear here.
              </p>
              <div className="mt-5">
                <Link
                  to="/find-mentor"
                  className="px-4 py-2 bg-[#0755E8] text-white text-xs font-semibold rounded-xl hover:bg-[#0645C7] transition-all shadow-xs inline-flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>Explore Interview Experts</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto thin-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3 px-5">Type</th>
                    <th className="py-3 px-5">Amount</th>
                    <th className="py-3 px-5">Description & Reference</th>
                    <th className="py-3 px-5">Date & Time</th>
                    <th className="py-3 px-5">Balance After</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTxns.map((t) => {
                    const isCredit = t.type === "CREDIT";
                    const isDebit = t.type === "DEBIT";
                    const dateFormatted = new Date(t.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Type Badge */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : "bg-amber-50 text-amber-700 border border-amber-200/60"
                            }`}
                          >
                            {isCredit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            {t.type}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-5 font-bold whitespace-nowrap">
                          <span
                            className={
                              t.status === "REVERSED"
                                ? "text-slate-400 line-through"
                                : isCredit
                                ? "text-emerald-600"
                                : "text-slate-800"
                            }
                          >
                            {isCredit ? "+" : "-"}₹{formatCurrency(t.amount)}
                          </span>
                        </td>

                        {/* Description & Reference */}
                        <td className="py-3.5 px-5 max-w-xs min-w-[200px]">
                          <p className="font-semibold text-slate-800 line-clamp-1">{t.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10.5px] text-slate-500">
                            {t.paymentId && (
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                {t.paymentId}
                              </span>
                            )}
                            {t.orderId && (
                              <span className="font-mono text-slate-400">
                                Order: {t.orderId.substring(0, 16)}...
                              </span>
                            )}
                            {t.sessionId && (
                              <span className="text-[#0755E8] font-semibold">
                                Session: {t.sessionId}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">
                          {dateFormatted}
                        </td>

                        {/* Balance After */}
                        <td className="py-3.5 px-5 font-semibold text-slate-700 whitespace-nowrap">
                          ₹{formatCurrency(t.balanceAfter)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {t.status === "REVERSED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200">
                              <Undo2 size={12} className="text-slate-500" />
                              Reversed
                            </span>
                          ) : t.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                              <Clock size={12} className="text-amber-600" />
                              Processing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
