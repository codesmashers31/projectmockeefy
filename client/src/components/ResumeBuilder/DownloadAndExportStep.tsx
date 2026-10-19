import { useState, useRef } from 'react';
import { useResume } from '../../context/ResumeContext';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { Download, Printer, Save, Share2, ChevronLeft, Check, FileText } from 'lucide-react';
import { downloadResumePDF, printResume } from '../../utils/pdfDownload';
import { ModernResumeTemplate } from './Templates/ModernTemplate';
import { FresherTemplate } from './Templates/FresherTemplate';
import { ExperiencedTemplate } from './Templates/ExperiencedTemplate';
import { MinimalATSTemplate } from './Templates/MinimalATSTemplate';
import { toast } from 'sonner';

export function DownloadAndExportStep() {
  const { resumeData, selectedTemplate, prevStep } = useResume();
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const fileName = `${resumeData.personalDetails.fullName || 'resume'}.pdf`;
      const targetElement = resumeRef.current || document.getElementById('resume-a4-document');
      await downloadResumePDF(targetElement, fileName);
      toast.success('Resume downloaded as PDF!');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('PDF download encountered an issue. Opening print dialog as fallback...');
      handlePrint();
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const targetElement = resumeRef.current || document.getElementById('resume-a4-document');
    printResume(targetElement);
  };

  const handleSaveLocally = () => {
    const data = {
      resumeData,
      selectedTemplate,
      savedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resumeData.personalDetails.fullName || 'resume'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Resume JSON data saved to device');
  };

  const handleCopyLink = () => {
    const data = {
      resumeData,
      selectedTemplate,
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `${window.location.origin}/resume/${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Shareable link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Download & Export</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          Your resume is finalized! Select your preferred export format or print directly.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Download PDF */}
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="p-5 border-2 border-slate-200 hover:border-[#0755E8] bg-white hover:bg-[#F5F8FF] rounded-xl transition-all text-left disabled:opacity-50 cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors">
            Download PDF
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {isDownloading ? 'Preparing high-resolution PDF...' : 'Export clean, ATS-friendly A4 PDF'}
          </p>
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          className="p-5 border-2 border-slate-200 hover:border-[#0755E8] bg-white hover:bg-[#F5F8FF] rounded-xl transition-all text-left cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Printer className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors">
            Print Resume
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Open standard print dialog for immediate hard copy
          </p>
        </button>

        {/* Save JSON */}
        <button
          onClick={handleSaveLocally}
          className="p-5 border-2 border-slate-200 hover:border-[#0755E8] bg-white hover:bg-[#F5F8FF] rounded-xl transition-all text-left cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Save className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors">
            Save JSON Backup
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Export structured data backup to import or edit later
          </p>
        </button>

        {/* Share Link */}
        <button
          onClick={handleCopyLink}
          className="p-5 border-2 border-slate-200 hover:border-[#0755E8] bg-white hover:bg-[#F5F8FF] rounded-xl transition-all text-left cursor-pointer group shadow-xs"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-5 h-5" />}
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors">
            {copied ? 'Link Copied!' : 'Copy Shareable Link'}
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {copied ? 'Ready to share with employers' : 'Create public view link to share with interview experts'}
          </p>
        </button>
      </div>

      {/* Hidden printable element ref fallback */}
      <div className="hidden" aria-hidden="true">
        <div
          ref={resumeRef}
          style={{ width: '210mm', minHeight: '297mm' }}
          className="bg-white"
        >
          {selectedTemplate === 'modern' && <ModernResumeTemplate />}
          {selectedTemplate === 'fresher' && <FresherTemplate />}
          {selectedTemplate === 'experienced' && <ExperiencedTemplate />}
          {selectedTemplate === 'minimal' && <MinimalATSTemplate />}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        <Button
          onClick={prevStep}
          variant="outline"
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Template
        </Button>
        <Button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="bg-[#0755E8] hover:bg-[#0645C7] text-white flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-xl cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Downloading...' : 'Download PDF Now'}
        </Button>
      </div>
    </div>
  );
}
