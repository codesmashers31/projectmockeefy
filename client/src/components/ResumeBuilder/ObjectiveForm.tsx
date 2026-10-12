import { useState, useEffect } from 'react';
import { useResume } from '../../context/ResumeContext';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Sparkles, Loader2, Undo2, Check, AlertCircle, HelpCircle, Copy } from 'lucide-react';
import axios from '../../lib/axios';
import { toast } from 'sonner';

interface SuggestionItem {
  role: string;
  category: string;
  text: string;
}

const QUICK_SUGGESTIONS: SuggestionItem[] = [
  {
    role: 'Full Stack Engineer',
    category: 'Engineering',
    text: 'Motivated Full Stack Software Engineer with 4+ years of experience designing and scaling web applications with React, Node.js, and TypeScript. Passionate about performant system architecture, clean code, and delightful user experiences.',
  },
  {
    role: 'Product / Project Manager',
    category: 'Product',
    text: 'Detail-oriented Product Manager with proven track record leading cross-functional engineering and design sprints. Adept at translating user feedback and KPIs into high-impact product roadmaps and strategic deliverables.',
  },
  {
    role: 'Data & Business Analyst',
    category: 'Analytics',
    text: 'Results-driven Data Analyst with expertise in SQL, Python, and data visualization. Skilled at transforming raw multi-source business data into actionable executive insights that optimize retention and revenue growth.',
  },
  {
    role: 'Growth & Digital Marketing',
    category: 'Marketing',
    text: 'Creative and analytical Marketing Strategist with extensive experience in performance marketing, SEO, and omnichannel campaigns. Adept at driving sustainable user acquisition and brand authority.',
  },
];

