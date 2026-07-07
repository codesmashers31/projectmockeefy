import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ResumeData, TemplateType, PersonalDetails, Skill, Education, Experience, Project, Certification, Achievement } from '../types/resume';
import axios from '../lib/axios';

interface ResumeContextType {
  // Data
  resumeData: ResumeData;
  
  // Form navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  
  // Template
  selectedTemplate: TemplateType;
  setSelectedTemplate: (template: TemplateType) => void;
  
  // Personal Details
  updatePersonalDetails: (details: Partial<PersonalDetails>) => void;
  
  // Skills
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, skill: Partial<Skill>) => void;
  removeSkill: (id: string) => void;
  
  // Education
  addEducation: (education: Education) => void;
  updateEducation: (id: string, education: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  
  // Experience
  addExperience: (experience: Experience) => void;
  updateExperience: (id: string, experience: Partial<Experience>) => void;
  removeExperience: (id: string) => void;
  
  // Projects
  addProject: (project: Project) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  removeProject: (id: string) => void;
  
  // Certifications
  addCertification: (certification: Certification) => void;
  updateCertification: (id: string, certification: Partial<Certification>) => void;
  removeCertification: (id: string) => void;
  
  // Achievements
  addAchievement: (achievement: Achievement) => void;
  updateAchievement: (id: string, achievement: Partial<Achievement>) => void;
  removeAchievement: (id: string) => void;
  
  // Objective
  updateObjective: (objective: string) => void;
  
  // Reset
  resetResume: () => void;
  
  // Save/Load
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  loadResumeData: (data: Partial<ResumeData>) => void;

  // DB Synchronization
  saveResumeToDb: (title?: string) => Promise<any>;
  loadResumeFromDb: (id: string) => Promise<any>;
  fetchUserResumes: () => Promise<any[]>;
  deleteResumeFromDb: (id: string) => Promise<boolean>;
  duplicateResumeInDb: (id: string) => Promise<any>;
  userResumes: any[];
  activeResumeId: string | null;
  setActiveResumeId: (id: string | null) => void;
}

