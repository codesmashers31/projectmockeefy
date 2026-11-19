import { useState, useEffect } from 'react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import { Plus, Save, Award, X, Search, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExpertPageSkeleton from '../ExpertPageSkeleton';

interface Skill {
    _id: string;
    name: string;
    categoryId: {
        _id: string;
        name: string;
    } | string;
}

interface ExpertSkill {
    skillId: string;
    level: string;
    isEnabled: boolean;
    name?: string;
}

export default function ExpertSkillManager() {
    const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
    const [mySkills, setMySkills] = useState<ExpertSkill[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);

    // Initial Load: all active skills + expert profile
    useEffect(() => {
        const init = async () => {
            setProfileLoading(true);
            try {
                const [skillsRes, profileRes] = await Promise.all([
                    axios.get('/api/skills'),
                    axios.get('/api/expert/profile')
                ]);
                setAvailableSkills(Array.isArray(skillsRes.data) ? skillsRes.data : []);

                const profile = profileRes.data?.profile || {};
                const skills = profile.expertSkills || [];
                setMySkills(skills.map((s: any) => ({
                    skillId: s.skillId?._id || s.skillId,
                    name: s.skillId?.name || 'Unknown',
                    level: s.level || 'Intermediate',
                    isEnabled: s.isEnabled
                })));
            } catch (e) {
                console.error(e);
                toast.error("Failed to load skills profile");
            } finally {
                setProfileLoading(false);
            }
        };
        init();
    }, []);

    const addSkillObj = (skill: Skill) => {
        if (mySkills.some(s => s.skillId === skill._id)) {
            toast.warning(`"${skill.name}" is already added.`);
            return;
        }
        setMySkills(prev => [...prev, {
            skillId: skill._id,
            name: skill.name,
            level: 'Intermediate',
            isEnabled: true
        }]);
        toast.success(`Added ${skill.name}`);
    };

    const removeSkill = (skillId: string) => {
        setMySkills(prev => prev.filter(s => s.skillId !== skillId));
    };

    const saveChanges = async () => {
        setSaveLoading(true);
        try {
            const payload = mySkills.map(s => ({
                skillId: s.skillId,
                level: s.level || 'Intermediate',
                priceAdjustment: 0,
                isEnabled: s.isEnabled
            }));

            const res = await axios.put('/api/expert/myskills', { expertSkills: payload });

            // Update local state with populated data from server
            if (res.data) {
                setMySkills(res.data.map((s: any) => ({
                    skillId: s.skillId?._id || s.skillId,
                    name: s.skillId?.name || 'Unknown',
                    level: s.level || 'Intermediate',
                    isEnabled: s.isEnabled
                })));
            }

            toast.success("Skills profile updated successfully");
        } catch (e) {
            toast.error("Failed to save skills");
        } finally {
            setSaveLoading(false);
        }
    };

    // Filter available skills
    const filteredSkills = availableSkills.filter(skill => {
        const nameMatch = skill.name.toLowerCase().includes(searchTerm.toLowerCase());
        const catName = typeof skill.categoryId === 'object' && skill.categoryId
            ? (skill.categoryId as any).name || ''
            : '';
        const categoryMatch = catName.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || categoryMatch;
    });

    // Grouping by category
    const skillsByCategory: { [key: string]: Skill[] } = {};
    filteredSkills.forEach(skill => {
        const catName = typeof skill.categoryId === 'object' && skill.categoryId
            ? (skill.categoryId as any).name || 'Other'
            : 'Other';
        if (!skillsByCategory[catName]) {
            skillsByCategory[catName] = [];
        }
        skillsByCategory[catName].push(skill);
    });

    if (profileLoading) return <ExpertPageSkeleton variant="skills" />;

    return (
        <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left animate-in fade-in duration-200">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

            {/* Content Layer */}
            <div className="relative z-10 space-y-6">
            {/* Header: Title & Save Changes Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            Skills &amp; Expertise
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200/90 text-xs font-bold shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0755E8]" />
                            <span>{mySkills.length} Selected</span>
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                        Manage your professional skills to match with relevant candidates.
                    </p>
                </div>
                <button
                    onClick={saveChanges}
                    disabled={saveLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-[#0755E8]/25 hover:shadow-md cursor-pointer whitespace-nowrap self-start sm:self-auto disabled:opacity-75"
                >
                    {saveLoading ? (
                        <>Saving...</>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            {/* Selected Skills Card (Prominent Top Section) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-[#0755E8] rounded-xl border border-blue-100">
                            <Award className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                Your Selected Skills
                            </h2>
                            <p className="text-xs text-slate-500">Skills visible on your mentor profile</p>
                        </div>
                    </div>
                    <span className="bg-blue-100/70 text-[#0755E8] border border-blue-200/70 px-3 py-1 rounded-full text-xs font-bold tabular-nums">
                        {mySkills.length} Skills Active
                    </span>
                </div>

                {mySkills.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xs mx-auto text-slate-400 border border-slate-200">
                            <Award className="w-5 h-5 text-[#0755E8]" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">No Skills Added Yet</h3>
                        <p className="text-xs text-slate-500">Search and pick skills from the catalog below to match candidate interview tracks.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 items-center min-h-[36px]">
                        <AnimatePresence mode="popLayout">
                            {mySkills.map((skill) => (
                                <motion.div
                                    key={skill.skillId}
                                    initial={{ opacity: 0, scale: 0.88 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.88 }}
                                    transition={{ duration: 0.18, ease: "easeOut" }}
                                    layout
                                    className="group flex items-center gap-2 pl-3.5 pr-2 py-1.5 bg-blue-50/90 border border-blue-200/90 rounded-full shadow-2xs text-xs font-bold text-[#0755E8] hover:border-blue-400 transition-colors"
                                >
                                    <span className="select-none">
                                        {skill.name || 'Unknown Skill'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removeSkill(skill.skillId);
                                        }}
                                        className="w-4.5 h-4.5 flex items-center justify-center rounded-full text-blue-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                                        title={`Remove ${skill.name || 'skill'}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Catalog & Search Section */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-6 text-left">
                {/* Search Bar Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Add New Skills</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Explore categories and click to add to your profile</p>
                    </div>

                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search skills (e.g., React, Java, AWS)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 border border-slate-200/90 rounded-xl text-xs sm:text-sm bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0755E8] transition-all shadow-2xs placeholder:text-slate-400 font-medium"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Skill Categories & Available Skill Chips */}
                <div>
                    {Object.keys(skillsByCategory).length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80">
                            <p className="text-xs sm:text-sm font-medium">No skills found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(skillsByCategory).map(([catName, skills]) => {
                                const displaySkills = skills.filter(s => !mySkills.some(ms => ms.skillId === s._id));
                                if (displaySkills.length === 0) return null;

                                return (
                                    <div key={catName} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/70">
                                                {catName}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-400">
                                                {displaySkills.length} available
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {displaySkills.map(skill => (
                                                <button
                                                    key={skill._id}
                                                    onClick={() => addSkillObj(skill)}
                                                    className="group flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-blue-50/90 border border-slate-200/90 hover:border-blue-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#0755E8] transition-all active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer"
                                                >
                                                    <span>{skill.name}</span>
                                                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0755E8] group-hover:scale-110 transition-transform" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {availableSkills.length > 0 && availableSkills.every(s => mySkills.some(ms => ms.skillId === s._id)) && (
                                <div className="w-full text-center py-6 text-slate-400 text-xs sm:text-sm font-medium">
                                    All available skills are already added to your profile!
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
    );
}
