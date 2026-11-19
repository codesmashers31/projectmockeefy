import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Youtube, 
  Instagram, 
  Linkedin, 
  Mail, 
  ArrowRight, 
  Sparkles,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import MockeefyLogo from './MockeefyLogo';

interface FooterProps {
  minimal?: boolean;
  showSkeletons?: boolean;
  showAppBanner?: boolean;
  maxWidth?: string;
}

// ============================================================================
// Minimalist Vector Illustration for 1-on-1 Mock Interviews Banner
// ============================================================================
const BANNER_ILLUSTRATION = {
  src: '/media/illustrations/Friendly%20Headset%20Support%20Guide.png',
  alt: 'Friendly Interview Expert & 1-on-1 Mock Interview Guide',
};

// ============================================================================
// Pre-Footer Promo Banner (1-on-1 Mock Interviews Mentorship)
// ============================================================================
const PreFooterExpertsBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-gradient-to-br from-white via-[#F7FAFF] to-[#EFF5FF] p-6 sm:p-8 lg:p-9 mb-8 sm:mb-12 shadow-[0_12px_40px_-15px_rgba(7,85,232,0.08)]">
      {/* Decorative subtle ambient glows */}
      <div className="absolute -top-16 -left-16 w-56 h-56 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-indigo-300/15 rounded-full blur-3xl pointer-events-none" />

      <style>{`
        @keyframes playfulFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-6px) rotate(-0.8deg);
          }
          66% {
            transform: translateY(4px) rotate(0.6deg);
          }
        }
        .animate-playful-float {
          animation: playfulFloat 5s ease-in-out infinite;
        }
      `}</style>

      {/* Split Hero Grid with Left Content & Right Floating Illustration */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left: Headline, Tagline, Highlights & Direct Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF2FF] border border-blue-200/70 text-[#0755E8] text-[10.5px] font-extrabold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0755E8]" />
            <span>1-ON-1 MOCK INTERVIEWS</span>
          </div>

          {/* Clean Headline with NO underline under 1-on-1 mock interviews */}
          <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-heading font-black text-slate-900 tracking-tight leading-[1.2]">
            Stand out among candidates with{" "}
            <span className="text-[#0755E8]">
              1-on-1 mock interviews
            </span>
          </h2>

          <p className="text-slate-600 text-xs sm:text-[13.5px] font-medium leading-relaxed max-w-lg">
            Practice live technical, system design, and behavioral rounds with verified interview experts from <strong className="text-slate-800 font-bold">Google</strong>, <strong className="text-slate-800 font-bold">Amazon</strong>, <strong className="text-slate-800 font-bold">Microsoft</strong>, and tier-1 tech startups. Receive actionable feedback and rubrics to land top offers.
          </p>

          {/* Value Feature Chips with Green Checkmarks */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>FAANG Interview Mentors</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Real-Time Code & Architecture</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Actionable Rubrics & Report</span>
            </span>
          </div>

          {/* Action Buttons: Find Mentors & Become a Mentor */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <Link
              to="/mentors"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold bg-[#0755E8] hover:bg-[#0645C7] shadow-sm hover:shadow-md transition-all active:scale-95 text-center cursor-pointer"
            >
              <span>Find Interview Experts</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/signup?role=expert"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200/90 text-slate-700 hover:text-[#0755E8] hover:border-blue-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-95 text-center cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Become an Interview Expert</span>
            </Link>
          </div>

          {/* Social Proof with Colored Company Avatars */}
          <div className="flex items-center gap-2.5 pt-1">
            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
              <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-[#4285F4] text-white text-[9px] font-black ring-2 ring-white">
                G
              </span>
              <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-[#0668E1] text-white text-[9px] font-black ring-2 ring-white">
                M
              </span>
              <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-[#FF9900] text-slate-900 text-[9px] font-black ring-2 ring-white">
                A
              </span>
              <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-full bg-[#00A4EF] text-white text-[8px] font-black ring-2 ring-white">
                MS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Trusted by <strong className="text-slate-800 font-bold">10,000+ candidates</strong> across Google, Meta, Amazon & Microsoft
            </p>
          </div>
        </div>

        {/* Right: Illustration with 3 Floating Badge Cards */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center select-none">
            {/* Concentric rings background */}
            <div className="absolute inset-0 m-auto w-[280px] h-[280px] sm:w-[310px] sm:h-[310px] rounded-full border border-blue-100/90 bg-gradient-to-b from-blue-50/50 via-white/80 to-transparent flex items-center justify-center">
              <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full border border-blue-100/60" />
            </div>

            {/* Floating Card 1: Top-Right Rating */}
            <div className="absolute top-1 right-0 sm:top-2 sm:right-2 bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-slate-200/90 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] flex items-center gap-2 z-20">
              <span className="text-amber-400 text-sm">⭐</span>
              <div>
                <div className="text-xs font-black text-slate-900 leading-tight">4.9/5 Rating</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">2,400+ reviews</div>
              </div>
            </div>

            {/* Floating Pill 2: Top-Left Live Code Sandbox */}
            <div className="absolute top-10 -left-2 sm:top-12 sm:left-0 bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 border border-slate-200/90 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] flex items-center gap-2 z-20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-800">Live Code Sandbox</span>
            </div>

            {/* Floating Card 3: Bottom-Left Success Rate */}
            <div className="absolute bottom-2 -left-2 sm:bottom-4 sm:left-0 bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-slate-200/90 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] flex items-center gap-2 z-20">
              <span className="text-base">🎯</span>
              <div>
                <div className="text-xs font-black text-slate-900 leading-tight">92% Success</div>
                <div className="text-[10px] text-slate-400 font-medium leading-tight">Offer within 60 days</div>
              </div>
            </div>

            {/* Center Floating Illustration */}
            <div
              onClick={() => navigate('/mentors')}
              className="relative z-10 animate-playful-float cursor-pointer transition-transform duration-300 hover:scale-105"
              title="Click to Find Verified Interview Experts"
            >
              <img
                src={BANNER_ILLUSTRATION.src}
                alt={BANNER_ILLUSTRATION.alt}
                className="w-full h-auto max-h-[190px] sm:max-h-[220px] md:max-h-[235px] object-contain drop-shadow-md pointer-events-none"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Footer Links Data (Only Real Mockeefy Routes)
// ============================================================================
const platformLinks = [
  { name: 'About Mockeefy', href: '/' },
  { name: 'Find Interview Experts', href: '/mentors' },
  { name: 'Pricing & Plans', href: '/plans' },
  { name: 'My Sessions', href: '/my-sessions' },
  { name: 'Interview Tips', href: '/tips' },
];

const mentorLinks = [
  { name: 'Become an Interview Expert', href: '/signup?role=expert' },
  { name: 'Interview Expert Sign In', href: '/signin' },
  { name: 'Verify Credentials', href: '/certificates' },
  { name: 'Watch Mock Interviews', href: '/watch-mock' },
  { name: 'Help & Support', href: '/help' },
];

const legalLinks = [
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Terms & Conditions', href: '/terms' },
  { name: 'Refund & Cancellation', href: '/refund-cancellation' },
  { name: 'Return Policy', href: '/return-policy' },
  { name: 'Shipping Policy', href: '/shipping-policy' },
];

// ============================================================================
// Skeleton Loading Footer
// ============================================================================
const SkeletonFooter = ({ minimal }: { minimal: boolean }) => (
  <footer className="w-full border-t border-slate-200/80 bg-white">
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-8 pb-16 lg:pt-10 lg:pb-10'}`}>
      {!minimal && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.1fr_0.75fr_0.9fr_0.9fr_1.65fr] gap-8 lg:gap-5 xl:gap-8 items-start mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8.5 w-8.5 rounded-xl bg-slate-100 shimmer-shining border border-slate-200/50" />
              <div className="h-6 w-24 rounded-lg bg-slate-100 shimmer-shining border border-slate-200/50" />
            </div>
            <div className="h-3 w-32 bg-slate-100 rounded shimmer-shining" />
            <div className="flex gap-3 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-100 shimmer-shining" />
              ))}
            </div>
          </div>

          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-20 rounded bg-slate-100 shimmer-shining" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-3 w-28 rounded bg-slate-100 shimmer-shining" />
              ))}
            </div>
          ))}

          <div className="h-36 rounded-2xl bg-slate-100 shimmer-shining md:col-span-2 lg:col-auto" />
        </div>
      )}

      <div className="border-t border-slate-100 pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-3.5 w-60 rounded bg-slate-100 shimmer-shining" />
          <div className="h-3.5 w-72 rounded bg-slate-100 shimmer-shining" />
        </div>
      </div>
    </div>
  </footer>
);

