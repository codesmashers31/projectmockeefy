import { useEffect, useState } from "react";
import { Save, Plus, X, Code, Heart, Globe } from "lucide-react";
import axios from '../../lib/axios';
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

interface SkillsSectionProps {
    profileData: {
        skills?: {
            technical?: string[];
            soft?: string[];
            languages?: string[];
        };
    } | null;
    onUpdate: () => void;
}

export default function SkillsSection({ profileData, onUpdate }: SkillsSectionProps) {
    const { user } = useAuth();
    const userId = user?.id || user?._id || user?.userId;
    const [skills, setSkills] = useState<{ technical: string[], soft: string[], languages: string[] }>({
        technical: profileData?.skills?.technical || [],
        soft: profileData?.skills?.soft || [],
        languages: profileData?.skills?.languages || []
    });
    const [newSkill, setNewSkill] = useState({ technical: "", soft: "", languages: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSkills({
            technical: profileData?.skills?.technical || [],
            soft: profileData?.skills?.soft || [],
            languages: profileData?.skills?.languages || []
        });
    }, [profileData?.skills]);

    const addSkill = (type: "technical" | "soft" | "languages") => {
        if (newSkill[type].trim()) {
            setSkills({
                ...skills,
                [type]: [...skills[type], newSkill[type].trim()]
            });
            setNewSkill({ ...newSkill, [type]: "" });
        }
    };

    const removeSkill = (type: "technical" | "soft" | "languages", index: number) => {
        setSkills({
            ...skills,
            [type]: skills[type].filter((_, i) => i !== index)
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await axios.put(
                "/api/user/profile/skills",
                skills,
                { headers: { userid: userId } }
            );

            if (response.data.success) {
                toast.success("Skills updated successfully!");
                onUpdate();
            }
        } catch (error) {
            console.error("Error updating skills:", error);
            toast.error("Failed to update skills");
        } finally {
            setSaving(false);
        }
    };

    const SkillTag = ({ skill, onRemove }: { skill: string, onRemove: () => void }) => (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-[#004fcb] rounded-full text-[11px] font-bold border border-blue-100">
            {skill}
            <button
                onClick={onRemove}
                className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
            >
                <X className="w-3 h-3" />
            </button>
        </span>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-500 max-w-4xl">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#004fcb] flex items-center justify-center border border-blue-100 shrink-0">
                    <Code className="w-4.5 h-4.5" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Skills & Languages</h2>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">Add your technical skills, soft skills, and languages</p>
                </div>
            </div>

            {/* Technical Skills */}
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-[28px] p-5 sm:p-6 hover:border-blue-100 transition-colors">
                <div className="flex items-center gap-2">
                    <Code className="w-5 h-5 text-[#004fcb]" />
                    <h3 className="text-sm font-bold text-elite-black">Technical Skills</h3>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSkill.technical}
                        onChange={(e) => setNewSkill({ ...newSkill, technical: e.target.value })}
                        onKeyPress={(e) => e.key === "Enter" && addSkill("technical")}
                        className="flex-1 h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="e.g., React, Python, AWS"
                    />
                    <button
                        onClick={() => addSkill("technical")}
                        className="flex items-center gap-2 px-4 h-12 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 text-[13px] font-bold shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {skills.technical.map((skill, index) => (
                        <SkillTag
                            key={index}
                            skill={skill}
                            onRemove={() => removeSkill("technical", index)}
                        />
                    ))}
                    {skills.technical.length === 0 && (
                        <p className="text-slate-500 text-[11px]">No technical skills added yet</p>
                    )}
                </div>
            </div>

            {/* Soft Skills */}
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-[28px] p-5 sm:p-6 hover:border-blue-100 transition-colors">
                <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-[#004fcb]" />
                    <h3 className="text-sm font-bold text-elite-black">Soft Skills</h3>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSkill.soft}
                        onChange={(e) => setNewSkill({ ...newSkill, soft: e.target.value })}
                        onKeyPress={(e) => e.key === "Enter" && addSkill("soft")}
                        className="flex-1 h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="e.g., Leadership, Communication, Teamwork"
                    />
                    <button
                        onClick={() => addSkill("soft")}
                        className="flex items-center gap-2 px-4 h-12 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 text-[13px] font-bold shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {skills.soft.map((skill, index) => (
                        <SkillTag
                            key={index}
                            skill={skill}
                            onRemove={() => removeSkill("soft", index)}
                        />
                    ))}
                    {skills.soft.length === 0 && (
                        <p className="text-slate-500 text-[11px]">No soft skills added yet</p>
                    )}
                </div>
            </div>

            {/* Languages */}
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-[28px] p-5 sm:p-6 hover:border-blue-100 transition-colors">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#004fcb]" />
                    <h3 className="text-sm font-bold text-elite-black">Languages</h3>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSkill.languages}
                        onChange={(e) => setNewSkill({ ...newSkill, languages: e.target.value })}
                        onKeyPress={(e) => e.key === "Enter" && addSkill("languages")}
                        className="flex-1 h-12 px-4 border border-slate-200 bg-white hover:bg-slate-50 focus:bg-white rounded-2xl text-[14px] focus:border-[#004fcb] focus:ring-4 focus:ring-[#004fcb]/10 transition-all font-medium text-slate-800 outline-none placeholder:text-slate-400"
                        placeholder="e.g., English, Spanish, Mandarin"
                    />
                    <button
                        onClick={() => addSkill("languages")}
                        className="flex items-center gap-2 px-4 h-12 bg-gradient-to-r from-[#004fcb] to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 text-[13px] font-bold shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {skills.languages.map((skill, index) => (
                        <SkillTag
                            key={index}
                            skill={skill}
                            onRemove={() => removeSkill("languages", index)}
                        />
                    ))}
                    {skills.languages.length === 0 && (
                        <p className="text-slate-500 text-[11px]">No languages added yet</p>
                    )}
                </div>
            </div>

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
