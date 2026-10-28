import React, { useState, useEffect, useRef } from 'react';
import axios from '../../lib/axios';
import { toast } from 'sonner';
import { useDataSync } from '../../context/SocketContext';
import { 
  FileText, 
  CheckCircle, 
  Upload, 
  PenTool, 
  Download, 
  ShieldCheck, 
  RotateCcw, 
  ExternalLink,
  Lock,
  Building2,
  Briefcase,
  User,
  AlertCircle,
  FileCheck2,
  Calendar,
  Sparkles,
  Eye,
  X
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { convertPdfPageToImage } from '../../lib/pdfSignatureHelper';
import MockeefyLogo from '../../components/MockeefyLogo';
import PdfViewer from '../../components/PdfViewer';
import { getProfileImageUrl } from '../../lib/imageUtils';
import ExpertPageSkeleton from '../../components/ExpertPageSkeleton';

interface AgreementData {
  isSigned?: boolean;
  signedAt?: string;
  signedBy?: string;
  companyName?: string;
  jobTitle?: string;
  signatureFile?: { url: string; name: string };
  agreementPdf?: { url: string; name: string };
  agreedTerms?: boolean;
}

export default function AgreementPage({ onUpdate }: { onUpdate?: () => void } = {}) {
  const [loading, setLoading] = useState(true);
  const [agreement, setAgreement] = useState<AgreementData>({});
  const [expertDetails, setExpertDetails] = useState({
    name: '',
    email: '',
    company: '',
    title: ''
  });

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('upload');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const handleDownloadPdf = async () => {
    if (!agreement.agreementPdf?.url) return;
    try {
      const downloadUrl = getProfileImageUrl(agreement.agreementPdf.url);
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = agreement.agreementPdf.name || `Mockeefy_Agreement_${expertDetails.name || 'Expert'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      window.open(agreement.agreementPdf.url, '_blank');
    }
  };

  // Drawing canvas states & refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchAgreement();
  }, []);

  // Real-time synchronization when agreement is signed/updated in another session or admin
  useDataSync(['AGREEMENT_UPDATED', 'RECONNECTED'], () => {
    console.log('[Agreement] Received real-time AGREEMENT_UPDATED event');
    fetchAgreement();
  });

  const fetchAgreement = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/expert/agreement');
      if (res.data.success) {
        const ag = res.data.agreement || {};
        const det = res.data.expertDetails || {};
        setAgreement(ag);
        setExpertDetails(det);
        setCompanyName(ag.companyName || det.company || '');
        setJobTitle(ag.jobTitle || det.title || '');
        if (ag.isSigned) {
          setAgreedTerms(true);
        }
      }
    } catch (error) {
      console.error('Error fetching agreement:', error);
      toast.error('Failed to load agreement details');
    } finally {
      setLoading(false);
    }
  };

  // Drawing Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = 'clientY' in e ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'clientX' in e ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = 'clientY' in e ? e.clientY - rect.top : e.touches[0].clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#002f87';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureImage(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureImage(null);
  };

  // File Upload Handler (PDF or Image)
  const handleSignatureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Signature file must be smaller than 5MB');
      return;
    }

    try {
      setSignatureFile(file);
      if (file.type === 'application/pdf') {
        toast.info('Rendering signature from PDF...');
        const imageUrl = await convertPdfPageToImage(file);
        setSignatureImage(imageUrl);
        toast.success('Signature PDF loaded successfully!');
      } else if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setSignatureImage(event.target?.result as string);
          toast.success('Signature image loaded!');
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Please upload a PDF or an Image file (PNG/JPG)');
      }
    } catch (err: any) {
      console.error('Failed to process signature file:', err);
      toast.error('Failed to process signature file: ' + (err.message || ''));
    }
  };

  // Compile and Generate Signed PDF
  const handleSignAndGeneratePdf = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter your current working company name.');
      return;
    }
    if (!jobTitle.trim()) {
      toast.error('Please enter your current job title/designation.');
      return;
    }
    if (!signatureImage) {
      toast.error('Please provide your signature (upload PDF/image or draw).');
      return;
    }
    if (!agreedTerms) {
      toast.error('Please accept the agreement terms and declarations.');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.info('Compiling your signed agreement PDF...');

      const element = document.getElementById('printable-agreement-document');
      if (!element) throw new Error('Agreement template not found in DOM');

      const expertNameClean = (expertDetails.name || 'Expert').replace(/\s+/g, '_');
      const filename = `Mockeefy_Expert_Agreement_${expertNameClean}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 1. Generate PDF Worker
      // @ts-ignore
      const worker = html2pdf().from(element).set(opt);

      // Save PDF to user's device
      await worker.save();
      toast.success('Signed agreement PDF downloaded!');

      // Also get PDF as blob to save on the server
      const pdfBlob: Blob = await worker.output('blob');
      const generatedPdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // 2. Upload to server
      const formData = new FormData();
      formData.append('companyName', companyName);
      formData.append('jobTitle', jobTitle);
      formData.append('signedBy', expertDetails.name || 'Expert');
      formData.append('agreedTerms', 'true');
      formData.append('agreementPdf', generatedPdfFile);

      if (signatureFile) {
        formData.append('signatureFile', signatureFile);
      } else if (signatureImage) {
        // Convert canvas dataUrl to file
        const blob = await (await fetch(signatureImage)).blob();
        formData.append('signatureFile', new File([blob], 'signature.png', { type: 'image/png' }));
      }

      const res = await axios.post('/api/expert/agreement', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Agreement successfully recorded and verified!');
        setAgreement(res.data.agreement);
        setIsRevising(false);
        onUpdate?.();
      }
    } catch (error: any) {
      console.error('Failed to sign agreement:', error);
      toast.error(error.response?.data?.message || 'Failed to complete agreement signing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <ExpertPageSkeleton variant="agreement" />;
  }

  const isSigned = Boolean(agreement.isSigned);
  const formattedSignedDate = agreement.signedAt
    ? new Date(agreement.signedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Expert Service & Compliance Agreement</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isSigned && !isRevising
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isSigned && !isRevising ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {isSigned && !isRevising ? 'Signed & Active' : 'Signature Required'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official platform terms, moonlighting declaration, employer non-conflict warranty, and digital signature execution.
          </p>
        </div>

        {isSigned && !isRevising && (
          <div className="flex flex-wrap items-center gap-3">
            {agreement.agreementPdf?.url && (
              <>
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#004fcb] hover:bg-[#003bb5] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                  title="View signed agreement"
                >
                  <Eye className="w-4 h-4" /> View PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="Download agreement PDF"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setIsRevising(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Update / Re-sign
            </button>
          </div>
        )}
      </div>

      {/* Case 1: Already Signed Card */}
      {isSigned && !isRevising ? (
        <div className="bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200 rounded-2xl p-8 shadow-xs space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Your Agreement is Legally Executed</h3>
              <p className="text-sm text-slate-600">
                You executed the Mockeefy Expert Service & Compliance Agreement on <span className="font-semibold text-slate-800">{formattedSignedDate}</span>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Signed By</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{agreement.signedBy || expertDetails.name}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Associated Company</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{agreement.companyName || 'Not Specified'}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Designation / Role</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{agreement.jobTitle || 'Expert Mentor'}</p>
            </div>
          </div>

          {/* Signature Preview */}
          {agreement.signatureFile?.url && (
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Verified Digital Signature</p>
              <div className="inline-block bg-white p-3 border border-slate-200 rounded-xl shadow-xs">
                {agreement.signatureFile.url.endsWith('.pdf') ? (
                  <div className="flex items-center gap-2 text-xs text-[#004fcb]">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <span>Signature Document (PDF)</span>
                    <a href={agreement.signatureFile.url} target="_blank" rel="noreferrer" className="underline ml-1">View File</a>
                  </div>
                ) : (
                  <img src={agreement.signatureFile.url} alt="Signature" className="h-14 object-contain max-w-[200px]" />
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-emerald-100/70 text-xs text-slate-500">
            <span>Official Hash Reference: MCK-AGR-{Date.parse(agreement.signedAt || '').toString().slice(-8)}</span>
            <div className="flex items-center gap-4">
              {agreement.agreementPdf?.url && (
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(true)}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#004fcb] hover:text-[#003bb5] hover:underline cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview Document
                </button>
              )}
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Working proof undertaking confirmed
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: Agreement Form (To Sign or Re-sign) */
        <div className="space-y-8">
          {/* Section 1: Working Proof & Current Affiliation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-5 h-5 text-[#004fcb]" />
              <h3 className="text-base font-bold text-slate-900">Current Employment & Organization Information</h3>
            </div>
            <p className="text-xs text-slate-500">
              Provide your current organization details for the agreement covenant. You declare that mentoring on Mockeefy complies with your working company's policies.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Current Working Company *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google, Microsoft, TCS, Infosys"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#004fcb] focus:border-[#004fcb] outline-none transition-all pl-10"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Current Job Title / Designation *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Software Engineer, Engineering Manager"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#004fcb] focus:border-[#004fcb] outline-none transition-all pl-10"
                  />
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Terms & Conditions Agreement Reader */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#004fcb]" />
                <h3 className="text-base font-bold text-slate-900">Agreement Terms & Working Declarations</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Please read carefully</span>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/60 max-h-80 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed custom-scrollbar">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 text-sm">MOCKEEFY EXPERT SERVICE & EMPLOYMENT COMPLIANCE AGREEMENT</h4>
                <p className="text-[11px] text-slate-500">Effective between Mockeefy Technologies ("Platform") and the undersigned Expert ("Expert").</p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-1">1. Employer Non-Conflict & Moonlighting Warranty</h5>
                <p>
                  The Expert explicitly declares, warrants, and agrees that offering mock interview training, career mentorship, and advisory services on Mockeefy is conducted strictly in their personal capacity during off-work hours and does NOT violate any employment contract, company handbook policy, non-compete clause, or dual-employment/moonlighting regulation of their current employer ({companyName || 'your working company'}).
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-1">2. Undertaking to Submit Proof of Working Employment</h5>
                <p>
                  The Expert hereby irrevocably agrees and undertakes to furnish legitimate proof of current or past employment (including but not limited to company identity card, official offer letter, work email confirmation, or recent verification records) whenever requested by Mockeefy's compliance or verification audit team.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-1">3. Confidentiality & Protection of Employer Proprietary Information</h5>
                <p>
                  The Expert guarantees that under no circumstances will they share, disclose, or utilize confidential intellectual property, internal code repositories, client data, trade secrets, or non-public proprietary interview question pools belonging to their working employer. All mock scenarios must be educational and public-domain.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-1">4. Professional Ethics & Candidate Safety</h5>
                <p>
                  The Expert commits to absolute punctuality, respectful communication, constructive and unbiased feedback, and strict adherence to scheduled session timings. Solicitation of candidates for private off-platform payments or side contracts is strictly prohibited and subject to immediate account termination.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-1">5. Commercial Terms & Independent Contractor Status</h5>
                <p>
                  The Expert acts solely as an independent professional consultant and not an employee or agent of Mockeefy. Payouts are remitted in accordance with Mockeefy's transparent pricing engine, less statutory deductions and platform service fees.
                </p>
              </div>

              <div>
                <h5 className="font-bold text-slate-900 mb-1">6. Legally Binding Electronic Signature</h5>
                <p>
                  The Expert acknowledges that uploading a signature document (PDF or Image) or affixing an electronic digital signature constitutes an authorized, legally binding signature under the Information Technology Act.
                </p>
              </div>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-3 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-50/80 transition-colors">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#004fcb] rounded border-slate-300 focus:ring-[#004fcb]"
              />
              <span className="text-xs text-slate-700 font-medium leading-relaxed">
                I hereby declare that I have read, understood, and accept all terms of this Agreement. I confirm there is <span className="font-bold text-slate-900">no conflict of interest with my current employer ({companyName || 'Working Company'})</span>, and I undertake to submit my working proof whenever requested.
              </span>
            </label>
          </div>

          {/* Section 3: Signature Section (Upload PDF/Image OR Draw) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-[#004fcb]" />
                <h3 className="text-base font-bold text-slate-900">Affix Your Signature</h3>
              </div>
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSignatureMode('upload')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    signatureMode === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Upload PDF / Image
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    signatureMode === 'draw' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Draw Signature
                </button>
              </div>
            </div>

            {signatureMode === 'upload' ? (
              /* Signature Upload Mode */
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#004fcb] bg-slate-50/50 hover:bg-blue-50/20 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleSignatureFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-800">Click to upload signature</p>
                  <p className="text-xs text-slate-500 mt-1">Upload your signature as a PDF or image (PNG, JPG) up to 5MB</p>
                  {signatureFile && (
                    <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-[#004fcb] text-xs font-semibold rounded-full">
                      <FileCheck2 className="w-3.5 h-3.5" /> {signatureFile.name}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Drawing Canvas Mode */
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Sign with your mouse, trackpad, or touchscreen inside the box below:</p>
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner flex flex-col items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-40 cursor-crosshair touch-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline cursor-pointer"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>
            )}

            {/* Live Signature Preview Box */}
            {signatureImage && (
              <div className="mt-4 p-4 border border-slate-200 bg-slate-50/60 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Preview of Embedded Signature</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 inline-block">
                  <img src={signatureImage} alt="Signature Preview" className="h-16 object-contain max-w-[220px]" />
                </div>
                <p className="text-[11px] text-slate-400">This signature will be embedded into your official generated Agreement PDF.</p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {isRevising ? (
              <button
                type="button"
                onClick={() => setIsRevising(false)}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={handleSignAndGeneratePdf}
              disabled={isSubmitting || !agreedTerms || !signatureImage || !companyName.trim()}
              className="inline-flex items-center gap-2 bg-[#004fcb] hover:bg-[#003bb5] text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  Generating & Signing PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Sign & Generate Agreement PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIDDEN PRINTABLE AGREEMENT TEMPLATE CAPTURED BY HTML2PDF (Clean A4 layout) */}
      {/* ========================================================================= */}
      <div className="overflow-hidden h-0 w-0">
        <div
          id="printable-agreement-document"
          style={{
            width: '780px',
            padding: '36px 40px',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '12px',
            lineHeight: '1.5'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #004fcb', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#004fcb', letterSpacing: '-0.5px' }}>Mockeefy</div>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Professional Interview Training Platform</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}>EXPERT SERVICE & COMPLIANCE AGREEMENT</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Doc Ref: MCK-AGR-{Date.now().toString().slice(-8)}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Date: {formattedSignedDate}</div>
            </div>
          </div>

          {/* Parties */}
          <div style={{ backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '8px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#004fcb', textTransform: 'uppercase', marginBottom: '6px' }}>Contracting Parties</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>Platform Operator:</strong> Mockeefy Technologies Inc.<br />
                <strong>Role:</strong> Skill Assessment & Interview Training Platform
              </div>
              <div>
                <strong>Expert Name:</strong> {expertDetails.name || 'Expert'}<br />
                <strong>Current Employer:</strong> {companyName || 'Declared Employer'}<br />
                <strong>Designation:</strong> {jobTitle || 'Expert Consultant'}
              </div>
            </div>
          </div>

          {/* Legal Clauses */}
          <div style={{ spaceY: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>1. Employer Non-Conflict & Moonlighting Warranty</div>
              <div style={{ color: '#334155', textAlign: 'justify' }}>
                The Expert explicitly declares, covenants, and warrants that their enrollment and delivery of advisory, mentoring, and mock interview services on the Mockeefy platform are performed strictly in an individual personal capacity during personal off-hours, and do NOT breach or conflict with any employment contract, company policy, non-compete covenant, or moonlighting restrictions enforced by their current employer (<strong>{companyName || 'Current Employer'}</strong>).
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>2. Undertaking to Submit Proof of Employment</div>
              <div style={{ color: '#334155', textAlign: 'justify' }}>
                The Expert hereby undertakes, covenants, and agrees to furnish authentic, verifiable proof of current or past employment (such as official employee photo ID card, offer letter, work email verification, or relevant professional documentation) whenever requested by Mockeefy's compliance, security, or audit team. The Expert agrees that falsifying employment affiliations constitutes grounds for immediate termination and permanent forfeiture of platform privileges.
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>3. Confidentiality & Non-Disclosure of Proprietary Company Assets</div>
              <div style={{ color: '#334155', textAlign: 'justify' }}>
                The Expert guarantees that under no circumstances will they share, reproduce, disclose, or utilize confidential intellectual property, proprietary code, live client questions, trade secrets, or internal non-public information belonging to their primary employer. All mock interview guidance shall strictly be restricted to industry-standard educational frameworks.
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>4. Professional Code of Conduct & Candidate Welfare</div>
              <div style={{ color: '#334155', textAlign: 'justify' }}>
                The Expert agrees to maintain exemplary punctuality, respectful communication, unbiased feedback, and high pedagogical standards. Under no circumstances may an Expert solicit candidates for external private commercial arrangements or off-platform interactions.
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>5. Independent Contractor Relationship & Compensation</div>
              <div style={{ color: '#334155', textAlign: 'justify' }}>
                The Expert serves strictly as an independent contractor and not as an employee, partner, or agent of Mockeefy. Payouts are remitted in accordance with Mockeefy's pricing and payout schedules, subject to applicable platform fee deductions and statutory tax withholding.
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '2px' }}>6. Legal Validity of Digital Execution</div>
              <div style={{ color: '#334155', textAlign: 'justify' }}>
                This agreement has been electronically acknowledged and executed by the Expert through an authorized signature attachment, carrying full legal enforceability under applicable digital commerce and electronic record legislation.
              </div>
            </div>
          </div>

          {/* Signatures Footer */}
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Expert Signature */}
            <div style={{ width: '45%' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>Expert Digital Signature</div>
              <div style={{ height: '55px', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'center' }}>
                {signatureImage ? (
                  <img src={signatureImage} alt="Expert Signature" style={{ maxHeight: '50px', maxWidth: '180px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>Signature Affixed</span>
                )}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{expertDetails.name || 'Expert'}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Designation: {jobTitle || 'Expert Consultant'}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Date: {formattedSignedDate}</div>
            </div>

            {/* Mockeefy Seal */}
            <div style={{ width: '45%', textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>Authorized Platform Seal</div>
              <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ border: '2px solid #004fcb', borderRadius: '50%', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004fcb', fontSize: '8px', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>
                  Mockeefy<br />Verified
                </div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>Mockeefy Compliance Team</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Verified Digital Execution</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Valid Worldwide</div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF VIEWER MODAL */}
      {pdfModalOpen && agreement.agreementPdf?.url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#004fcb] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    Your Signed Agreement
                    <span className="text-xs font-normal text-gray-500">
                      • {agreement.signedBy || expertDetails.name}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Executed on {formattedSignedDate} for {agreement.companyName || expertDetails.company || 'Mockeefy'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPdfModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors ml-1 cursor-pointer"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Dedicated PDF Viewer without auto-download */}
            <div className="flex-1 overflow-hidden relative bg-slate-100">
              <PdfViewer
                url={getProfileImageUrl(agreement.agreementPdf.url)}
                fileName={agreement.agreementPdf.name || `Mockeefy_Agreement_${expertDetails.name || 'Expert'}.pdf`}
                className="h-full border-0 rounded-none shadow-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-2.5 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Legally executed platform agreement on Mockeefy.</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Signer: <strong className="text-gray-700">{agreement.signedBy || expertDetails.name}</strong></span>
                <span>•</span>
                <span>Company: <strong className="text-gray-700">{agreement.companyName || expertDetails.company || 'Mockeefy'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