// ============================================================================
// Top MNCs & Chennai-Based Companies Data (Names only, no logos as requested)
// ============================================================================
const COMPANY_PAGES = [
  // Page 1: Google, Microsoft, Zoho, HCL
  [
    { name: 'Google', search: 'Google' },
    { name: 'Microsoft', search: 'Microsoft' },
    { name: 'Zoho', search: 'Zoho' },
    { name: 'HCL', search: 'HCL' },
  ],
  // Page 2: Amazon, Freshworks, Cognizant, TCS
  [
    { name: 'Amazon', search: 'Amazon' },
    { name: 'Freshworks', search: 'Freshworks' },
    { name: 'Cognizant', search: 'Cognizant' },
    { name: 'TCS', search: 'TCS' },
  ],
  // Page 3: PayPal, Meta, Infosys, Wipro
  [
    { name: 'PayPal', search: 'PayPal' },
    { name: 'Meta', search: 'Meta' },
    { name: 'Infosys', search: 'Infosys' },
    { name: 'Wipro', search: 'Wipro' },
  ],
];

// ============================================================================
// Top Mentors Company Slider with Automatic Horizontal Page-by-Page Scrolling
// ============================================================================
const TopMentorsCompanySlider = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % COMPANY_PAGES.length);
    }, 3200);

    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <div
      className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="font-extrabold text-slate-900 tracking-wider text-xs uppercase shrink-0 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-[#0755E8]" />
        <span>GET HIRED AT TOP MNCS:</span>
      </div>

      <div className="flex items-center gap-2 justify-center sm:justify-end flex-wrap sm:flex-nowrap">
        {/* Horizontal Page-to-Page Sliding Viewport */}
        <div className="relative overflow-hidden w-[310px] sm:w-[350px] md:w-[410px] py-1">
          <div
            className="flex transition-transform duration-600 ease-in-out"
            style={{ transform: `translateX(-${currentPage * 100}%)` }}
          >
            {COMPANY_PAGES.map((page, pageIdx) => (
              <div
                key={pageIdx}
                className="w-full shrink-0 flex items-center justify-center sm:justify-end gap-1.5 sm:gap-2 px-0.5"
              >
                {page.map((company) => (
                  <Link
                    key={company.name}
                    to={`/mentors?search=${encodeURIComponent(company.search)}`}
                    title={`Explore ${company.name} Interview Experts`}
                    className="inline-flex items-center px-3 py-1 bg-white hover:bg-[#0755E8] border border-slate-200/90 hover:border-[#0755E8] rounded-xl text-xs font-bold text-slate-700 hover:text-white shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
                  >
                    <span>{company.name}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Controls: Previous / Pagination Dots / Next */}
        <div className="flex items-center gap-1 pl-1 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => (prev - 1 + COMPANY_PAGES.length) % COMPANY_PAGES.length)}
            aria-label="Previous companies"
            title="Previous companies"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0755E8] hover:bg-blue-50 border border-slate-200/60 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1">
            {COMPANY_PAGES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPage(idx)}
                aria-label={`Go to page ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentPage === idx
                    ? 'w-3.5 bg-[#0755E8]'
                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => (prev + 1) % COMPANY_PAGES.length)}
            aria-label="Next companies"
            title="Next companies"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#0755E8] hover:bg-blue-50 border border-slate-200/60 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Footer Component (Naukri Alignment + Mockeefy Web Identity)
// ============================================================================
const Footer = ({ minimal = false, showSkeletons = false, showAppBanner = true, maxWidth = "max-w-7xl" }: FooterProps) => {
  if (showSkeletons) {
    return <SkeletonFooter minimal={minimal} />;
  }

  return (
    <footer className="w-full border-t border-slate-200/90 bg-gradient-to-b from-white via-[#F8FAFF] to-white relative overflow-hidden">
      {/* Decorative subtle ambient backdrop glow */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-100/25 rounded-full blur-3xl pointer-events-none" />

      <div className={`relative z-10 ${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-8 pb-16 lg:pt-10 lg:pb-10'}`}>
        
        {/* Pre-Footer Banner Card with Real Verified Scrolling Experts */}
        {!minimal && showAppBanner && <PreFooterExpertsBanner />}

        {/* Main Footer Links & Connect Section */}
        {!minimal && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.1fr_0.75fr_0.9fr_0.9fr_1.65fr] gap-8 lg:gap-5 xl:gap-8 items-start mb-10">
            {/* Column 1: Logo & Connect With Us */}
            <div className="space-y-4">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <MockeefyLogo className="h-9 w-9 rounded-xl shadow-2xs" variant="brand" />
                <span className="text-[21px] font-logo font-black tracking-tight text-[#0755E8] group-hover:text-[#0645C7] transition-colors">
                  Mockeefy
                </span>
              </Link>

              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[240px]">
                Accelerate your tech career with verified interview coaching, real-time code execution, and personalized system design rubrics.
              </p>

              <div className="pt-1">
                <p className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2.5">
                  CONNECT WITH US
                </p>
                <div className="flex items-center gap-2 text-slate-500">
                  {/* YouTube */}
                  <a
                    href="https://www.youtube.com/@mockeefy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    title="YouTube"
                    className="w-8.5 h-8.5 rounded-xl bg-white hover:bg-[#FF0000]/10 text-slate-600 hover:text-[#FF0000] hover:border-[#FF0000]/30 flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 border border-slate-200/80 shadow-2xs"
                  >
                    <Youtube className="w-4 h-4 stroke-[2]" />
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://www.instagram.com/mockeefy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    title="Instagram"
                    className="w-8.5 h-8.5 rounded-xl bg-white hover:bg-[#E4405F]/10 text-slate-600 hover:text-[#E4405F] hover:border-[#E4405F]/30 flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 border border-slate-200/80 shadow-2xs"
                  >
                    <Instagram className="w-4 h-4 stroke-[2]" />
                  </a>

                  {/* LinkedIn */}
                  <a
                    href="https://www.linkedin.com/company/mockeefy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    title="LinkedIn"
                    className="w-8.5 h-8.5 rounded-xl bg-white hover:bg-[#0A66C2]/10 text-slate-600 hover:text-[#0A66C2] hover:border-[#0A66C2]/30 flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 border border-slate-200/80 shadow-2xs"
                  >
                    <Linkedin className="w-4 h-4 stroke-[2]" />
                  </a>

                  {/* Email */}
                  <a
                    href="mailto:support@mockeefy.com"
                    aria-label="Email support@mockeefy.com"
                    title="Email Us"
                    className="w-8.5 h-8.5 rounded-xl bg-white hover:bg-blue-50 text-slate-600 hover:text-[#0755E8] hover:border-blue-300 flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 border border-slate-200/80 shadow-2xs"
                  >
                    <Mail className="w-4 h-4 stroke-[2]" />
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                <span>Platform</span>
              </p>
              <ul className="space-y-2">
                {platformLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] font-medium text-slate-600 hover:text-[#0755E8] hover:translate-x-1 transition-all inline-block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: For Mentors */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                <span>For Interview Experts</span>
              </p>
              <ul className="space-y-2">
                {mentorLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] font-medium text-slate-600 hover:text-[#0755E8] hover:translate-x-1 transition-all inline-block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Legal & Policies */}
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0755E8]" />
                <span>Legal & Trust</span>
              </p>
              <ul className="space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] font-medium text-slate-600 hover:text-[#0755E8] hover:translate-x-1 transition-all inline-block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5: Right "Book a Mock Session" Action Card */}
            <div className="relative rounded-[24px] border border-blue-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-5 shadow-xs overflow-hidden flex flex-col justify-between md:col-span-2 lg:col-auto group/card">
              {/* Decorative ambient lighting */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] text-[#0755E8] flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Book a Mock Session</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium pt-0.5">
                  Practice 1-on-1 with verified tech leaders and get real-time actionable feedback.
                </p>
                <div className="pt-2">
                  <Link
                    to="/mentors"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0755E8] to-[#0440BD] hover:from-[#0645C7] hover:to-[#033496] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98] whitespace-nowrap"
                  >
                    <span>Find Interview Experts</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover/card:translate-x-0.5" />
                  </Link>
                </div>
              </div>

              <div className="relative z-10 mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-slate-500 font-semibold">
                <span className="whitespace-nowrap">500+ Active Experts</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Now</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Horizontal Bar: Top MNCs Strip */}
        <hr className="border-slate-200/80 my-7" />

        <div className="py-1">
          <TopMentorsCompanySlider />
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11.5px] text-slate-400 text-center sm:text-left">
          <p>
            All trademarks are the property of their respective owners. <span className="mx-1">•</span> © {new Date().getFullYear()} Mockeefy Technologies Pvt. Ltd. All rights reserved.
          </p>
          <p className="font-medium text-slate-500">
            Made with excellence for engineers worldwide
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;