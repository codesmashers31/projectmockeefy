import { useState, useEffect } from 'react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import { Plus, Save, Award, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-white shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Skills & Expertise</h1>
                        <p className="text-gray-500 mt-1">Manage your professional skills to match with relevant candidates.</p>
                    </div>
                    <button
                        onClick={saveChanges}
                        disabled={saveLoading}
                        className="flex items-center gap-2 bg-[#004fcb] hover:bg-[#003bb5] text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-70 active:scale-95"
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
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <div className="space-y-8 max-w-5xl mx-auto">
                    {/* Selection Area */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
                            <h2 className="text-lg font-bold text-gray-900">Add New Skills</h2>
                            
                            {/* Search bar */}
                            <div className="relative max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search skills (e.g., React, Java, AWS)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#004fcb]/20 focus:border-[#004fcb] transition-all"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-semibold"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Skill Selection Grid */}
                        <div className="p-6">
                            <div className="min-h-[200px]">
                                {profileLoading ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                        <Award className="w-8 h-8 mb-2 opacity-50 animate-pulse" />
                                        <p className="text-sm font-medium">Loading available skills...</p>
                                    </div>
                                ) : Object.keys(skillsByCategory).length === 0 ? (
                                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-sm">No skills found matching your search</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {Object.entries(skillsByCategory).map(([catName, skills]) => {
                                            const displaySkills = skills.filter(s => !mySkills.some(ms => ms.skillId === s._id));
                                            if (displaySkills.length === 0) return null;

                                            return (
                                                <div key={catName} className="space-y-2">
                                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{catName}</h3>
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {displaySkills.map(skill => (
                                                            <button
                                                                key={skill._id}
                                                                onClick={() => addSkillObj(skill)}
                                                                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-[#004fcb] rounded-full text-xs font-semibold text-gray-700 hover:text-[#004fcb] transition-all active:scale-95 shadow-sm"
                                                            >
                                                                {skill.name}
                                                                <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#004fcb]" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {availableSkills.length > 0 && availableSkills.every(s => mySkills.some(ms => ms.skillId === s._id)) && (
                                            <div className="w-full text-center py-8 text-gray-400 text-sm">
                                                All available skills are already added to your profile!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Selected Skills Preview (The "My Skills" Section) */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            Your Selected Skills
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{mySkills.length}</span>
                        </h2>

                        {mySkills.length === 0 ? (
                            <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-3 text-gray-300">
                                    <Award className="w-6 h-6" />
                                </div>
                                <h3 className="text-gray-900 font-bold mb-1">No Skills Added</h3>
                                <p className="text-sm text-gray-500">Search and add skills above to build your profile.</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                <AnimatePresence>
                                    {mySkills.map((skill, index) => (
                                        <motion.div
                                            key={`${skill.skillId}-${index}`}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            layout
                                            className="group flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
                                        >
                                            <span className="text-sm font-semibold text-blue-900">
                                                {skill.name || 'Unknown Skill'}
                                            </span>
                                            <button
                                                onClick={() => removeSkill(index)}
                                                className="w-6 h-6 flex items-center justify-center rounded-full text-blue-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                title="Remove skill"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
