import { useState, useMemo } from 'react';
import { useResume } from '../../context/ResumeContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Plus, X, Sparkles, Check, Trash2, Award } from 'lucide-react';

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

const POPULAR_SKILLS = [
  { category: 'Frontend', skills: ['React', 'TypeScript', 'JavaScript', 'Next.js', 'Tailwind CSS', 'HTML5/CSS3'] },
  { category: 'Backend', skills: ['Node.js', 'Python', 'Express.js', 'Java', 'SQL', 'PostgreSQL', 'MongoDB'] },
  { category: 'Tools & DevOps', skills: ['Git & GitHub', 'Docker', 'AWS', 'REST APIs', 'GraphQL', 'CI/CD'] },
  { category: 'Soft & Professional', skills: ['System Architecture', 'Agile/Scrum', 'Problem Solving', 'Team Leadership'] },
];

const PROFICIENCY_COLORS = {
  beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
  advanced: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  expert: 'bg-violet-50 text-violet-700 border-violet-200',
};

export function SkillsForm() {
  const { resumeData, addSkill, updateSkill, removeSkill, nextStep, prevStep } = useResume();
  const [newSkill, setNewSkill] = useState('');
  const [proficiency, setProficiency] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('intermediate');
  const [errors, setErrors] = useState<string>('');

  // Safe normalized list of skills
  const skillsList = useMemo(() => {
    const raw = resumeData?.skills;
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any) => {
      if (typeof s === 'string') {
        return { id: generateId(), name: s, proficiency: 'intermediate' as const };
      }
      return {
        id: s.id || generateId(),
        name: s.name || '',
        proficiency: (s.proficiency || 'intermediate') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      };
    }).filter(s => s.name.trim().length > 0);
  }, [resumeData?.skills]);

  const existingSkillNamesLower = useMemo(() => {
    return new Set(skillsList.map(s => s.name.toLowerCase().trim()));
  }, [skillsList]);

  const handleAddSkill = (skillNameToAdd?: string, levelOverride?: 'beginner' | 'intermediate' | 'advanced' | 'expert') => {
    const targetName = (skillNameToAdd ?? newSkill).trim();
    const targetProficiency = levelOverride ?? proficiency;

    if (!targetName) {
      setErrors('Skill cannot be empty');
      return;
    }

    // Support comma-separated batch skills (e.g. "React, Node.js, SQL")
    if (targetName.includes(',')) {
      const parts = targetName.split(',').map(p => p.trim()).filter(Boolean);
      let addedAny = false;
      parts.forEach(p => {
        if (!existingSkillNamesLower.has(p.toLowerCase())) {
          addSkill({
            id: generateId(),
            name: p,
            proficiency: targetProficiency,
          });
          addedAny = true;
        }
      });
      if (!addedAny) {
        setErrors('All specified skills already exist');
        return;
      }
      setNewSkill('');
      setErrors('');
      return;
    }

    if (existingSkillNamesLower.has(targetName.toLowerCase())) {
      setErrors(`"${targetName}" is already in your skills list`);
      return;
    }

    addSkill({
      id: generateId(),
      name: targetName,
      proficiency: targetProficiency,
    });

    setNewSkill('');
    setProficiency('intermediate');
    setErrors('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 text-left font-sans"
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Skills & Competencies</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Highlight the technical proficiencies, tools, and frameworks relevant to your target roles.
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Add New Skill
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Input
              type="text"
              value={newSkill}
              onChange={(e) => {
                setNewSkill(e.target.value);
                if (errors) setErrors('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="e.g. React, TypeScript, Node.js (or comma-separated)"
              className="flex-1 bg-white border-slate-200 text-xs sm:text-sm focus:border-[#0755E8] focus:ring-[#93B8FF]/20"
            />
            <select
              value={proficiency}
              onChange={(e) => setProficiency(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#0755E8] focus:ring-2 focus:ring-[#93B8FF]/20 cursor-pointer"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <Button
              type="button"
              onClick={() => handleAddSkill()}
              className="bg-[#0755E8] hover:bg-[#0645C7] text-white font-bold text-xs sm:text-sm rounded-xl px-4 py-2 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill</span>
            </Button>
          </div>
          {errors && <p className="text-xs text-rose-600 font-semibold">{errors}</p>}
        </div>

        {/* Quick Suggested Skills */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-[#0755E8]" />
            <span>Suggested Skills (Click to add):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SKILLS.flatMap(cat => cat.skills).map((skill) => {
              const alreadyAdded = existingSkillNamesLower.has(skill.toLowerCase());
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => !alreadyAdded && handleAddSkill(skill)}
                  disabled={alreadyAdded}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    alreadyAdded
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 opacity-60 cursor-default'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-[#0755E8] hover:text-[#0755E8] hover:bg-[#EAF2FF]/40 shadow-xs'
                  }`}
                >
                  {alreadyAdded ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-slate-400" />}
                  <span>{skill}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Skills List */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Your Skills ({skillsList.length})
            </h3>
            {skillsList.length > 0 && (
              <span className="text-[11px] text-slate-500 font-medium">
                Tip: Click proficiency dropdown to adjust level
              </span>
            )}
          </div>

          {skillsList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <AnimatePresence>
                {skillsList.map((skill) => (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {skill.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={skill.proficiency}
                        onChange={(e) => updateSkill(skill.id, { proficiency: e.target.value as any })}
                        className={`text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border focus:outline-none cursor-pointer ${
                          PROFICIENCY_COLORS[skill.proficiency] || PROFICIENCY_COLORS.intermediate
                        }`}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => removeSkill(skill.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove skill"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center mx-auto mb-2.5">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-slate-800 font-bold text-sm">No skills added yet</p>
              <p className="text-slate-500 text-xs mt-0.5 max-w-sm mx-auto">
                Type your skills above or click any of the popular suggestions to build your competencies section.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <Button
          type="button"
          onClick={prevStep}
          variant="outline"
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl px-4 py-2 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>
        <Button
          type="button"
          onClick={nextStep}
          className="bg-[#0755E8] hover:bg-[#0645C7] text-white flex items-center gap-1.5 text-xs sm:text-sm font-bold rounded-xl px-4 py-2 cursor-pointer shadow-xs"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
