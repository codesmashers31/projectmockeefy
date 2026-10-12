import { useState, useEffect } from 'react';
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
import { ChevronLeft, ChevronRight, Check, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from '../lib/axios';
import Navigation from '../components/Navigation';

import { ModernResumeTemplate } from '../components/ResumeBuilder/Templates/ModernTemplate';
import { FresherTemplate } from '../components/ResumeBuilder/Templates/FresherTemplate';
import { ExperiencedTemplate } from '../components/ResumeBuilder/Templates/ExperiencedTemplate';
import { MinimalATSTemplate } from '../components/ResumeBuilder/Templates/MinimalATSTemplate';

const steps = [
  { id: 0, title: 'Personal Details', description: 'Basic information', icon: '👤' },
  { id: 1, title: 'Objective', description: 'Professional summary', icon: '🎯' },
  { id: 2, title: 'Skills', description: 'Your expertise', icon: '⚡' },
  { id: 3, title: 'Education', description: 'Academic background', icon: '🎓' },
  { id: 4, title: 'Experience', description: 'Work history', icon: '💼' },
  { id: 5, title: 'Projects', description: 'Notable work', icon: '🚀' },
  { id: 6, title: 'Additional Info', description: 'Certifications & achievements', icon: '🏆' },
  { id: 7, title: 'Template', description: 'Choose design', icon: '🎨' },
  { id: 8, title: 'Download', description: 'Save & export', icon: '📄' },
];

export function ResumeBuilderPage() {
  const { user } = useAuth();
  const { currentStep, setCurrentStep, resumeData, loadResumeData, nextStep, prevStep, selectedTemplate, saveResumeToDb } = useResume();
  const [isLoadingResume, setIsLoadingResume] = useState(true);



  const userId = user?.id || user?._id || user?.userId;

  // Fetch user's profile data
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await axios.get("/api/user/profile", {
        headers: { userid: userId },
      });
      return response.data.success ? response.data.data : null;
    },
    enabled: !!userId,
  });



  // Load profile data into resume context
  useEffect(() => {
    if (profileData && !isLoadingProfile) {
      // Transform profile data to resume format
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
    }
  }, [profileData, isLoadingProfile, loadResumeData]);
 
  // Check if profile data is complete
  const isProfileComplete = profileData && (
    (profileData.personalInfo?.fullName || profileData.name) &&
    (profileData.personalInfo?.email || profileData.email)
  );

  useEffect(() => {
    if (isProfileComplete && currentStep === 0) {
      setCurrentStep(7);
    }
  }, [isProfileComplete, currentStep, setCurrentStep]);





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

  if (isLoadingResume || isLoadingProfile) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-[#5B4BDB] to-[#4938C8] rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Your Profile</h2>
          <p className="text-slate-600 mb-6">We're preparing your resume with your existing information...</p>
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#5B4BDB]" />
          </div>
        </div>
      </div>
    );
  }

  // Show quick generate option if profile is complete
  if (isProfileComplete && currentStep === 0) {
    return (
      <div className="w-full flex items-center justify-center py-10">
        <div className="text-center max-w-lg bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
          <div className="w-16 h-16 bg-[#5B4BDB] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-3">Your Profile is Ready!</h1>
          <p className="text-sm text-slate-600 mb-6">
            We found your complete profile information. You can generate a professional resume instantly or customize it further.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setCurrentStep(7)}
              className="w-full flex items-center justify-center gap-2.5 px-6 py-3 bg-[#5B4BDB] hover:bg-[#4938C8] active:bg-[#3F2FB3] text-white rounded-xl transition-colors font-semibold text-sm cursor-pointer shadow-xs"
            >
              <Sparkles className="w-5 h-5" />
              Generate Resume from Profile
            </button>

            <button
              onClick={() => setCurrentStep(1)}
              className="w-full px-6 py-3 bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors font-semibold text-sm cursor-pointer"
            >
              Customize & Edit Details
            </button>
          </div>

          <div className="mt-6 p-3.5 bg-[#F0EDFF] rounded-xl border border-[#D8D1FF] text-xs text-[#5B4BDB] font-medium">
            <strong>Included:</strong> Personal details, skills, education, experience, projects, and achievements.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 font-sans text-left">
      {/* Horizontal Step Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {steps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = index < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#5B4BDB] text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/70 hover:bg-emerald-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{step.icon}</span>
                <span>{step.title}</span>
                {isCompleted && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{steps[currentStep].title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{steps[currentStep].description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const savePromise = saveResumeToDb();
                  toast.promise(savePromise, {
                    loading: 'Saving draft to cloud...',
                    success: 'Resume saved to cloud successfully!',
                    error: 'Failed to save draft.',
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors font-semibold text-xs shadow-xs cursor-pointer"
              >
                Save Draft
              </button>
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-3.5 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
              )}
              {currentStep < steps.length - 1 && (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-1 px-3.5 py-2 text-white bg-[#5B4BDB] hover:bg-[#4938C8] active:bg-[#3F2FB3] rounded-xl transition-colors text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {isLoadingResume || isLoadingProfile ? (
            <div className="w-full flex items-center justify-center py-16 bg-white rounded-2xl border border-slate-200/80">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#5B4BDB] mx-auto mb-3" />
                <p className="text-slate-600 text-xs">Loading your profile...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Left Panel: Form Editor */}
              <div className="w-full lg:w-[55%]">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                    <span className="text-[#5B4BDB] text-lg">+</span>
                    Edit {steps[currentStep].title}
                  </h3>
                  
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {renderStepContent()}
                    </motion.div>
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => prevStep()}
                      className="flex-1 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-xs cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={nextStep}
                      className="flex-1 px-4 py-2.5 text-white bg-[#5B4BDB] hover:bg-[#4938C8] active:bg-[#3F2FB3] rounded-xl transition-colors font-semibold flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save & Continue
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel: Live A4 Preview */}
              <div className="hidden lg:flex flex-1 bg-slate-100 rounded-2xl border border-slate-200/80 p-6 justify-center items-start sticky top-[88px] overflow-hidden">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs text-[11px] font-bold text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live A4 Preview
                  </div>
                  <div 
                    className="bg-white shadow-xl border border-slate-300 rounded-sm overflow-hidden"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      transform: 'scale(0.72)',
                      transformOrigin: 'top center',
                      marginBottom: '-90px'
                    }}
                  >
                    {selectedTemplate === 'modern' && <ModernResumeTemplate />}
                    {selectedTemplate === 'fresher' && <FresherTemplate />}
                    {selectedTemplate === 'experienced' && <ExperiencedTemplate />}
                    {selectedTemplate === 'minimal' && <MinimalATSTemplate />}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
