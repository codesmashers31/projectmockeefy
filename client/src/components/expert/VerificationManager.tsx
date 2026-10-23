import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import { 
    Upload, 
    FileText, 
    CheckCircle, 
    AlertCircle, 
    Save, 
    ExternalLink, 
    ShieldCheck, 
    KeyRound, 
    ArrowRight, 
    RotateCcw,
    Lock,
    Edit3,
    CheckCircle2,
    Info
} from 'lucide-react';
import { compressImage } from '../../lib/imageUtils';

interface VerificationDocs {
    companyId?: { url: string; name: string };
    aadhar?: { 
        url?: string; 
        name?: string;
        number?: string;
        isVerified?: boolean;
        verifiedAt?: string;
        nameOnAadhaar?: string;
        referenceId?: string;
    };
    linkedin?: string;
}

export default function VerificationManager() {
    const [verification, setVerification] = useState<VerificationDocs>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isEditing, setIsEditing] = useState(false);

    // Form states for non-Aadhaar verification
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [companyFile, setCompanyFile] = useState<File | null>(null);
    const companyInputRef = useRef<HTMLInputElement>(null);

    const [, setSearchParams] = useSearchParams();
    const goToPersonalTab = () => setSearchParams({ tab: 'personal' });

    // Aadhaar Verification states
    const [aadhaarInput, setAadhaarInput] = useState('');
    const [accountName, setAccountName] = useState('');
    const [verificationError, setVerificationError] = useState('');
    const [otpInput, setOtpInput] = useState('');
    const [otpReferenceId, setOtpReferenceId] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [maskedMobileNotice, setMaskedMobileNotice] = useState('');
    const [isReverifyingAadhaar, setIsReverifyingAadhaar] = useState(false);

    const cleanAccountName = (accountName || '').replace(/\s*\((expert|coach|mentor|candidate|admin|user)\)\s*/gi, '').trim();
    const isSingleName = cleanAccountName ? cleanAccountName.split(/\s+/).filter(Boolean).length < 2 : false;

    useEffect(() => {
        fetchVerificationStatus();
    }, []);

    // OTP Resend Countdown Timer
    useEffect(() => {
        let timer: any;
        if (isOtpSent && otpCountdown > 0) {
            timer = setInterval(() => {
                setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isOtpSent, otpCountdown]);

    const fetchVerificationStatus = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/expert/profile');
            if (res.data.success) {
                const v = res.data.profile.verification || {};
                setVerification(v);
                setLinkedinUrl(v.linkedin || '');
                if (res.data.profile.name) {
                    const cleaned = (res.data.profile.name || '').replace(/\s*\((expert|coach|mentor|candidate|admin|user)\)\s*/gi, '').trim();
                    setAccountName(cleaned);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load verification details");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 1 * 1024 * 1024) {
                toast.error("File size must be below 1MB. Please upload a smaller file.");
                return;
            }
            setCompanyFile(file);
        }
    };

    // Format Aadhaar with spaces: XXXX XXXX XXXX
    const handleAadhaarInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
        const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
        setAadhaarInput(formatted);
    };

    // Reset verification and open re-verification form
    const handleStartReverify = async () => {
        try {
            await axios.post('/api/expert/verification/aadhar/reset');
            setVerification((prev) => ({
                ...prev,
                aadhar: { isVerified: false }
            }));
        } catch (e) {
            console.error("Reset Aadhaar error:", e);
        }
        setIsReverifyingAadhaar(true);
        setIsOtpSent(false);
        setAadhaarInput('');
        setOtpInput('');
        setVerificationError('');
    };

    // Send OTP to Aadhaar registered mobile
    const handleSendAadhaarOtp = async () => {
        setVerificationError('');
        const cleanAadhaar = aadhaarInput.replace(/\s/g, '');
        if (cleanAadhaar.length !== 12) {
            const msg = "Please enter a valid 12-digit Aadhaar card number.";
            setVerificationError(msg);
            toast.error(msg);
            return;
        }

        // Rule: Check name matching
        if (isSingleName) {
            const msg = "Name in Aadhaar is not same as profile name. Please update your name in Personal Details.";
            setVerificationError(msg);
            toast.error(msg);
            return;
        }

        try {
            setSendingOtp(true);
            const res = await axios.post('/api/expert/verification/aadhar/send-otp', {
                aadhaarNumber: cleanAadhaar
            });

            if (res.data.success) {
                setOtpReferenceId(res.data.referenceId);
                setIsOtpSent(true);
                setOtpCountdown(60);
                setVerificationError('');
                const notice = res.data.message || `OTP sent to mobile registered with Aadhaar ending in ${cleanAadhaar.slice(-4)}.`;
                setMaskedMobileNotice(notice);
                toast.success(notice);

                // If running in development/mock mode, display helpful dev OTP notice
                if (res.data.devOtp) {
                    toast.info(`[Dev OTP] Your test code is: ${res.data.devOtp}`, { duration: 15000 });
                }
            }
        } catch (error: any) {
            console.error("Send Aadhaar OTP error:", error);
            const msg = error.response?.data?.message || "Failed to send OTP to registered mobile. Please check your Aadhaar details.";
            setVerificationError(msg);
            toast.error(msg, { duration: 8000 });
        } finally {
            setSendingOtp(false);
        }
    };

    // Verify OTP submitted by user
    const handleVerifyAadhaarOtp = async () => {
        setVerificationError('');
        const cleanOtp = otpInput.trim();
        if (cleanOtp.length !== 6) {
            toast.error("Please enter the complete 6-digit OTP received on your mobile.");
            return;
        }

        const cleanAadhaar = aadhaarInput.replace(/\s/g, '');

        try {
            setVerifyingOtp(true);
            const res = await axios.post('/api/expert/verification/aadhar/verify-otp', {
                referenceId: otpReferenceId,
                otp: cleanOtp,
                aadhaarNumber: cleanAadhaar
            });

            if (res.data.success) {
                toast.success("Aadhaar verified successfully! Identity authenticated.");
                setVerification((prev) => ({
                    ...prev,
                    aadhar: res.data.aadhar
                }));
                // Reset OTP form state
                setIsOtpSent(false);
                setOtpInput('');
                setAadhaarInput('');
                setIsReverifyingAadhaar(false);
                setVerificationError('');
                if (res.data.aadhar?.nameOnAadhaar) {
                    setAccountName(res.data.aadhar.nameOnAadhaar);
                }
            }
        } catch (error: any) {
            console.error("Verify Aadhaar OTP error:", error);
            const msg = error.response?.data?.message || "Invalid or expired OTP. Please try again.";
            setVerificationError(msg);
            toast.error(msg, { duration: 8000 });
        } finally {
            setVerifyingOtp(false);
        }
    };

    // Save Company ID and LinkedIn changes
    const handleSubmit = async () => {
        if (!companyFile && linkedinUrl === (verification.linkedin || '')) {
            toast.info("No changes to save");
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);
            const formData = new FormData();

            if (linkedinUrl) formData.append('linkedin', linkedinUrl);
            if (companyFile) {
                const compressedCompany = await compressImage(companyFile);
                formData.append('companyIdFile', compressedCompany);
            }

            const res = await axios.put('/api/expert/verification', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percentCompleted);
                }
            });

            if (res.data.success) {
                toast.success("Verification details updated successfully");
                setVerification(res.data.verification);
                setCompanyFile(null);
                if (companyInputRef.current) companyInputRef.current.value = '';
                setIsEditing(false);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload verification documents");
        } finally {
            setUploading(false);
        }
    };

    const StatusBadge = ({ isUploaded, label = "Pending" }: { isUploaded: boolean; label?: string }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isUploaded
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
            {isUploaded ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {isUploaded ? "Verified" : label}
        </span>
    );

    const isAadhaarVerified = Boolean(verification.aadhar?.isVerified);

    if (loading) return <div className="p-8 text-center text-gray-400">Loading details...</div>;

    return (
        <div className="w-full">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6 bg-white">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Expert Verification</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Verify your identity and work credentials to gain instant trust from mentees.</p>
                </div>
            </div>

            <div className="space-y-8">
                {/* LinkedIn Profile URL */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold text-gray-700">LinkedIn Profile URL</label>
                    <div className="flex gap-4">
                        <input
                            type="url"
                            disabled={!isEditing}
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                            placeholder="https://linkedin.com/in/your-profile"
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#004fcb] focus:border-[#004fcb] outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200"
                        />
                    </div>
                    {verification.linkedin && (
                        <a href={verification.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#004fcb] hover:underline">
                            <ExternalLink className="w-4 h-4" />
                            View Current Profile
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Company ID / Offer Letter */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-gray-700">Company ID / Offer Letter</label>
                            <StatusBadge isUploaded={!!verification.companyId?.url} label="Uploaded" />
                        </div>

                        <div
                            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors min-h-[220px] ${
                              isEditing
                                ? companyFile
                                  ? "border-[#004fcb] bg-blue-50/10"
                                  : "border-gray-200 hover:border-gray-300 bg-gray-50/50 cursor-pointer"
                                : "border-gray-200 bg-gray-50/50"
                            }`}
                        >
                            {isEditing && (
                                <input
                                    ref={companyInputRef}
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="company-upload"
                                />
                            )}

                            {verification.companyId?.url && !companyFile ? (
                                <div className="space-y-2">
                                    <FileText className="w-10 h-10 text-emerald-600 mx-auto" />
                                    <p className="text-sm font-medium text-gray-900">{verification.companyId.name || 'Document Uploaded'}</p>
                                    <a href={verification.companyId.url} target="_blank" rel="noreferrer" className="text-xs text-[#004fcb] hover:underline block font-semibold">View Document</a>
                                    {isEditing && (
                                        <label htmlFor="company-upload" className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer block mt-2 underline">Replace File</label>
                                    )}
                                </div>
                            ) : companyFile ? (
                                <div className="space-y-2">
                                    <FileText className="w-10 h-10 text-[#004fcb] mx-auto" />
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{companyFile.name}</p>
                                    {isEditing && (
                                        <button onClick={() => setCompanyFile(null)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove Selection</button>
                                    )}
                                </div>
                            ) : isEditing ? (
                                <label htmlFor="company-upload" className="cursor-pointer space-y-2 w-full h-full flex flex-col items-center justify-center">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-gray-700">Click to upload</p>
                                        <p className="text-xs text-gray-500">PDF, PNG, JPG up to 1MB</p>
                                    </div>
                                </label>
                            ) : (
                                <div className="space-y-2 py-4">
                                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                                    <p className="text-sm font-medium text-gray-500">No document uploaded yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Aadhaar OTP Card Verification (NO DOCUMENT UPLOAD) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-gray-700">Aadhaar Verification</label>
                            <StatusBadge isUploaded={isAadhaarVerified} label="Not Verified" />
                        </div>

                        {/* CASE 1: Aadhaar Already Verified */}
                        {isAadhaarVerified && !isReverifyingAadhaar ? (
                            <div className="border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white rounded-xl p-6 flex flex-col justify-between min-h-[220px] shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-xs">
                                            <ShieldCheck className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-gray-900 text-sm">Aadhaar Verified</h3>
                                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">Verified via official Aadhaar OTP</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-4 bg-white/90 border border-emerald-100 rounded-lg p-3.5 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <Lock className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Aadhaar Number</p>
                                            <p className="text-base font-mono font-bold text-gray-800 tracking-wider">
                                                {verification.aadhar?.number || "•••• •••• ••••"}
                                            </p>
                                        </div>
                                    </div>
                                    {verification.aadhar?.nameOnAadhaar && (
                                        <div className="text-right">
                                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Name</p>
                                            <p className="text-xs font-semibold text-gray-700">{verification.aadhar.nameOnAadhaar}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-emerald-100/60">
                                    <span className="text-[11px] text-gray-500">
                                        {verification.aadhar?.verifiedAt 
                                            ? `Verified on ${new Date(verification.aadhar.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                            : 'Identity successfully authenticated'
                                        }
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleStartReverify}
                                        className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium hover:underline cursor-pointer"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" /> Re-verify
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* CASE 2: Aadhaar Not Verified OR Re-verifying */
                            <div className="border border-gray-200 bg-white rounded-xl p-6 min-h-[220px] flex flex-col justify-between shadow-xs">
                                {!isOtpSent ? (
                                    /* Step 1: Enter Full Name and 12-digit Aadhaar Card Number */
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#004fcb] flex items-center justify-center font-bold text-xs">
                                                1
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">Aadhaar Identity Details</h4>
                                                <p className="text-xs text-gray-500">OTP will be sent after identity & uniqueness checks pass</p>
                                            </div>
                                        </div>

                                        {/* Aadhaar Card Number Input */}
                                        <div className="space-y-1.5 pt-1">
                                            <label className="block text-xs font-bold text-gray-700">
                                                Aadhaar Card Number <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={aadhaarInput}
                                                    onChange={(e) => {
                                                        handleAadhaarInputChange(e);
                                                        if (verificationError) setVerificationError('');
                                                    }}
                                                    placeholder="XXXX XXXX XXXX"
                                                    maxLength={14}
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-base font-mono tracking-widest text-gray-900 focus:ring-2 focus:ring-[#004fcb] focus:border-[#004fcb] outline-none transition-all placeholder:text-gray-300"
                                                />
                                                <ShieldCheck className="w-5 h-5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                            </div>
                                            <p className="text-[11px] text-gray-500">
                                                12-digit unique number. One Aadhaar card can only be used by one person across Mockeefy.
                                            </p>
                                        </div>

                                        {/* Prominent Verification Error Alert */}
                                        {verificationError && (
                                            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 space-y-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                    <div className="space-y-1 flex-1">
                                                        <p className="font-bold text-red-900 text-xs">Verification Check Failed</p>
                                                        <p className="leading-relaxed text-[11.5px] text-red-800">{verificationError}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={goToPersonalTab}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        Update Name in Personal Details
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-2 flex items-center justify-between">
                                            {isReverifyingAadhaar ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsReverifyingAadhaar(false)}
                                                    className="text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            ) : (
                                                <span />
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSendAadhaarOtp}
                                                disabled={sendingOtp || aadhaarInput.replace(/\s/g, '').length !== 12}
                                                className="inline-flex items-center gap-2 bg-[#004fcb] hover:bg-[#003bb5] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                                            >
                                                {sendingOtp ? (
                                                    <>
                                                        <RotateCcw className="w-4 h-4 animate-spin" />
                                                        Sending OTP...
                                                    </>
                                                ) : (
                                                    <>
                                                        Send OTP
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Step 2: Enter 6-digit OTP */
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                                                    2
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900">Enter Verification OTP</h4>
                                                    <p className="text-xs text-gray-500">6-digit code sent to registered mobile</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsOtpSent(false);
                                                    setOtpInput('');
                                                }}
                                                className="text-xs text-[#004fcb] hover:underline font-medium cursor-pointer"
                                            >
                                                Change Number
                                            </button>
                                        </div>

                                        {maskedMobileNotice && (
                                            <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-800">
                                                {maskedMobileNotice}
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={otpInput}
                                                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    placeholder="Enter 6-digit OTP"
                                                    maxLength={6}
                                                    autoFocus
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-center text-lg font-mono tracking-[0.35em] text-gray-900 focus:ring-2 focus:ring-[#004fcb] focus:border-[#004fcb] outline-none transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-gray-300"
                                                />
                                                <KeyRound className="w-5 h-5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                            </div>
                                            <div className="flex items-center justify-between text-xs pt-1">
                                                <span className="text-gray-500">
                                                    {otpCountdown > 0 ? (
                                                        `Resend OTP in ${otpCountdown}s`
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={handleSendAadhaarOtp}
                                                            disabled={sendingOtp}
                                                            className="text-[#004fcb] font-semibold hover:underline cursor-pointer"
                                                        >
                                                            Resend OTP
                                                        </button>
                                                    )}
                                                </span>
                                                <span className="text-gray-400 text-[11px]">Valid for 10 mins</span>
                                            </div>
                                        </div>

                                        {/* Prominent Verification Error Alert */}
                                        {verificationError && (
                                            <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 space-y-2.5">
                                                <div className="flex items-start gap-2.5">
                                                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                                    <div className="space-y-1 flex-1">
                                                        <p className="font-bold text-red-900 text-xs">Verification Failed</p>
                                                        <p className="leading-relaxed text-[11.5px] text-red-800">{verificationError}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={goToPersonalTab}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                        Update Name in Personal Details
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-2 flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={handleVerifyAadhaarOtp}
                                                disabled={verifyingOtp || otpInput.trim().length !== 6}
                                                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                                            >
                                                {verifyingOtp ? (
                                                    <>
                                                        <RotateCcw className="w-4 h-4 animate-spin" />
                                                        Verifying OTP...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ShieldCheck className="w-4 h-4" />
                                                        Verify & Complete
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Company ID & LinkedIn Save Bar */}
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    {isEditing ? (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setCompanyFile(null);
                                    fetchVerificationStatus();
                                    setIsEditing(false);
                                }}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={uploading || (!companyFile && linkedinUrl === (verification.linkedin || ''))}
                                className="flex items-center gap-2 bg-[#004fcb] hover:bg-[#003bb5] text-white px-8 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 active:scale-95 cursor-pointer"
                            >
                                {uploading ? (
                                    <>Uploading ({uploadProgress}%)...</>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Verification Details
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="bg-[#004fcb] hover:bg-[#003bb5] text-white px-8 py-2.5 rounded-lg font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                            Edit Company ID & LinkedIn
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
