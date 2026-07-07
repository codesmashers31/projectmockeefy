import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "../../lib/axios";
import { toast } from "sonner";
import {
  Wallet,
  ArrowUpRight,
  Landmark,
  Smartphone,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface PayoutMethod {
  _id: string;
  type: 'bank' | 'upi' | 'wallet';
  details: {
    accountNumber?: string;
    ifscCode?: string;
    accountName?: string;
    upiId?: string;
  };
  isDefault: boolean;
}

interface Summary {
  currentBalance: number;
  frozenBalance: number;
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
}

interface PayoutHistory {
  _id: string;
  amount: number;
  status: string;
  createdAt: string;
  methodId?: {
    type: string;
    details: any;
  };
  payoutMethodType?: string;
  accountNumber?: string;
  upiId?: string;
  razorpayPayoutId?: string;
  failureReason?: string;
  adminRemarks?: string;
}

export default function WithdrawalPage() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [summary, setSummary] = useState<Summary>({
    currentBalance: 0,
    frozenBalance: 0,
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [history, setHistory] = useState<PayoutHistory[]>([]);
  const [withdrawalMode, setWithdrawalMode] = useState<'saved' | 'manual'>('saved');
  const [manualMethodType, setManualMethodType] = useState<'bank' | 'upi'>('bank');
  const [manualDetails, setManualDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: ''
  });

  // Add Method State
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'bank' | 'upi'>('bank');
  const [newMethodDetails, setNewMethodDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountName: '',
    upiId: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [addingMethod, setAddingMethod] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = user?.id || user?._id;
      const [summaryRes, methodsRes, historyRes] = await Promise.all([
        axios.get(`/api/payouts/summary/${userId}`),
        axios.get(`/api/payouts/methods/${userId}`),
        axios.get(`/api/payouts/history/${userId}`)
      ]);

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
      if (methodsRes.data.success) {
        setMethods(methodsRes.data.data);
        const defaultMethod = methodsRes.data.data.find((m: PayoutMethod) => m.isDefault);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod._id);
        } else if (methodsRes.data.data.length > 0) {
          setSelectedMethodId(methodsRes.data.data[0]._id);
        }
      }
      if (historyRes.data.success) {
        setHistory(historyRes.data.data);
      }
    } catch (error) {
      console.error("Error fetching payout details:", error);
      toast.error("Failed to load payout details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleWithdraw = async () => {
    if (!amount || amount < 5) {
      toast.error("Minimum withdrawal amount is ₹5");
      return;
    }
    if (amount > summary.currentBalance) {
      toast.error("Insufficient balance.");
      return;
    }

    // Check if there is already a pending payout request in history
    const hasPending = history.some(p => ['PENDING', 'PROCESSING', 'HOLD'].includes(p.status));
    if (hasPending) {
      toast.error("You already have an active payout request in processing. Please wait until Wednesday for its resolution.");
      return;
    }

    const payload: any = {
      expertId: user?.id || user?._id,
      amount: Number(amount)
    };

    if (withdrawalMode === 'saved') {
      if (!selectedMethodId) {
        toast.error("Please select a saved payout method.");
        return;
      }
      payload.methodId = selectedMethodId;
    } else {
      payload.payoutMethodType = manualMethodType;
      if (manualMethodType === 'bank') {
        if (!manualDetails.accountNumber || !manualDetails.ifscCode || !manualDetails.accountHolderName) {
          toast.error("Please fill in all manual bank account details.");
          return;
        }
        payload.accountNumber = manualDetails.accountNumber;
        payload.ifscCode = manualDetails.ifscCode;
        payload.accountHolderName = manualDetails.accountHolderName;
      } else {
        if (!manualDetails.upiId) {
          toast.error("Please enter a valid manual UPI ID.");
          return;
        }
        payload.upiId = manualDetails.upiId;
      }
    }

    try {
      setWithdrawing(true);
      const res = await axios.post('/api/payouts/request', payload);

      if (res.data.success) {
        toast.success("Withdrawal request submitted! Payouts are manually reviewed and processed every Wednesday.");
        setAmount('');
        setManualDetails({ accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '' });
        fetchData(); // Refresh balances
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || "Failed to initiate withdrawal.";
      toast.error(errorMessage);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSetDefault = async (methodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`/api/payouts/method/${methodId}/default`, {
        userId: user?.id || user?._id
      });
      if (res.data.success) {
        toast.success("Default method updated.");
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update default method.");
    }
  };

  const handleSendOtp = async () => {
    if (newMethodType === 'bank') {
      if (!newMethodDetails.accountNumber || !newMethodDetails.ifscCode || !newMethodDetails.accountName) {
        return toast.error("Please fill in all bank details.");
      }
    } else {
      if (!newMethodDetails.upiId) {
        return toast.error("Please enter a valid UPI ID.");
      }
    }

    try {
      setAddingMethod(true);
      const res = await axios.post('/api/auth/send-otp', {
        email: user?.email,
        type: 'payout'
      });
      if (res.data.success) {
        setOtpSent(true);
        toast.success("OTP sent to your registered email.");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP.");
    } finally {
      setAddingMethod(false);
    }
  };

  const handleAddMethod = async () => {
    if (!otp) {
      return toast.error("Please enter the OTP.");
    }

    try {
      setAddingMethod(true);
      const payload = {
        userId: user?.id || user?._id,
        email: user?.email,
        otp,
        type: newMethodType,
        details: newMethodType === 'bank' ? {
          accountNumber: newMethodDetails.accountNumber,
          ifscCode: newMethodDetails.ifscCode,
          accountName: newMethodDetails.accountName
        } : {
          upiId: newMethodDetails.upiId
        },
        isDefault: methods.length === 0
      };

      const res = await axios.post('/api/payouts/method', payload);
      
      if (res.data.success) {
        toast.success("Payout method added securely!");
        setIsAddingMethod(false);
        setOtpSent(false);
        setOtp('');
        setNewMethodDetails({ accountNumber: '', ifscCode: '', accountName: '', upiId: '' });
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add payout method. Invalid OTP.");
    } finally {
      setAddingMethod(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 bg-white min-h-full font-sans p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Earnings & Withdrawals</h1>
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-full">
              <Wallet className="w-3 h-3 text-blue-600" />
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Payouts</span>
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-500">Manage your payout methods and withdraw your wallet balance.</p>
        </div>
      </div>

      {/* Weekly Payout Policy Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
          <Clock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-blue-900">Weekly Wednesday Payout Policy</h4>
          <p className="text-xs sm:text-sm text-blue-700 leading-relaxed font-medium">
            Payout requests are verified, audited, and processed manually every week on **Wednesday** after validating completed sessions and payment settlements. To receive your payout this week, please submit your withdrawal request before Wednesday 10:00 AM IST. Payouts are manually audited to maintain platform ledger security.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-400 hover:ring-1 hover:ring-emerald-400 transition-all duration-300 flex flex-col min-w-0 h-[160px]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">Available Balance</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">₹{summary.currentBalance.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100/50 text-emerald-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
            <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5">
               <AlertCircle className="w-4 h-4" /> Min: ₹5
            </span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
               Frozen: ₹{(summary.frozenBalance || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 hover:ring-1 hover:ring-blue-400 transition-all duration-300 flex flex-col min-w-0 h-[160px]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">Total Earnings</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">₹{summary.totalEarnings.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-100/50 text-blue-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-slate-50">
            <span className="text-sm font-medium text-slate-500">
               All time earnings
            </span>
          </div>
        </div>

        <div className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 hover:ring-1 hover:ring-amber-400 transition-all duration-300 flex flex-col min-w-0 h-[160px]">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-2">Pending Payouts</p>
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">₹{summary.pendingPayouts.toLocaleString()}</h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-100/50 text-amber-600 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-slate-50">
            <span className="text-sm font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md inline-block">
               Processing
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Withdrawal Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <div className="p-2 bg-slate-50 rounded-lg">
              <ArrowUpRight className="w-5 h-5 text-slate-700" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Request Withdrawal</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount (₹)</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount (min ₹5)"
                className="w-full text-xl font-bold text-slate-900 border border-slate-300 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:font-medium placeholder:text-slate-400 font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Withdrawal Mode</label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setWithdrawalMode('saved')}
                  className={`flex-1 text-xs sm:text-sm font-bold py-2 rounded-lg transition-all ${
                    withdrawalMode === 'saved'
                      ? 'bg-white text-slate-950 shadow-sm shadow-slate-200'
                      : 'text-slate-500 hover:text-slate-950 hover:bg-slate-200/30'
                  }`}
                >
                  Use Saved Method
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawalMode('manual')}
                  className={`flex-1 text-xs sm:text-sm font-bold py-2 rounded-lg transition-all ${
                    withdrawalMode === 'manual'
                      ? 'bg-white text-slate-950 shadow-sm shadow-slate-200'
                      : 'text-slate-500 hover:text-slate-950 hover:bg-slate-200/30'
                  }`}
                >
                  Enter Manually
                </button>
              </div>
            </div>

            {withdrawalMode === 'saved' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Select Payout Method</label>
                {methods.length === 0 ? (
                  <div className="text-sm text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200 flex items-start gap-2">
                     <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                     <p>You need to add a payout method before withdrawing.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {methods.map(method => (
                      <div 
                        key={method._id} 
                        onClick={() => setSelectedMethodId(method._id)}
                        className={`cursor-pointer p-4 border rounded-xl flex items-center justify-between transition-all ${selectedMethodId === method._id ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${method.type === 'bank' ? 'bg-indigo-100/50 text-indigo-600' : 'bg-emerald-100/50 text-emerald-600'}`}>
                            {method.type === 'bank' ? <Landmark size={20} /> : <Smartphone size={20} />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                              {method.type === 'bank' ? 'Bank Transfer' : 'UPI Transfer'}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {method.type === 'bank' ? `A/c ending in ${method.details.accountNumber?.slice(-4)}` : method.details.upiId}
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMethodId === method._id ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`}>
                          {selectedMethodId === method._id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Payout Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={manualMethodType === 'bank'} 
                        onChange={() => setManualMethodType('bank')} 
                        className="text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="text-sm font-semibold text-slate-700">Bank Transfer</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        checked={manualMethodType === 'upi'} 
                        onChange={() => setManualMethodType('upi')} 
                        className="text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="text-sm font-semibold text-slate-700">UPI ID</span>
                    </label>
                  </div>
                </div>

                {manualMethodType === 'bank' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Holder Name</label>
                      <input 
                        type="text" 
                        value={manualDetails.accountHolderName} 
                        onChange={e => setManualDetails({...manualDetails, accountHolderName: e.target.value})} 
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900" 
                        placeholder="e.g. John Doe" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Bank Account Number</label>
                      <input 
                        type="text" 
                        value={manualDetails.accountNumber} 
                        onChange={e => setManualDetails({...manualDetails, accountNumber: e.target.value})} 
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900" 
                        placeholder="e.g. 1234567890" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">IFSC Code</label>
                      <input 
                        type="text" 
                        value={manualDetails.ifscCode} 
                        onChange={e => setManualDetails({...manualDetails, ifscCode: e.target.value})} 
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900" 
                        placeholder="e.g. SBIN0001234" 
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">UPI ID</label>
                    <input 
                      type="text" 
                      value={manualDetails.upiId} 
                      onChange={e => setManualDetails({...manualDetails, upiId: e.target.value})} 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-900" 
                      placeholder="e.g. john@upi" 
                    />
                  </div>
                )}
              </div>
            )}

            {history.some(p => ['PENDING', 'PROCESSING', 'HOLD'].includes(p.status)) && (
              <div className="text-xs text-red-750 bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-2.5">
                 <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                 <p className="font-semibold leading-relaxed">
                   Active Request Pending: You already have a pending withdrawal request in auditing. Further requests are blocked until the current request is resolved.
                 </p>
              </div>
            )}

            <button 
              onClick={handleWithdraw}
              disabled={withdrawing || history.some(p => ['PENDING', 'PROCESSING', 'HOLD'].includes(p.status)) || (withdrawalMode === 'saved' && methods.length === 0)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-bold py-3.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {withdrawing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>Withdraw Funds</>
              )}
            </button>

            <div className="mt-6 pt-5 border-t border-slate-100">
               <div className="flex gap-2 items-start text-xs text-slate-500 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                  <p>
                    <strong className="text-slate-700">Important Note:</strong> Please ensure your selected bank or UPI details are absolutely correct. We process payouts automatically to the selected method and are not responsible for funds lost due to incorrect account information.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Payout Methods Management */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Landmark className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Payout Methods</h3>
            </div>
            {!isAddingMethod && (
              <button 
                onClick={() => setIsAddingMethod(true)}
                className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Add New
              </button>
            )}
          </div>

          <div className="space-y-3">
             {methods.length === 0 ? (
               <div className="text-center py-8 px-4 bg-slate-50 border border-slate-100 rounded-xl">
                 <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                 <p className="text-sm text-slate-500 font-medium">No payout methods available.</p>
               </div>
             ) : (
               methods.map(method => (
                 <div key={method._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${method.type === 'bank' ? 'bg-indigo-100/50 text-indigo-600' : 'bg-emerald-100/50 text-emerald-600'}`}>
                          {method.type === 'bank' ? <Landmark size={20} /> : <Smartphone size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900">{method.type === 'bank' ? 'Bank Account' : 'UPI'}</p>
                          {method.isDefault && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Default</span>
                          )}
                        </div>
                        <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                          {method.type === 'bank' ? `${method.details.accountName} (..${method.details.accountNumber?.slice(-4)})` : method.details.upiId}
                        </p>
                      </div>
                    </div>
                    
                    {!method.isDefault && (
                      <button 
                        onClick={(e) => handleSetDefault(method._id, e)}
                        className="text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
                      >
                        Make Default
                      </button>
                    )}
                 </div>
               ))
             )}
          </div>

          {isAddingMethod && (
            <div className="mt-6 border border-slate-200 rounded-xl p-5 bg-slate-50 relative">
              <button 
                onClick={() => { setIsAddingMethod(false); setOtpSent(false); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <h4 className="font-bold text-slate-900 mb-4">Add Payout Method</h4>
              
              {!otpSent ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Method Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={newMethodType === 'bank'} onChange={() => setNewMethodType('bank')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Bank Account</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={newMethodType === 'upi'} onChange={() => setNewMethodType('upi')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">UPI ID</span>
                      </label>
                    </div>
                  </div>
                  
                  {newMethodType === 'bank' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                        <input type="text" value={newMethodDetails.accountNumber} onChange={e => setNewMethodDetails({...newMethodDetails, accountNumber: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. 1234567890" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                        <input type="text" value={newMethodDetails.ifscCode} onChange={e => setNewMethodDetails({...newMethodDetails, ifscCode: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. SBIN0001234" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                        <input type="text" value={newMethodDetails.accountName} onChange={e => setNewMethodDetails({...newMethodDetails, accountName: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. John Doe" />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID</label>
                      <input type="text" value={newMethodDetails.upiId} onChange={e => setNewMethodDetails({...newMethodDetails, upiId: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. john@upi" />
                    </div>
                  )}

                  <button 
                    onClick={handleSendOtp}
                    disabled={addingMethod}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg mt-2 transition-colors disabled:opacity-50"
                  >
                    {addingMethod ? "Sending OTP..." : "Send Verification OTP"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm flex gap-2">
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p>OTP sent to <strong>{user?.email}</strong>. Please check your inbox.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enter 6-digit OTP</label>
                    <input 
                      type="text" 
                      value={otp} 
                      onChange={e => setOtp(e.target.value)} 
                      maxLength={6}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center tracking-widest text-lg font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      placeholder="••••••" 
                    />
                  </div>
                  <button 
                    onClick={handleAddMethod}
                    disabled={addingMethod || otp.length < 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg mt-2 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {addingMethod ? "Verifying..." : "Verify & Save Method"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payout History Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mt-8 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Recent Payouts</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                    No payout history found.
                  </td>
                </tr>
              ) : (
                history.map((payout) => (
                  <tr key={payout._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(payout.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{payout.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {payout.methodId ? (
                        <div className="flex items-center gap-2">
                          {payout.methodId.type === 'bank' ? <Landmark className="w-4 h-4 text-indigo-500" /> : <Smartphone className="w-4 h-4 text-emerald-500" />}
                          <span className="text-slate-600 font-medium">
                            {payout.methodId.type === 'bank' ? `Bank (..${payout.methodId.details?.accountNumber?.slice(-4) || ''})` : 'UPI'}
                          </span>
                        </div>
                      ) : payout.payoutMethodType ? (
                        <div className="flex items-center gap-2">
                          {payout.payoutMethodType === 'bank' ? <Landmark className="w-4 h-4 text-indigo-500" /> : <Smartphone className="w-4 h-4 text-emerald-500" />}
                          <span className="text-slate-600 font-medium">
                            {payout.payoutMethodType === 'bank' ? `Bank (..${payout.accountNumber?.slice(-4) || ''})` : 'UPI'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                        ${(payout.status === 'COMPLETED' || payout.status === 'PAID') ? 'bg-emerald-100 text-emerald-700' : 
                          (payout.status === 'FAILED' || payout.status === 'REVERSED' || payout.status === 'REJECTED') ? 'bg-red-100 text-red-700' : 
                          'bg-amber-100 text-amber-700'}`}
                      >
                        {(payout.status === 'COMPLETED' || payout.status === 'PAID') ? <CheckCircle className="w-3.5 h-3.5" /> : 
                         (payout.status === 'FAILED' || payout.status === 'REJECTED') ? <XCircle className="w-3.5 h-3.5" /> : 
                         <Clock className="w-3.5 h-3.5" />}
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {payout.razorpayPayoutId && (
                        <div className="mb-1">
                          <span className="font-semibold text-slate-700">Ref:</span> {payout.razorpayPayoutId}
                        </div>
                      )}
                      {payout.adminRemarks && (
                        <div className="mb-1 font-medium text-slate-700">
                          <span className="font-semibold">Note:</span> {payout.adminRemarks}
                        </div>
                      )}
                      {payout.failureReason && (
                        <div className="text-red-600 font-medium">
                          {payout.failureReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
