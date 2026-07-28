import { useEffect, useState } from "react";
import { Award, Plus, Trash2, Calendar, Link as LinkIcon, Edit2 } from "lucide-react";
import { toast } from "sonner";
import axios from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";

interface Certification {
    _id?: string;
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
}

interface CertificationsSectionProps {
    profileData: any;
    onUpdate: () => void;
}

export default function CertificationsSection({ profileData, onUpdate }: CertificationsSectionProps) {
    const { user } = useAuth();
    const userId = user?.id || user?._id || user?.userId;
    const [isEditing, setIsEditing] = useState(false);
    const [certifications, setCertifications] = useState<Certification[]>(profileData?.certifications || []);
    const [loading, setLoading] = useState(false);

    const [currentCert, setCurrentCert] = useState<Certification>({
        name: "",
        issuer: "",
        issueDate: "",
        expiryDate: "",
        credentialId: "",
        credentialUrl: ""
    });

    const [editIndex, setEditIndex] = useState<number | null>(null);

    useEffect(() => {
        setCertifications(profileData?.certifications || []);
    }, [profileData?.certifications]);

    const handleEdit = (index: number) => {
        const cert = certifications[index];
        setCurrentCert({
            ...cert,
            issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : "",
            expiryDate: cert.expiryDate ? new Date(cert.expiryDate).toISOString().split('T')[0] : ""
        });
        setEditIndex(index);
        setIsEditing(true);
    };

    const handleDelete = async (index: number) => {
        try {
            const updatedCerts = certifications.filter((_, i) => i !== index);
            setLoading(true);
            const res = await axios.put("/api/user/profile/certifications", {
                certifications: updatedCerts
            }, {
                headers: { userid: userId }
            });

            if (res.data.success) {
                setCertifications(updatedCerts);
                toast.success("Certification removed");
                onUpdate();
            }
        } catch (error) {
            toast.error("Failed to remove certification");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentCert.name || !currentCert.issuer || !currentCert.issueDate) {
            toast.error("Please fill required fields (Name, Issuer, Issue Date)");
            return;
        }

        try {
            setLoading(true);
            let updatedCerts = [...certifications];

            if (editIndex !== null) {
                updatedCerts[editIndex] = currentCert;
            } else {
                updatedCerts.push(currentCert);
            }

            const res = await axios.put("/api/user/profile/certifications", {
                certifications: updatedCerts
            }, {
                headers: { userid: userId }
            });

            if (res.data.success) {
                setCertifications(updatedCerts);
                toast.success(editIndex !== null ? "Certification updated" : "Certification added");
                setIsEditing(false);
                setEditIndex(null);
                setCurrentCert({
                    name: "",
                    issuer: "",
                    issueDate: "",
                    expiryDate: "",
                    credentialId: "",
                    credentialUrl: ""
                });
                onUpdate();
            }
        } catch (error) {
            toast.error("Failed to save certification");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#004fcb] flex items-center justify-center border border-blue-100 shrink-0">
                        <Award className="w-4.5 h-4.5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Certifications</h2>
                        <p className="text-[13px] font-medium text-slate-500 mt-1">Add your professional certifications and licenses</p>
                    </div>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => {
                            setIsEditing(true);
                            setEditIndex(null);
                            setCurrentCert({
                                name: "",
                                issuer: "",
                                issueDate: "",
                                expiryDate: "",
                                credentialId: "",
                                credentialUrl: ""
                            });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all text-[12px] font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Add Certificate
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-slate-50 rounded-[28px] p-6 sm:p-7 border border-slate-200 animate-in fade-in slide-in-from-top-4 shadow-sm">
                    <h3 className="text-[15px] font-bold text-slate-800 mb-5">
                        {editIndex !== null ? "Edit Certification" : "Add New Certification"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-bold text-slate-700 ml-1">Name *</label>
                            <input
                                type="text"
                                value={currentCert.name}
                                onChange={(e) => setCurrentCert({ ...currentCert, name: e.target.value })}
                                className="w-full h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                placeholder="e.g. AWS Certified Solutions Architect"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-bold text-slate-700 ml-1">Issuing Organization *</label>
                            <input
                                type="text"
                                value={currentCert.issuer}
                                onChange={(e) => setCurrentCert({ ...currentCert, issuer: e.target.value })}
                                className="w-full h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                placeholder="e.g. Amazon Web Services"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-bold text-slate-700 ml-1">Issue Date *</label>
                            <input
                                type="date"
                                value={currentCert.issueDate}
                                onChange={(e) => setCurrentCert({ ...currentCert, issueDate: e.target.value })}
                                className="w-full h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-bold text-slate-700 ml-1">Expiration Date</label>
                            <input
                                type="date"
                                value={currentCert.expiryDate}
                                onChange={(e) => setCurrentCert({ ...currentCert, expiryDate: e.target.value })}
                                className="w-full h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-bold text-slate-700 ml-1">Credential ID</label>
                            <input
                                type="text"
                                value={currentCert.credentialId}
                                onChange={(e) => setCurrentCert({ ...currentCert, credentialId: e.target.value })}
                                className="w-full h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-bold text-slate-700 ml-1">Credential URL</label>
                            <input
                                type="url"
                                value={currentCert.credentialUrl}
                                onChange={(e) => setCurrentCert({ ...currentCert, credentialUrl: e.target.value })}
                                className="w-full h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none placeholder:text-slate-400"
                                placeholder="https://"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-5 py-2.5 text-[13px] font-bold text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2.5 text-[13px] font-bold text-white bg-gradient-to-r from-[#004fcb] to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl disabled:opacity-50 shadow-lg shadow-blue-500/20 transition-all"
                        >
                            {loading ? "Saving..." : "Save Certification"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {certifications.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-200 hover:border-blue-200 transition-colors">
                            <Award className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                            <p className="text-slate-600 text-sm">No certifications added yet</p>
                        </div>
                    ) : (
                        certifications.map((cert, index) => (
                            <div key={index} className="relative group flex items-start justify-between p-5 bg-gradient-to-b from-[#f0f5ff]/40 via-white to-white border border-slate-200 rounded-[28px] hover:border-blue-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
                                {/* Decorative gradient glow */}
                                <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-blue-100/30 via-indigo-100/25 to-transparent blur-2xl pointer-events-none" />
                                <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#f0f5ff]/40 to-transparent pointer-events-none" />
                                <div className="flex gap-4">
                                    <div className="mt-1 p-2 bg-blue-50 rounded-2xl text-[#004fcb]">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{cert.name}</h4>
                                        <p className="text-sm text-gray-600">{cert.issuer}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                                            </div>
                                            {cert.expiryDate && (
                                                <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                                            )}
                                            {cert.credentialUrl && (
                                                <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#004fcb] hover:underline">
                                                    <LinkIcon className="w-3 h-3" />
                                                    Show Credential
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(index)}
                                        className="p-2 text-gray-400 hover:text-[#004fcb] hover:bg-blue-50 rounded-2xl transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(index)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
