import { useState, useEffect, useRef, useCallback } from 'react';
import { useResume } from '../context/ResumeContext';
import { PersonalDetailsForm } from '../components/ResumeBuilder/PersonalDetailsForm';
import { ObjectiveForm } from '../components/ResumeBuilder/ObjectiveForm';
import { SkillsForm } from '../components/ResumeBuilder/SkillsForm';
import { EducationForm } from '../components/ResumeBuilder/EducationForm';
import { ExperienceForm } from '../components/ResumeBuilder/ExperienceForm';
import { ProjectsForm } from '../components/ResumeBuilder/ProjectsForm';
import { CertificationsAndAchievementsForm } from '../components/ResumeBuilder/CertificationsAndAchievementsForm';
import { TemplateSelector } from '../components/ResumeBuilder/TemplateSelector';
import { DownloadAndExportStep } from '../components/ResumeBuilder/DownloadAndExportStep';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Loader2, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  X, 
  Download, 
  AlertCircle, 
  Save, 
  FileText,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from '../lib/axios';
import { downloadResumePDF } from '../utils/pdfDownload';

import { ModernResumeTemplate } from '../components/ResumeBuilder/Templates/ModernTemplate';
import { FresherTemplate } from '../components/ResumeBuilder/Templates/FresherTemplate';
import { ExperiencedTemplate } from '../components/ResumeBuilder/Templates/ExperiencedTemplate';
import { MinimalATSTemplate } from '../components/ResumeBuilder/Templates/MinimalATSTemplate';

const steps = [
  { id: 0, title: 'Personal Details', description: 'Contact & identity', icon: '👤' },
  { id: 1, title: 'Objective', description: 'Professional summary', icon: '🎯' },
  { id: 2, title: 'Skills', description: 'Core competencies', icon: '⚡' },
  { id: 3, title: 'Education', description: 'Degrees & institutions', icon: '🎓' },
  { id: 4, title: 'Experience', description: 'Employment history', icon: '💼' },
  { id: 5, title: 'Projects', description: 'Key technical projects', icon: '🚀' },
  { id: 6, title: 'Additional Info', description: 'Certifications & honors', icon: '🏆' },
  { id: 7, title: 'Template', description: 'Format & style', icon: '🎨' },
  { id: 8, title: 'Download', description: 'Review & export PDF', icon: '📄' },
];