const defaultResumeData: ResumeData = {
  personalDetails: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
  },
  objective: undefined,
  skills: [],
  education: [],
  experience: [],
  projects: [],
  certifications: [],
  achievements: [],
};

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: React.ReactNode }) {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('modern');
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);

  const fetchUserResumes = useCallback(async () => {
    try {
      const res = await axios.get('/api/user/resumes');
      if (res.data.success) {
        setUserResumes(res.data.data);
        return res.data.data;
      }
      return [];
    } catch (err) {
      console.error("fetchUserResumes error:", err);
      return [];
    }
  }, []);

  const saveResumeToDb = useCallback(async (title?: string) => {
    try {
      const payload = {
        title: title || (resumeData.personalDetails.fullName ? `${resumeData.personalDetails.fullName}'s Resume` : "Untitled Resume"),
        template: selectedTemplate,
        personalInfo: resumeData.personalDetails,
        objective: resumeData.objective,
        skills: {
          technical: resumeData.skills.map(s => s.name),
          soft: [],
          languages: []
        },
        education: resumeData.education,
        experience: resumeData.experience,
        projects: resumeData.projects,
        certifications: resumeData.certifications,
        achievements: resumeData.achievements
      };

      if (activeResumeId) {
        const res = await axios.put(`/api/user/resumes/${activeResumeId}`, payload);
        if (res.data.success) {
          fetchUserResumes();
          return res.data.data;
        }
      } else {
        const res = await axios.post('/api/user/resumes', payload);
        if (res.data.success) {
          setActiveResumeId(res.data.data._id);
          fetchUserResumes();
          return res.data.data;
        }
      }
    } catch (err) {
      console.error("saveResumeToDb error:", err);
    }
  }, [resumeData, selectedTemplate, activeResumeId, fetchUserResumes]);

  const loadResumeFromDb = useCallback(async (id: string) => {
    try {
      const res = await axios.get(`/api/user/resumes/${id}`);
      if (res.data.success) {
        const doc = res.data.data;
        setActiveResumeId(doc._id);
        setSelectedTemplate(doc.template || 'modern');
        setResumeData({
          personalDetails: doc.personalInfo || defaultResumeData.personalDetails,
          objective: doc.objective,
          skills: doc.skills?.technical?.map((name: string) => ({ id: Math.random().toString(), name })) || [],
          education: doc.education || [],
          experience: doc.experience || [],
          projects: doc.projects || [],
          certifications: doc.certifications || [],
          achievements: doc.achievements || []
        });
        return doc;
      }
    } catch (err) {
      console.error("loadResumeFromDb error:", err);
    }
  }, []);

  const deleteResumeFromDb = useCallback(async (id: string) => {
    try {
      const res = await axios.delete(`/api/user/resumes/${id}`);
      if (res.data.success) {
        if (activeResumeId === id) {
          setActiveResumeId(null);
          setResumeData(defaultResumeData);
        }
        fetchUserResumes();
        return true;
      }
      return false;
    } catch (err) {
      console.error("deleteResumeFromDb error:", err);
      return false;
    }
  }, [activeResumeId, fetchUserResumes]);

  const duplicateResumeInDb = useCallback(async (id: string) => {
    try {
      const res = await axios.post(`/api/user/resumes/${id}/duplicate`);
      if (res.data.success) {
        fetchUserResumes();
        return res.data.data;
      }
    } catch (err) {
      console.error("duplicateResumeInDb error:", err);
    }
  }, [fetchUserResumes]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('resumeData');
    const savedStep = localStorage.getItem('resumeStep');
    const savedTemplate = localStorage.getItem('resumeTemplate');
    
    if (savedData) {
      try {
        setResumeData(JSON.parse(savedData));
      } catch (error) {
        console.error('Failed to load resume data from localStorage:', error);
      }
    }
    
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10));
    }
    
    if (savedTemplate) {
      setSelectedTemplate(savedTemplate as TemplateType);
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    saveToLocalStorage();
  }, [resumeData, currentStep, selectedTemplate]);

  const saveToLocalStorage = useCallback(() => {
    localStorage.setItem('resumeData', JSON.stringify(resumeData));
    localStorage.setItem('resumeStep', currentStep.toString());
    localStorage.setItem('resumeTemplate', selectedTemplate);
  }, [resumeData, currentStep, selectedTemplate]);

  const loadFromLocalStorage = useCallback(() => {
    const savedData = localStorage.getItem('resumeData');
    const savedStep = localStorage.getItem('resumeStep');
    const savedTemplate = localStorage.getItem('resumeTemplate');
    
    if (savedData) {
      try {
        setResumeData(JSON.parse(savedData));
      } catch (error) {
        console.error('Failed to load resume data:', error);
      }
    }
    
    if (savedStep) {
      setCurrentStep(parseInt(savedStep, 10));
    }
    
    if (savedTemplate) {
      setSelectedTemplate(savedTemplate as TemplateType);
    }
  }, []);

  const loadResumeData = useCallback((data: Partial<ResumeData>) => {
    setResumeData(prev => ({
      ...prev,
      ...data,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 8));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const updatePersonalDetails = useCallback((details: Partial<PersonalDetails>) => {
    setResumeData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, ...details },
    }));
  }, []);

  const updateObjective = useCallback((objective: string) => {
    setResumeData(prev => ({
      ...prev,
      objective: { objective },
    }));
  }, []);

  // Skills
  const addSkill = useCallback((skill: Skill) => {
    setResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, skill],
    }));
  }, []);

  const updateSkill = useCallback((id: string, skill: Partial<Skill>) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.map(s => (s.id === id ? { ...s, ...skill } : s)),
    }));
  }, []);

  const removeSkill = useCallback((id: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.id !== id),
    }));
  }, []);

  // Education
  const addEducation = useCallback((education: Education) => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, education],
    }));
  }, []);

  const updateEducation = useCallback((id: string, education: Partial<Education>) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(e => (e.id === id ? { ...e, ...education } : e)),
    }));
  }, []);

  const removeEducation = useCallback((id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(e => e.id !== id),
    }));
  }, []);

  // Experience
  const addExperience = useCallback((experience: Experience) => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, experience],
    }));
  }, []);

  const updateExperience = useCallback((id: string, experience: Partial<Experience>) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => (e.id === id ? { ...e, ...experience } : e)),
    }));
  }, []);

  const removeExperience = useCallback((id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(e => e.id !== id),
    }));
  }, []);

  // Projects
  const addProject = useCallback((project: Project) => {
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, project],
    }));
  }, []);

  const updateProject = useCallback((id: string, project: Partial<Project>) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.map(p => (p.id === id ? { ...p, ...project } : p)),
    }));
  }, []);

  const removeProject = useCallback((id: string) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
    }));
  }, []);

  // Certifications
  const addCertification = useCallback((certification: Certification) => {
    setResumeData(prev => ({
      ...prev,
      certifications: [...prev.certifications, certification],
    }));
  }, []);

  const updateCertification = useCallback((id: string, certification: Partial<Certification>) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.map(c => (c.id === id ? { ...c, ...certification } : c)),
    }));
  }, []);

  const removeCertification = useCallback((id: string) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c.id !== id),
    }));
  }, []);

  // Achievements
  const addAchievement = useCallback((achievement: Achievement) => {
    setResumeData(prev => ({
      ...prev,
      achievements: [...prev.achievements, achievement],
    }));
  }, []);

  const updateAchievement = useCallback((id: string, achievement: Partial<Achievement>) => {
    setResumeData(prev => ({
      ...prev,
      achievements: prev.achievements.map(a => (a.id === id ? { ...a, ...achievement } : a)),
    }));
  }, []);

  const removeAchievement = useCallback((id: string) => {
    setResumeData(prev => ({
      ...prev,
      achievements: prev.achievements.filter(a => a.id !== id),
    }));
  }, []);

  const resetResume = useCallback(() => {
    setResumeData(defaultResumeData);
    setCurrentStep(0);
    setSelectedTemplate('modern');
    localStorage.removeItem('resumeData');
    localStorage.removeItem('resumeStep');
    localStorage.removeItem('resumeTemplate');
  }, []);

  const value: ResumeContextType = {
    resumeData,
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    selectedTemplate,
    setSelectedTemplate,
    updatePersonalDetails,
    addSkill,
    updateSkill,
    removeSkill,
    addEducation,
    updateEducation,
    removeEducation,
    addExperience,
    updateExperience,
    removeExperience,
    addProject,
    updateProject,
    removeProject,
    addCertification,
    updateCertification,
    removeCertification,
    addAchievement,
    updateAchievement,
    removeAchievement,
    updateObjective,
    resetResume,
    saveToLocalStorage,
    loadFromLocalStorage,
    loadResumeData,
    saveResumeToDb,
    loadResumeFromDb,
    fetchUserResumes,
    deleteResumeFromDb,
    duplicateResumeInDb,
    userResumes,
    activeResumeId,
    setActiveResumeId,
  };

  return (
    <ResumeContext.Provider value={value}>
      {children}
    </ResumeContext.Provider>
  );
}

export function useResume(): ResumeContextType {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error('useResume must be used within ResumeProvider');
  }
  return context;
}
