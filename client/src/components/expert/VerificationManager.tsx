import { useEffect, useRef, useState } from 'react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import { useDataSync } from '../../context/SocketContext';
import { AlertCircle, ExternalLink, FileText, Save, Upload } from 'lucide-react';
import { compressImage } from '../../lib/imageUtils';
import ExpertPageSkeleton from '../ExpertPageSkeleton';

interface VerificationDocs {
    companyId?: { url: string; name: string };
    aadhar?: {
        number?: string;
        hash?: string;
        isVerified?: boolean;
    };
    linkedin?: string;
}

interface VerificationManagerProps {
    onUpdate?: () => void;
}

export default function VerificationManager({ onUpdate }: VerificationManagerProps) {
    const [verification, setVerification] = useState<VerificationDocs>({});
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [companyFile, setCompanyFile] = useState<File | null>(null);
    const [aadhaarInput, setAadhaarInput] = useState('');
    const companyInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchVerificationStatus();
    }, []);

    useDataSync('VERIFICATION_UPDATED', () => {
        fetchVerificationStatus();
    });

    const fetchVerificationStatus = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/expert/profile');
            if (res.data.success) {
                const details = res.data.profile.verification || {};
                setVerification(details);
                setLinkedinUrl(details.linkedin || '');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load verification details');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1 * 1024 * 1024) {
            toast.error('File size must be below 1MB. Please upload a smaller file.');
            return;
        }
        setCompanyFile(file);
    };

    const handleAadhaarInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
        setAadhaarInput(raw.replace(/(\d{4})(?=\d)/g, '$1 '));
    };

    const hasChanges = Boolean(
        companyFile ||
        linkedinUrl !== (verification.linkedin || '') ||
        aadhaarInput.trim()
    );

    const handleSubmit = async () => {
        const cleanAadhaar = aadhaarInput.replace(/\D/g, '');
        if (aadhaarInput && cleanAadhaar.length !== 12) {
            toast.error('Please enter a valid 12-digit Aadhaar number.');
            return;
        }
        if (!hasChanges) {
            toast.info('No changes to save');
            return;
        }

        try {
            setUploading(true);
            setUploadProgress(0);
            const formData = new FormData();

            if (linkedinUrl) formData.append('linkedin', linkedinUrl);
            if (cleanAadhaar) formData.append('aadhaarNumber', cleanAadhaar);
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
                toast.success('Verification details updated successfully');
                setVerification(res.data.verification);
                setCompanyFile(null);
                setAadhaarInput('');
                if (companyInputRef.current) companyInputRef.current.value = '';
                setIsEditing(false);
                onUpdate?.();
            }
        } catch (error: any) {
            console.error('Error saving verification details:', error);
            toast.error(error.response?.data?.message || 'Failed to save verification details');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <ExpertPageSkeleton variant="form" />;

    return (
        <div className="w-full">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6 bg-white">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Expert Verification</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Manage your work credentials and Aadhaar number.</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="space-y-3">
                    <label htmlFor="expert-linkedin" className="block text-sm font-bold text-gray-700">LinkedIn Profile URL</label>
                    <input
                        id="expert-linkedin"
                        type="url"
                        disabled={!isEditing}
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/your-profile"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#004fcb] focus:border-[#004fcb] outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200"
                    />
                    {verification.linkedin && (
                        <a href={verification.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#004fcb] hover:underline">
                            <ExternalLink className="w-4 h-4" />
                            View Current Profile
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-gray-700">Company ID / Offer Letter</label>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${verification.companyId?.url
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                {verification.companyId?.url ? 'Uploaded' : 'Not uploaded'}
                            </span>
                        </div>

                        <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors min-h-[220px] ${isEditing
                            ? companyFile
                                ? 'border-[#004fcb] bg-blue-50/10'
                                : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 cursor-pointer'
                            : 'border-gray-200 bg-gray-50/50'
                            }`}>
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
                                        <button type="button" onClick={() => setCompanyFile(null)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove Selection</button>
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

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label htmlFor="aadhaar-number" className="block text-sm font-bold text-gray-700">Aadhaar Number</label>
                            {verification.aadhar?.number && (
                                <span className="text-xs font-semibold text-emerald-700">Saved</span>
                            )}
                        </div>
                        <input
                            id="aadhaar-number"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={14}
                            disabled={!isEditing}
                            value={aadhaarInput}
                            onChange={handleAadhaarInputChange}
                            placeholder={verification.aadhar?.number || 'XXXX XXXX XXXX'}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono tracking-wider focus:ring-2 focus:ring-[#004fcb] focus:border-[#004fcb] outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200"
                        />
                        <p className="text-xs text-gray-500">
                            Enter your 12-digit number and save. For your privacy, we store only a masked number and a secure one-way hash; no OTP verification is needed.
                        </p>
                        {isEditing && verification.aadhar?.number && (
                            <p className="text-xs text-gray-500">Leave blank to keep the currently saved number.</p>
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    {isEditing ? (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setCompanyFile(null);
                                    setAadhaarInput('');
                                    setLinkedinUrl(verification.linkedin || '');
                                    setIsEditing(false);
                                    if (companyInputRef.current) companyInputRef.current.value = '';
                                }}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={uploading || !hasChanges}
                                className="flex items-center gap-2 bg-[#004fcb] hover:bg-[#003bb5] text-white px-8 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 active:scale-95 cursor-pointer"
                            >
                                {uploading ? (
                                    <>Saving ({uploadProgress}%)...</>
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
                            Edit Verification Details
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