export function ResumeBuilderPage() {
  const { user } = useAuth();
  const { 
    currentStep, 
    setCurrentStep, 
    resumeData, 
    loadResumeData, 
    nextStep, 
    prevStep, 
    selectedTemplate, 
    saveResumeToDb 
  } = useResume();
  
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  
  // A4 Preview Zoom Controls
  const [zoom, setZoom] = useState<number>(0.62);
  const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const resumePrintRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const userId = user?.id || user?._id || user?.userId;

  // Track edits to set unsaved status
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('unsaved');
  }, [resumeData, selectedTemplate]);

  // Fetch user's profile data
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await axios.get('/api/user/profile', {
        headers: { userid: userId },
      });
      return response.data.success ? response.data.data : null;
    },
    enabled: !!userId,
  });

  // Load profile data into resume context
  useEffect(() => {
    if (profileData && !isLoadingProfile) {
      const resumeDataFromProfile = {
        personalDetails: {
          fullName: profileData.personalInfo?.fullName || profileData.name || '',
          email: profileData.personalInfo?.email || profileData.email || '',
          phone: profileData.personalInfo?.phone || '',
          location: profileData.personalInfo?.location || (profileData.personalInfo?.city && profileData.personalInfo?.state ? `${profileData.personalInfo.city}, ${profileData.personalInfo.state}` : ''),
          linkedIn: profileData.personalInfo?.linkedIn || '',
          portfolio: profileData.personalInfo?.portfolio || '',
        },
        objective: profileData.personalInfo?.bio ? { objective: profileData.personalInfo.bio } : undefined,
        skills: profileData.skills
          ? [
              ...(Array.isArray(profileData.skills.technical) ? profileData.skills.technical : []),
              ...(Array.isArray(profileData.skills.soft) ? profileData.skills.soft : []),
              ...(Array.isArray(profileData.skills.languages) ? profileData.skills.languages : [])
            ].map((skillName: string, index: number) => ({
              id: `skill_${index}`,
              name: skillName,
              proficiency: 'intermediate',
            }))
          : [],
        education: Array.isArray(profileData.education)
          ? profileData.education.map((edu: any, index: number) => ({
              id: edu._id || `edu_${index}`,
              degree: edu.degree || '',
              institute: edu.institution || edu.institute || '',
              fieldOfStudy: edu.field || edu.fieldOfStudy || '',
              startYear: edu.startYear ? String(edu.startYear) : '',
              endYear: edu.endYear ? String(edu.endYear) : '',
              percentage: edu.percentage || '',
              cgpa: edu.cgpa || '',
              description: edu.description || '',
            }))
          : [],
        experience: Array.isArray(profileData.experience)
          ? profileData.experience.map((exp: any, index: number) => ({
              id: exp._id || `exp_${index}`,
              companyName: exp.company || exp.companyName || '',
              position: exp.position || '',
              startDate: exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : '',
              endDate: exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : '',
              currentlyWorking: exp.current || exp.currentlyWorking || false,
              description: exp.description 
                ? (typeof exp.description === 'string' ? exp.description.split('\n').filter(Boolean) : Array.isArray(exp.description) ? exp.description : [])
                : [],
              location: exp.location || '',
            }))
          : [],
        projects: Array.isArray(profileData.projects)
          ? profileData.projects.map((proj: any, index: number) => ({
              id: proj._id || `proj_${index}`,
              projectName: proj.projectName || '',
              techStack: Array.isArray(proj.techStack) ? proj.techStack : [],
              description: proj.description || '',
              githubLink: proj.githubLink || '',
            }))
          : [],
        certifications: Array.isArray(profileData.certifications)
          ? profileData.certifications.map((cert: any, index: number) => ({
              id: cert._id || `cert_${index}`,
              certificationName: cert.name || cert.certificationName || '',
              issuingOrganization: cert.issuer || cert.issuingOrganization || '',
              issueDate: cert.issueDate ? new Date(cert.issueDate).toISOString().split('T')[0] : '',
              credentialId: cert.credentialId || '',
              credentialUrl: cert.credentialUrl || '',
            }))
          : [],
        achievements: Array.isArray(profileData.achievements)
          ? profileData.achievements.map((ach: any, index: number) => ({
              id: ach._id || `ach_${index}`,
              achievementTitle: ach.title || ach.achievementTitle || '',
              description: ach.description || '',
              date: ach.date || '',
            }))
          : [],
      };

      loadResumeData(resumeDataFromProfile);
      setIsLoadingResume(false);
    } else if (!isLoadingProfile) {
      setIsLoadingResume(false);
    }
  }, [profileData, isLoadingProfile, loadResumeData]);

  // Check if profile data is complete
  const isProfileComplete = Boolean(
    profileData && (
      (profileData.personalInfo?.fullName || profileData.name) &&
      (profileData.personalInfo?.email || profileData.email)
    )
  );

  // Compute optimal fit to width for preview canvas
  const handleFitToWidth = useCallback(() => {
    if (previewContainerRef.current) {
      // Usable width inside preview canvas minus padding and scrollbar breathing room
      const containerWidth = previewContainerRef.current.clientWidth - 48;
      const a4WidthPx = 794; // 210mm in standard 96dpi pixels
      if (containerWidth > 100) {
        // Fit within container with a comfortable 4% margin
        const calculatedScale = Math.min(1.0, Math.max(0.35, (containerWidth / a4WidthPx) * 0.96));
        setZoom(Number(calculatedScale.toFixed(2)));
      }
    } else {
      setZoom(0.55);
    }
  }, []);

  // Use ResizeObserver to automatically calculate and maintain optimal preview fit
  useEffect(() => {
    handleFitToWidth();
    if (!previewContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      handleFitToWidth();
    });

    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, [handleFitToWidth]);

  // Robust Save Draft with duplicate prevention and accurate feedback
  const handleSaveDraft = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await saveResumeToDb();
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      toast.success('Resume draft successfully saved to cloud!');
    } catch (err: any) {
      console.error('Failed to save resume draft:', err);
      setSaveStatus('error');
      toast.error('Failed to save draft. Check connection and click retry.', {
        action: {
          label: 'Retry',
          onClick: handleSaveDraft,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Direct PDF Download
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const fileName = `${resumeData.personalDetails.fullName || 'resume'}.pdf`;
      const targetElement = resumePrintRef.current || document.getElementById('resume-a4-document');
      await downloadResumePDF(targetElement, fileName);
      toast.success('Resume PDF exported successfully!');
    } catch (err) {
      console.error('Download PDF error:', err);
      toast.error('PDF generation encountered an error.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <PersonalDetailsForm />;
      case 1:
        return <ObjectiveForm />;
      case 2:
        return <SkillsForm />;
      case 3:
        return <EducationForm />;
      case 4:
        return <ExperienceForm />;
      case 5:
        return <ProjectsForm />;
      case 6:
        return <CertificationsAndAchievementsForm />;
      case 7:
        return <TemplateSelector />;
      case 8:
        return <DownloadAndExportStep />;
      default:
        return <PersonalDetailsForm />;
    }
  };

  const currentProgressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

  if (isLoadingResume || isLoadingProfile) {
    return (
      <div className="w-full flex items-center justify-center py-24">
        <div className="text-center max-w-sm bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="w-14 h-14 bg-[#EAF2FF] text-[#0755E8] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Loading Your Resume</h2>
          <p className="text-xs text-slate-600 mb-5">Preparing your profile details and live preview canvas...</p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#0755E8]" />
          </div>
        </div>
      </div>
    );
  }

  // Profile complete fast-track view
  if (isProfileComplete && currentStep === 0 && !resumeData.personalDetails.fullName) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center max-w-lg bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
          <div className="w-14 h-14 bg-[#0755E8] rounded-2xl flex items-center justify-center mx-auto mb-5 text-white shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Profile Information Ready!</h1>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            We discovered your verified Mockeefy profile details. You can generate a formatted resume immediately or refine each section individually.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setCurrentStep(7)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] text-white rounded-xl transition-colors font-bold text-xs sm:text-sm cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              Generate Resume with Profile
            </button>

            <button
              onClick={() => setCurrentStep(1)}
              className="w-full px-5 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-semibold text-xs sm:text-sm cursor-pointer"
            >
              Review & Customize Details
            </button>
          </div>

          <div className="mt-6 p-3.5 bg-[#EAF2FF] rounded-xl border border-[#93B8FF]/40 text-xs text-[#0755E8] font-medium text-left">
            <strong>Included:</strong> Profile info, verified skills, education, work experience, and completed projects.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 font-sans text-left pb-12">
      {/* 1. Step Progress & Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        {/* Progress header & bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              Step {currentStep + 1} of {steps.length}:
            </span>
            <span className="text-xs font-semibold text-[#0755E8]">
              {steps[currentStep].title}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            {currentProgressPercent}% Completed
          </span>
        </div>

        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
          <motion.div
            className="bg-[#0755E8] h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${currentProgressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Horizontal Stepper */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = index < currentStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0755E8] text-white shadow-xs ring-2 ring-[#0755E8]/20'
                    : isCompleted
                    ? 'bg-[#EAF2FF] text-[#0755E8] border border-[#93B8FF]/40 hover:bg-[#dbe7fd]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
                title={`Jump to ${step.title}`}
              >
                <span>{step.icon}</span>
                <span>{step.title}</span>
                {isCompleted && <Check className="w-3.5 h-3.5 text-[#0755E8]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Top Header & Action Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-5 sm:px-6 py-3.5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              {steps[currentStep].title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {steps[currentStep].description}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Subtle Save Status Indicator */}
            <div className="mr-1 text-xs font-medium">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0755E8]" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved changes
                </span>
              )}
              {saveStatus === 'error' && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1 text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Save failed (Retry)
                </button>
              )}
            </div>

            {/* Save Draft Button */}
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              title="Save draft to cloud"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            {/* Previous Step Button */}
            {currentStep > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            )}

            {/* Next Step Button */}
            {currentStep < steps.length - 1 && (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1 px-3.5 py-2 text-white bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#073AA3] rounded-xl transition-colors text-xs font-bold cursor-pointer shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Download PDF Shortcut on final steps */}
            {currentStep >= 7 && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1 px-3.5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl transition-colors text-xs font-bold cursor-pointer shadow-xs disabled:opacity-60"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Balanced Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Panel: Form Editor */}
        <div className="w-full lg:w-[calc(50%-10px)] flex flex-col">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Live A4 Preview Canvas */}
        <div className="hidden lg:flex w-full lg:w-[calc(50%-10px)] sticky top-[80px] flex-col">
          <div className="bg-slate-100/90 rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 flex flex-col shadow-xs">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live A4 Preview</span>
                </div>
                <span className="text-xs text-slate-500 font-medium capitalize">
                  {selectedTemplate} Template
                </span>
              </div>

              {/* Interactive Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.35, Number((prev - 0.05).toFixed(2))))}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                
                <span className="text-xs font-bold text-slate-700 tabular-nums px-1 min-w-[36px] text-center">
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(1.20, Number((prev + 0.05).toFixed(2))))}
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <div className="h-3 w-px bg-slate-200 mx-0.5" />

                <button
                  type="button"
                  onClick={handleFitToWidth}
                  className="px-2 py-0.5 text-[11px] font-semibold text-[#0755E8] hover:bg-[#EAF2FF] rounded-md transition-colors cursor-pointer"
                  title="Fit to Width"
                >
                  Fit
                </button>

                <button
                  type="button"
                  onClick={() => setZoom(1.0)}
                  className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  title="100% Size"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Centered Document Canvas (Zero horizontal clipping) */}
            <div
              ref={previewContainerRef}
              className="w-full overflow-auto max-h-[calc(100vh-190px)] min-h-[540px] rounded-xl bg-slate-200/60 border border-slate-300/50 p-2 sm:p-4"
            >
              {/* Inner container prevents negative-margin cutoff when document overflows */}
              <div className="min-w-full w-max flex items-start justify-center min-h-full py-1">
                {/* Outer sizing placeholder with exact scaled dimensions */}
                <div
                  style={{
                    width: `${210 * zoom}mm`,
                    height: `${297 * zoom}mm`,
                  }}
                  className="relative shrink-0 mx-auto transition-transform duration-100 ease-out"
                >
                  {/* Printable A4 Paper Document */}
                  <div
                    ref={resumePrintRef}
                    id="resume-a4-document"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                    className="absolute top-0 left-0 bg-white shadow-xl border border-slate-300/80 rounded-xs overflow-hidden print:shadow-none print:transform-none"
                  >
                    {selectedTemplate === 'modern' && <ModernResumeTemplate />}
                    {selectedTemplate === 'fresher' && <FresherTemplate />}
                    {selectedTemplate === 'experienced' && <ExperiencedTemplate />}
                    {selectedTemplate === 'minimal' && <MinimalATSTemplate />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Mobile Floating Preview Trigger Button (< lg) */}
      <button
        type="button"
        onClick={() => setIsMobilePreviewOpen(true)}
        className="lg:hidden fixed bottom-18 right-4 z-40 flex items-center gap-2 px-4 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold rounded-full shadow-xl transition-transform active:scale-95 cursor-pointer ring-2 ring-white/60"
      >
        <Eye className="w-4 h-4" />
        <span>Preview Resume (A4)</span>
      </button>

      {/* 5. Mobile Full-Screen Preview Drawer/Modal */}
      <AnimatePresence>
        {isMobilePreviewOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Resume Preview Modal"
            className="lg:hidden fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col p-3 sm:p-4"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 text-white border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#93B8FF]" />
                <span className="font-bold text-sm">Live A4 Resume Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobilePreviewOpen(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Zoom Bar */}
            <div className="flex items-center justify-center gap-2 py-2 text-white/90 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.35, Number((prev - 0.05).toFixed(2))))}
                className="px-2 py-1 bg-white/10 rounded-md font-bold"
              >
                -
              </button>
              <span className="font-bold tabular-nums min-w-[36px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(1.0, Number((prev + 0.05).toFixed(2))))}
                className="px-2 py-1 bg-white/10 rounded-md font-bold"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom(0.44)}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-md font-semibold text-[#93B8FF]"
              >
                Fit Mobile
              </button>
            </div>

            {/* Mobile Scrollable Document Container */}
            <div className="flex-1 overflow-auto rounded-xl bg-slate-800/50 p-2">
              <div className="min-w-full w-max flex items-start justify-center min-h-full py-1">
                <div
                  style={{
                    width: `${210 * zoom}mm`,
                    height: `${297 * zoom}mm`,
                  }}
                  className="relative shrink-0 mx-auto"
                >
                  <div
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                    }}
                    className="absolute top-0 left-0 bg-white shadow-2xl rounded-xs overflow-hidden"
                  >
                    {selectedTemplate === 'modern' && <ModernResumeTemplate />}
                    {selectedTemplate === 'fresher' && <FresherTemplate />}
                    {selectedTemplate === 'experienced' && <ExperiencedTemplate />}
                    {selectedTemplate === 'minimal' && <MinimalATSTemplate />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default ResumeBuilderPage;
