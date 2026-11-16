import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";
import { useDataSync } from "../context/SocketContext";
import { toast } from "sonner";
import Swal from "sweetalert2";
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
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#0755E8]/10 text-[#0755E8] flex items-center justify-center shadow-xs">
                <Wallet size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Wallet</h1>
                <p className="text-xs text-slate-500">
                  Manage your platform credits and view your interview booking transaction ledger.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
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
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0755E8] hover:bg-[#0645C7] rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Book an Interview</span>
            </Link>
          </div>
        </div>

        {/* Balance & Statistics Cards (3-column layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Available Balance Card */}
          <div className="bg-gradient-to-br from-[#0755E8] to-[#043399] rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
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
                  ₹{wallet.availableBalance.toLocaleString("en-IN")}
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
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
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
                  ₹{wallet.totalCredited.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-500">
              From cutoff safeties & credits
            </p>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
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
                  ₹{wallet.totalSpent.toLocaleString("en-IN")}
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
                If an interview slot reaches the 10-minute cutoff before your payment is captured, your funds are automatically protected and credited here. You can apply your balance toward any future session booking across Mockeefy.
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                        <td className="py-3.5 px-5">
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
                        <td className="py-3.5 px-5 font-bold">
                          <span className={isCredit ? "text-emerald-600" : "text-slate-800"}>
                            {isCredit ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Description & Reference */}
                        <td className="py-3.5 px-5 max-w-xs">
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
                        <td className="py-3.5 px-5 font-semibold text-slate-700">
                          ₹{t.balanceAfter.toLocaleString("en-IN")}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            {t.status === "PENDING" ? "Processing" : "Completed"}
                          </span>
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
