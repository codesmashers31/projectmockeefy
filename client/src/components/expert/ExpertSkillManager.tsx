import { useState, useEffect } from 'react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import { Plus, Save, Award, X, Search } from 'lucide-react';
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

    const removeSkill = (index: number) => {
        const newSkills = [...mySkills];
        newSkills.splice(index, 1);
        setMySkills(newSkills);
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
        <div className="sidebar-main-card relative w-full max-w-[1200px] mx-auto rounded-2xl sm:rounded-[24px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left animate-in fade-in duration-200">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-5 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Skills &amp; Expertise</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Manage your professional skills to match with relevant candidates.</p>
                    </div>
                    <button
                        onClick={saveChanges}
                        disabled={saveLoading}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all disabled:opacity-70 active:scale-95 cursor-pointer shrink-0"
                    >
                        {saveLoading ? (
                            <>Saving...</>
                        ) : (
                            <>
                                <Save className="w-3.5 h-3.5" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>

                {/* Selection Area Card */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-3">
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">Add New Skills</h2>
                        
                        {/* Search bar */}
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search skills (e.g., React, Java, AWS)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Skill Selection Grid */}
                    <div className="p-4 sm:p-5">
                        <div className="min-h-[120px]">
                            {Object.keys(skillsByCategory).length === 0 ? (
                                <div className="h-36 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-xs sm:text-sm">No skills found matching your search</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(skillsByCategory).map(([catName, skills]) => {
                                        const displaySkills = skills.filter(s => !mySkills.some(ms => ms.skillId === s._id));
                                        if (displaySkills.length === 0) return null;

                                        return (
                                            <div key={catName} className="space-y-1.5">
                                                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{catName}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {displaySkills.map(skill => (
                                                        <button
                                                            key={skill._id}
                                                            onClick={() => addSkillObj(skill)}
                                                            className="group flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-500 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-700 transition-all active:scale-95 shadow-2xs cursor-pointer"
                                                        >
                                                            {skill.name}
                                                            <Plus className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {availableSkills.length > 0 && availableSkills.every(s => mySkills.some(ms => ms.skillId === s._id)) && (
                                        <div className="w-full text-center py-6 text-slate-400 text-xs sm:text-sm">
                                            All available skills are already added to your profile!
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Selected Skills Preview (The "My Skills" Section) */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-3.5 flex items-center gap-2">
                        Your Selected Skills
                        <span className="bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-full text-[11px] font-bold">{mySkills.length}</span>
                    </h2>

                    {mySkills.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xs mx-auto mb-2 text-slate-400">
                                <Award className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mb-0.5">No Skills Added</h3>
                            <p className="text-xs text-slate-500">Search and add skills above to build your profile.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <AnimatePresence>
                                {mySkills.map((skill, index) => (
                                    <motion.div
                                        key={`${skill.skillId}-${index}`}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        layout
                                        className="group flex items-center gap-1.5 pl-3 pr-1 py-1 bg-blue-50/80 border border-blue-200/80 rounded-lg shadow-2xs text-xs font-semibold text-blue-900 hover:border-blue-300 transition-all"
                                    >
                                        <span>
                                            {skill.name || 'Unknown Skill'}
                                        </span>
                                        <button
                                            onClick={() => removeSkill(index)}
                                            className="w-4 h-4 flex items-center justify-center rounded-md text-blue-400 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Remove skill"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
