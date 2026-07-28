import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Briefcase } from "lucide-react";
import axios from '../../lib/axios';
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

interface Experience {
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
}

interface ExperienceSectionProps {
    profileData: {
        experience?: Experience[];
        preferences?: {
            experienceLevel?: string;
            jobType?: string;
            expectedSalary?: string | number;
            noticePeriod?: string;
            willingToRelocate?: boolean;
        };
    } | null;
    onUpdate: () => void;
}

export default function ExperienceSection({ profileData, onUpdate }: ExperienceSectionProps) {
    const { user } = useAuth();
    const userId = user?.id || user?._id || user?.userId;
    const [experience, setExperience] = useState<Experience[]>(profileData?.experience || []);
    const [experienceLevel, setExperienceLevel] = useState<string>(profileData?.preferences?.experienceLevel || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setExperience(profileData?.experience || []);
    }, [profileData?.experience]);

    useEffect(() => {
        setExperienceLevel(profileData?.preferences?.experienceLevel || "");
    }, [profileData?.preferences?.experienceLevel]);

    const addExperience = () => {
        setExperience([...experience, {
            company: "",
            position: "",
            startDate: "",
            endDate: "",
            current: false,
            description: ""
        }]);
    };

    const removeExperience = (index: number) => {
        setExperience(experience.filter((_, i) => i !== index));
    };

    const updateExperience = (index: number, field: keyof Experience, value: string | boolean) => {
        const updated = [...experience];
        updated[index] = { ...updated[index], [field]: value };
        setExperience(updated);
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Save only the selected experience level here.
            // Do not send other preference fields from this screen to avoid accidental overwrite.
            const prefPayload = { experienceLevel };

            await axios.put(
                "/api/user/profile/preferences",
                prefPayload,
                { headers: { userid: userId } }
            );

            const response = await axios.put(
                "/api/user/profile/experience",
                { experience },
                { headers: { userid: userId } }
            );

            if (response.data.success) {
                toast.success("Experience updated successfully!");
                onUpdate();
            }
        } catch (error) {
            console.error("Error updating experience:", error);
            toast.error("Failed to update experience");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#004fcb] flex items-center justify-center border border-blue-100 shrink-0">
                        <Briefcase className="w-4.5 h-4.5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Work Experience</h2>
                        <p className="text-[13px] font-medium text-slate-500 mt-1">Your professional background</p>
                    </div>
                </div>
                {experienceLevel !== "Fresher" && (
                    <button
                        onClick={addExperience}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all text-[12px] font-bold shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                    </button>
                )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-wide mb-2.5">Experience Type</label>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setExperienceLevel("Fresher")}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                            experienceLevel === "Fresher"
                                ? "bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        Fresher
                    </button>
                    <button
                        type="button"
                        onClick={() => setExperienceLevel("Experienced")}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                            experienceLevel === "Experienced"
                                ? "bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white border-transparent shadow-md shadow-blue-500/20"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                        Experienced
                    </button>
                </div>
                {experienceLevel === "Fresher" && (
                    <p className="text-[11px] text-slate-500 mt-2">
                        Fresher selected. Work experience entries are optional. You can keep this empty.
                    </p>
                )}
            </div>

            {experienceLevel !== "Fresher" && experience.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 bg-slate-50 rounded-[28px] hover:border-blue-200 transition-colors">
                    <Briefcase className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                    <p className="text-slate-600 text-sm">No experience added</p>
                    <button
                        onClick={addExperience}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add now
                    </button>
                </div>
            ) : experienceLevel !== "Fresher" ? (
                <div className="space-y-4">
                    {experience.map((exp, index) => (
                        <div key={index} className="relative bg-gradient-to-b from-[#f0f5ff]/40 via-white to-white border border-slate-200 rounded-[28px] p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden">
                            {/* Decorative gradient glow */}
                            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-blue-100/30 via-indigo-100/25 to-transparent blur-2xl pointer-events-none" />
                            <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#f0f5ff]/40 to-transparent pointer-events-none" />
                            <button
                                onClick={() => removeExperience(index)}
                                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={exp.company}
                                        onChange={(e) => updateExperience(index, "company", e.target.value)}
                                        className="w-full h-11 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-semibold text-slate-800 outline-none"
                                        placeholder="Google"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Position</label>
                                    <input
                                        type="text"
                                        value={exp.position}
                                        onChange={(e) => updateExperience(index, "position", e.target.value)}
                                        className="w-full h-11 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-semibold text-slate-800 outline-none"
                                        placeholder="Software Engineer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : ""}
                                        onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                                        className="w-full h-11 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-semibold text-slate-800 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : ""}
                                        onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                                        className="w-full h-11 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-semibold text-slate-800 outline-none disabled:opacity-50 disabled:bg-slate-50"
                                        disabled={exp.current}
                                    />
                                </div>

                                <div className="flex items-center md:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exp.current}
                                            onChange={(e) => updateExperience(index, "current", e.target.checked)}
                                            className="w-3.5 h-3.5 text-[#004fcb] border-slate-300 rounded focus:ring-0"
                                        />
                                        <span className="text-xs font-medium text-slate-600">Currently Working Here</span>
                                    </label>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Description</label>
                                    <textarea
                                        value={exp.description}
                                        onChange={(e) => updateExperience(index, "description", e.target.value)}
                                        rows={2}
                                        maxLength={500}
                                        className="w-full p-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none resize-none leading-relaxed"
                                        placeholder="Describe responsibilities..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {experienceLevel === "Fresher" && (
                <div className="text-center py-10 border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-[28px]">
                    <Briefcase className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                    <p className="text-slate-700 text-[15px] font-bold">Fresher Profile Selected</p>
                    <p className="text-slate-500 text-[13px] mt-1">No prior company experience required.</p>
                </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 text-[13px] font-bold shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
