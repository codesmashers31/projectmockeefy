import { useResume } from '../../context/ResumeContext';
import { TemplateType } from '../../types/resume';
import { ModernResumeTemplate } from './Templates/ModernTemplate';
import { FresherTemplate } from './Templates/FresherTemplate';
import { ExperiencedTemplate } from './Templates/ExperiencedTemplate';
import { MinimalATSTemplate } from './Templates/MinimalATSTemplate';
import { motion } from 'motion/react';
import { ChevronRight, Download, Printer } from 'lucide-react';
import { Button } from '../ui/button';

export function TemplateSelector() {
  const { selectedTemplate, setSelectedTemplate, nextStep } = useResume();

  const templates: Array<{
    id: TemplateType;
    name: string;
    description: string;
  }> = [
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean, contemporary design with color highlights. Great for most industries.',
    },
    {
      id: 'fresher',
      name: 'Fresher',
      description: 'Perfect for first-time job seekers. Emphasizes education and skills.',
    },
    {
      id: 'experienced',
      name: 'Experienced',
      description: 'Professional layout focused on career progression. Ideal for senior roles.',
    },
    {
      id: 'minimal',
      name: 'Minimal ATS',
      description: 'Text-only, ATS-friendly format. Optimized for applicant tracking systems.',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Template</h2>
        <p className="text-sm text-gray-600 mt-1">
          Select a template that best matches your professional style
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {templates.map(template => (
          <div
            key={template.id}
            onClick={() => setSelectedTemplate(template.id)}
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${
              selectedTemplate === template.id
                ? 'border-[#0755E8] bg-[#EAF2FF]/50 ring-2 ring-[#0755E8]/10'
                : 'border-slate-200 hover:border-[#0755E8]/60 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{template.name}</h3>
              {selectedTemplate === template.id && (
                <span className="px-2.5 py-0.5 bg-[#0755E8] text-white text-[11px] font-bold rounded-full">
                  Selected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{template.description}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <Button
          onClick={() => nextStep()}
          className="ml-auto bg-[#0755E8] hover:bg-[#0645C7] text-white flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-xs"
        >
          Continue to Download
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function PreviewPane() {
  const { selectedTemplate } = useResume();

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Preview ({selectedTemplate})</h3>
      </div>
      <div className="overflow-auto p-4" style={{ height: 'calc(100vh - 300px)' }}>
        <div className="bg-white rounded shadow">
          {selectedTemplate === 'modern' && <ModernResumeTemplate />}
          {selectedTemplate === 'fresher' && <FresherTemplate />}
          {selectedTemplate === 'experienced' && <ExperiencedTemplate />}
          {selectedTemplate === 'minimal' && <MinimalATSTemplate />}
        </div>
      </div>
    </div>
  );
}