export function ObjectiveForm() {
  const { resumeData, updateObjective, nextStep, prevStep } = useResume();
  const [objective, setObjective] = useState(resumeData.objective?.objective || '');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [previousDraft, setPreviousDraft] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<boolean>(false);
  
  // Pending suggestion confirmation state
  const [pendingSuggestion, setPendingSuggestion] = useState<SuggestionItem | null>(null);

  // Keep local state in sync if resumeData loads asynchronously
  useEffect(() => {
    if (resumeData.objective?.objective && resumeData.objective.objective !== objective && !previousDraft) {
      setObjective(resumeData.objective.objective);
    }
  }, [resumeData.objective?.objective]);

  const handleTextChange = (newVal: string) => {
    setObjective(newVal);
    updateObjective(newVal);
    if (aiError) setAiError(null);
  };

  const handleApplySuggestionClick = (suggestion: SuggestionItem) => {
    if (!objective.trim()) {
      // Direct apply when empty
      setPreviousDraft(objective);
      handleTextChange(suggestion.text);
      toast.success(`Applied ${suggestion.role} summary`);
    } else {
      // Open confirmation prompt to prevent accidental overwriting
      setPendingSuggestion(suggestion);
    }
  };

  const confirmReplace = () => {
    if (!pendingSuggestion) return;
    setPreviousDraft(objective);
    handleTextChange(pendingSuggestion.text);
    toast.success('Summary replaced with suggestion');
    setPendingSuggestion(null);
  };

  const confirmAppend = () => {
    if (!pendingSuggestion) return;
    setPreviousDraft(objective);
    const combined = `${objective.trim()}\n\n${pendingSuggestion.text}`;
    handleTextChange(combined);
    toast.success('Suggestion appended to summary');
    setPendingSuggestion(null);
  };

  const handleUndo = () => {
    if (previousDraft !== null) {
      handleTextChange(previousDraft);
      setPreviousDraft(null);
      setAiSuccess(false);
      toast.info('Restored your previous summary');
    }
  };

  const handleAIOptimization = async () => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    setAiError(null);
    setAiSuccess(false);

    // Derive target role from experience if available
    const detectedRole = resumeData.experience?.[0]?.position || 
      (resumeData.skills?.length ? `${resumeData.skills[0].name} Specialist` : 'Software Professional');

    try {
      const res = await axios.post('/api/user/resumes/ai-suggestions', {
        text: objective.trim(),
        type: 'summary',
        role: detectedRole,
      });

      if (res.data?.success && res.data?.suggestion) {
        setPreviousDraft(objective);
        handleTextChange(res.data.suggestion);
        setAiSuccess(true);
        toast.success('Summary successfully enhanced with AI! ✨');
      } else {
        const errorMsg = res.data?.message || 'Could not generate AI suggestions. Please try again.';
        setAiError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err: any) {
      console.error('AI error:', err);
      const errorMsg = err.response?.data?.message || 'AI service temporarily unavailable. Please retry shortly.';
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsOptimizing(false);
    }
  };

  const maxChars = 500;
  const isOverLimit = objective.length > maxChars;

  return (
    <div className="space-y-6">
      {/* Header Description */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Professional Summary</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Write a concise 2-4 sentence summary of your career focus, top achievements, and primary strengths.
        </p>
      </div>

      {/* Editor Box */}
      <div className="space-y-4">
        <div>
          {/* Label & Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Summary Statement
            </label>
            
            <div className="flex items-center gap-2.5">
              {/* Character counter */}
              <span
                className={`text-xs font-medium tabular-nums ${
                  isOverLimit
                    ? 'text-red-600 font-bold'
                    : objective.length > 450
                    ? 'text-amber-600'
                    : 'text-slate-500'
                }`}
              >
                {objective.length} / {maxChars} characters
              </span>

              {/* Undo action if available */}
              {previousDraft !== null && (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100"
                  title="Undo previous change"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo
                </button>
              )}

              {/* AI Optimization Trigger */}
              <button
                type="button"
                onClick={handleAIOptimization}
                disabled={isOptimizing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Optimize ✨</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={objective}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="e.g. Dedicated Software Engineer with 4+ years of experience architecting high-performance web applications. Skilled in React, TypeScript, and distributed cloud services..."
              rows={5}
              className={`w-full px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white border rounded-xl leading-relaxed transition-all focus:outline-none focus:ring-2 ${
                isOverLimit
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                  : 'border-slate-200 focus:border-[#0755E8] focus:ring-[#0755E8]/20'
              }`}
            />
          </div>

          {/* AI Success Feedback Banner */}
          <AnimatePresence>
            {aiSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>AI enhanced your summary for maximum readability and recruiter impact.</span>
                </div>
                {previousDraft && (
                  <button
                    onClick={handleUndo}
                    className="text-emerald-700 font-semibold hover:underline shrink-0 ml-2"
                  >
                    Revert
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Error Feedback Banner */}
          <AnimatePresence>
            {aiError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-xs text-rose-800"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button
                  onClick={handleAIOptimization}
                  className="text-rose-700 font-semibold hover:underline shrink-0 ml-2"
                >
                  Retry
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Suggestion Confirmation Modal/Prompt to prevent accidental overwrites */}
        <AnimatePresence>
          {pendingSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold">Apply "{pendingSuggestion.role}" suggestion?</p>
                  <p className="text-amber-800 mt-0.5">
                    You already have text entered. Choose whether to replace your existing text or append the suggestion below it.
                  </p>
                </div>
              </div>
              
              <div className="p-2.5 bg-white rounded-lg border border-amber-200/60 text-xs text-slate-700 italic max-h-24 overflow-y-auto">
                "{pendingSuggestion.text}"
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setPendingSuggestion(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAppend}
                  className="px-3 py-1.5 text-xs font-semibold text-[#0755E8] bg-[#EAF2FF] border border-[#93B8FF]/50 rounded-lg hover:bg-[#dbe7fd] transition-colors cursor-pointer"
                >
                  Append to Existing
                </button>
                <button
                  type="button"
                  onClick={confirmReplace}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Replace Existing
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Suggestions Cards */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Quick Suggestions by Role:
            </p>
            <span className="text-[11px] text-slate-500">Click any card to apply</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_SUGGESTIONS.map((item, index) => (
              <div
                key={index}
                onClick={() => handleApplySuggestionClick(item)}
                className="group p-3 border border-slate-200 rounded-xl bg-white hover:border-[#0755E8] hover:bg-[#F5F8FF] transition-all cursor-pointer flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#0755E8] transition-colors">
                      {item.role}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 group-hover:bg-[#EAF2FF] text-slate-600 group-hover:text-[#0755E8] transition-colors">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.text}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#0755E8] font-semibold opacity-80 group-hover:opacity-100">
                  <span>Use suggestion</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Box */}
        <div className="bg-[#EAF2FF] border border-[#93B8FF]/40 rounded-xl p-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#0755E8] mb-1.5">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Tips for an Impactful Summary</span>
          </div>
          <ul className="text-slate-700 space-y-1 list-disc list-inside leading-relaxed">
            <li>Keep it concise: 2 to 4 sentences (under 500 characters) work best for ATS parsers.</li>
            <li>Highlight quantifiable achievements (e.g. "improved speed by 35%").</li>
            <li>Incorporate keywords from your target job description.</li>
          </ul>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Button
          type="button"
          onClick={prevStep}
          variant="outline"
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        <Button
          type="button"
          onClick={() => {
            updateObjective(objective);
            nextStep();
          }}
          className="flex items-center gap-1.5 text-xs font-bold px-5 py-2 text-white bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] rounded-xl cursor-pointer shadow-xs"
        >
          <span>Save & Continue</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
