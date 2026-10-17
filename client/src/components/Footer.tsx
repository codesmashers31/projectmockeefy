import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Youtube, 
  Instagram, 
  Linkedin, 
  Mail, 
  ArrowRight, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MockeefyLogo from './MockeefyLogo';

interface FooterProps {
  minimal?: boolean;
  showSkeletons?: boolean;
  showAppBanner?: boolean;
}

// ============================================================================
// Minimalist Vector Illustration for 1-on-1 Mock Interviews Banner
// ============================================================================
const BANNER_ILLUSTRATION = {
  src: '/media/illustrations/mentor_banner_simple.jpg',
  alt: '1-on-1 Mock Interview Mentorship',
  tag: 'Expert Mentorship',
};

// ============================================================================
// Pre-Footer Interactive Illustration Card (Only Image with Floating Animations)
// ============================================================================
const PreFooterExpertsBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center py-3 mb-10 sm:mb-12">
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(-0.5deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(7px) rotate(0.5deg); }
        }
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-slow {
          animation: floatSlow 3.8s ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: floatReverse 4.2s ease-in-out infinite;
        }
        .animate-gentle-float {
          animation: gentleFloat 3s ease-in-out infinite;
        }
      `}</style>

      {/* Main Illustration Card (Exact match to User Screenshot with Interactive Floating Badges) */}
      <div
        onClick={() => navigate('/mentors')}
        className="group relative w-full max-w-[440px] sm:max-w-[480px] rounded-3xl cursor-pointer select-none transition-all duration-300"
        title="Click to Find Verified Mentors"
      >
        {/* Soft ambient background aura glow */}
        <div className="absolute -inset-3 bg-gradient-to-tr from-blue-100/60 via-indigo-50/40 to-transparent rounded-3xl blur-2xl pointer-events-none group-hover:scale-105 transition-transform duration-500" />

        <div className="relative rounded-3xl overflow-hidden border border-blue-100/90 bg-white/95 shadow-sm group-hover:shadow-xl group-hover:border-blue-200/90 transition-all duration-300 group-hover:-translate-y-1">
          <img
            src={BANNER_ILLUSTRATION.src}
            alt={BANNER_ILLUSTRATION.alt}
            className="w-full h-[260px] sm:h-[300px] md:h-[320px] object-cover object-top group-hover:scale-103 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Bottom soft gradient blend */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/95 via-white/40 to-transparent pointer-events-none" />

          {/* Top Right: Expert Mentorship Badge */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-blue-200/90 shadow-2xs text-xs font-bold text-[#0755E8] animate-gentle-float">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Expert Mentorship</span>
          </div>

          {/* Bottom Left: Be interview ready */}
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md text-xs font-bold text-slate-800 animate-float-slow">
            <span>💼</span>
            <span>Be interview ready</span>
          </div>

          {/* Bottom Right: Detailed evaluation */}
          <div className="absolute bottom-3.5 right-3.5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md text-xs font-bold text-slate-800 animate-float-reverse">
            <span className="text-[#0755E8]">📊</span>
            <span>Detailed evaluation</span>
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
  { name: 'Find Mentors', href: '/mentors' },
  { name: 'Pricing & Plans', href: '/plans' },
  { name: 'My Sessions', href: '/my-sessions' },
  { name: 'Interview Tips', href: '/tips' },
];

const mentorLinks = [
  { name: 'Become a Mentor', href: '/signup?role=expert' },
  { name: 'Mentor Sign In', href: '/signin' },
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
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-10 pb-20 lg:pt-12 lg:pb-10'}`}>
      {!minimal && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
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

          <div className="h-36 rounded-2xl bg-slate-100 shimmer-shining" />
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
// Top Mentors Companies Data (Paginated 3 per page for auto-scrolling)
// ============================================================================
const COMPANY_PAGES = [
  // Page 1: Google, Microsoft, Amazon
  [
    {
      name: 'Google',
      search: 'Google',
      hoverBorder: 'hover:border-blue-400',
      hoverBg: 'hover:bg-blue-50/50',
      hoverShadow: 'hover:shadow-blue-500/15',
      logo: (
        <svg className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      ),
    },
    {
      name: 'Microsoft',
      search: 'Microsoft',
      hoverBorder: 'hover:border-sky-400',
      hoverBg: 'hover:bg-sky-50/50',
      hoverShadow: 'hover:shadow-sky-500/15',
      logo: (
        <svg className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 23 23">
          <path fill="#f35325" d="M1 1h10v10H1z" />
          <path fill="#81bc06" d="M12 1h10v10H12z" />
          <path fill="#05a6f0" d="M1 12h10v10H1z" />
          <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
      ),
    },
    {
      name: 'Amazon',
      search: 'Amazon',
      hoverBorder: 'hover:border-amber-400',
      hoverBg: 'hover:bg-amber-50/50',
      hoverShadow: 'hover:shadow-amber-500/15',
      logo: (
        <svg className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="none">
          <path d="M20.1 19.11c-9.14 4.32-14.81.71-18.44-1.49-.22-.14-.6.03-.27.41 1.21 1.46 5.17 4.97 10.34 4.97 5.18 0 8.26-2.81 8.65-3.3.38-.48.11-.75-.28-.59zm2.57-1.41c-.25-.32-1.5-.38-2.28-.28-.79.09-1.97.57-1.87.86.05.11.16.06.7.01.54-.05 2.06-.24 2.37.17.32.41-.48 2.38-.63 2.7-.14.32.05.4.32.19.26-.21.74-.76 1.05-1.53.32-.78.52-1.87.34-2.12z" fill="#FF9900"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M13.95 10.29c0 1.13.03 2.08-.55 3.09-.46.82-1.2 1.32-2.02 1.32-1.13 0-1.78-.85-1.78-2.11 0-2.48 2.23-2.93 4.35-2.93v.63zm2.95 7.1c-.19.17-.47.18-.69.07-.97-.8-1.14-1.18-1.68-1.94-1.6 1.63-2.74 2.11-4.83 2.11-2.46 0-4.38-1.51-4.38-4.54 0-2.36 1.29-3.97 3.12-4.75 1.59-.7 3.81-.82 5.51-1.02V6.95c0-.69.05-1.51-.35-2.11-.36-.53-1.05-.75-1.65-.75-1.12 0-2.11.57-2.36 1.75-.05.26-.24.52-.5.53l-2.84-.3c-.24-.05-.51-.25-.44-.61.65-3.42 3.76-4.46 6.55-4.46 1.43 0 3.29.38 4.41 1.45 1.43 1.32 1.29 3.09 1.29 5.01v4.54c0 1.36.57 1.96 1.1 2.7.19.26.23.58-.01.77-.6.5-1.66 1.42-2.25 1.94z" fill="#232F3E"/>
        </svg>
      ),
    },
  ],
  // Page 2: Meta, Flipkart, Apple
  [
    {
      name: 'Meta',
      search: 'Meta',
      hoverBorder: 'hover:border-[#0081FB]',
      hoverBg: 'hover:bg-blue-50/50',
      hoverShadow: 'hover:shadow-blue-500/15',
      logo: (
        <svg className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="none">
          <path d="M16.92 5.05c-1.89 0-3.41 1.05-4.92 2.92-1.51-1.87-3.03-2.92-4.92-2.92C3.12 5.05 0 8.35 0 12.87c0 4.7 3.39 7.78 6.94 7.78 2.05 0 3.73-1.03 5.06-2.67 1.33 1.64 3.01 2.67 5.06 2.67 3.55 0 6.94-3.08 6.94-7.78 0-4.52-3.12-7.82-7.08-7.82zm-9.84 12.8c-2.34 0-4.32-2.14-4.32-5.02 0-2.88 1.98-5.02 4.32-5.02 1.62 0 2.98 1.05 4.19 3.06-1.39 2.5-2.73 6.98-4.19 6.98zm9.68 0c-1.46 0-2.8-4.48-4.19-6.98 1.21-2.01 2.57-3.06 4.19-3.06 2.34 0 4.32 2.14 4.32 5.02 0 2.88-1.98 5.02-4.32 5.02z" fill="#0081FB"/>
        </svg>
      ),
    },
    {
      name: 'Flipkart',
      search: 'Flipkart',
      hoverBorder: 'hover:border-[#2874F0]',
      hoverBg: 'hover:bg-blue-50/50',
      hoverShadow: 'hover:shadow-blue-500/15',
      logo: (
        <svg className="w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="#2874F0"/>
          <path d="M9.5 8C9.5 6.6 10.6 5.5 12 5.5s2.5 1.1 2.5 2.5" stroke="#FFE500" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
          <path d="M7 8.5L8.2 18.5C8.3 19.3 9 20 9.8 20h4.4c.8 0 1.5-.7 1.6-1.5L17 8.5H7z" fill="#FFE500"/>
          <path d="M12.8 11.2h-2v1.5h1.6v1.2h-1.6V17h-1.4v-6.8h3.4v1z" fill="#2874F0"/>
        </svg>
      ),
    },
    {
      name: 'Apple',
      search: 'Apple',
      hoverBorder: 'hover:border-slate-800',
      hoverBg: 'hover:bg-slate-100/70',
      hoverShadow: 'hover:shadow-slate-500/15',
      logo: (
        <svg className="w-3.5 h-3.5 shrink-0 fill-current text-slate-900 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 170 170">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.78-8.8-10.27-18.91-13.48-30.33-3.21-11.41-4.82-22.12-4.82-32.13 0-14.54 3.65-26.68 10.96-36.41 7.3-9.74 16.59-14.7 27.86-14.89 5.35 0 11.16 1.41 17.43 4.24 6.27 2.83 10.19 4.3 11.76 4.41 1.79-.11 5.92-1.63 12.39-4.57 6.47-2.93 12.18-4.29 17.13-4.08 12.63.65 22.84 5.33 30.63 14.04-11.09 6.74-16.52 16.09-16.3 28.05.22 9.57 3.86 17.61 10.92 24.14 7.07 6.52 15.38 10.33 24.95 11.41-2.07 6.31-4.79 12.55-8.16 18.72zm-35.84-112.59c0 7.4-2.67 14.36-8.02 20.88-5.35 6.52-11.85 10.43-19.5 11.73-.22-.87-.33-1.85-.33-2.93 0-7.17 2.88-14.24 8.64-21.2 5.76-6.95 12.44-10.97 20.05-12.06.11 1.19.16 2.38.16 3.58z" />
        </svg>
      ),
    },
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
      className="flex items-center gap-2 text-xs flex-wrap sm:flex-nowrap justify-center lg:justify-end"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <span className="font-extrabold text-slate-700 tracking-tight mr-1 text-[12.5px] shrink-0 flex items-center gap-1.5">
        <span>Top Mentors From:</span>
      </span>

      {/* Horizontal Page-to-Page Sliding Viewport */}
      <div className="relative overflow-hidden w-[310px] sm:w-[325px] py-1">
        <div
          className="flex transition-transform duration-600 ease-in-out"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
        >
          {COMPANY_PAGES.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="w-full shrink-0 flex items-center justify-center lg:justify-end gap-2 px-0.5"
            >
              {page.map((company) => (
                <Link
                  key={company.name}
                  to={`/mentors?search=${company.search}`}
                  title={`Explore ${company.name} Mentors`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white ${company.hoverBg} border border-slate-200/90 ${company.hoverBorder} rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-md ${company.hoverShadow} hover:-translate-y-0.5 active:scale-95 transition-all duration-200 group cursor-pointer shrink-0`}
                >
                  {company.logo}
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
          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-[#0755E8] hover:bg-blue-50 transition-colors cursor-pointer"
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
          className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-[#0755E8] hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Footer Component (Naukri Alignment + Mockeefy Web Identity)
// ============================================================================
const Footer = ({ minimal = false, showSkeletons = false, showAppBanner = true }: FooterProps) => {
  if (showSkeletons) {
    return <SkeletonFooter minimal={minimal} />;
  }

  return (
    <footer className="w-full border-t border-slate-200/80 bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-10 pb-20 lg:pt-12 lg:pb-10'}`}>
        
        {/* Pre-Footer Banner Card with Real Verified Scrolling Experts */}
        {!minimal && showAppBanner && <PreFooterExpertsBanner />}

        {/* Main Footer Links & Connect Section */}
        {!minimal && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6 xl:gap-8 items-start mb-10">
            {/* Column 1: Logo & Connect With Us */}
            <div className="space-y-5">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <MockeefyLogo className="h-8.5 w-8.5" variant="brand" />
                <span className="text-[20px] font-logo font-black tracking-tight text-[#0755E8] group-hover:text-[#0645C7] transition-colors">
                  Mockeefy
                </span>
              </Link>

              <div>
                <p className="text-[13px] font-extrabold text-slate-900 tracking-tight mb-3">
                  Connect with us
                </p>
                <div className="flex items-center gap-2.5 text-slate-500">
                  {/* YouTube */}
                  <a
                    href="https://www.youtube.com/@mockeefy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    title="YouTube"
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#FF0000]/10 hover:text-[#FF0000] flex items-center justify-center transition-all active:scale-95 border border-slate-200/60"
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
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#E4405F]/10 hover:text-[#E4405F] flex items-center justify-center transition-all active:scale-95 border border-slate-200/60"
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
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] flex items-center justify-center transition-all active:scale-95 border border-slate-200/60"
                  >
                    <Linkedin className="w-4 h-4 stroke-[2]" />
                  </a>

                  {/* Email */}
                  <a
                    href="mailto:support@mockeefy.com"
                    aria-label="Email support@mockeefy.com"
                    title="Email Us"
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#0755E8]/10 hover:text-[#0755E8] flex items-center justify-center transition-all active:scale-95 border border-slate-200/60"
                  >
                    <Mail className="w-4 h-4 stroke-[2]" />
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div>
              <p className="text-[13px] font-extrabold text-slate-900 tracking-tight mb-3">
                Platform
              </p>
              <ul className="space-y-2.5">
                {platformLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] font-medium text-slate-600 hover:text-[#0755E8] hover:translate-x-0.5 transition-all block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: For Mentors */}
            <div>
              <p className="text-[13px] font-extrabold text-slate-900 tracking-tight mb-3">
                For Mentors
              </p>
              <ul className="space-y-2.5">
                {mentorLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] font-medium text-slate-600 hover:text-[#0755E8] hover:translate-x-0.5 transition-all block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Legal & Policies */}
            <div>
              <p className="text-[13px] font-extrabold text-slate-900 tracking-tight mb-3">
                Legal & Trust
              </p>
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] font-medium text-slate-600 hover:text-[#0755E8] hover:translate-x-0.5 transition-all block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5: Right "Book a Mock Session" Action Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <h4 className="text-sm font-extrabold text-slate-900">Book a Mock Session</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed font-medium">
                Practice 1-on-1 with verified tech leaders and get real-time feedback.
              </p>
              <Link
                to="/mentors"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <span>Find Mentors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>500+ Active Mentors</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Now
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Horizontal Bar: Copyright & Trusted Mentors Strip */}
        <hr className="border-slate-200/80 my-7" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-5 text-xs text-slate-500">
          {/* Left: Trademark Notice */}
          <div className="text-center lg:text-left leading-relaxed">
            <p className="text-slate-400">All trademarks are the property of their respective owners.</p>
            <p className="font-semibold text-slate-700 mt-0.5">
              All rights reserved © {new Date().getFullYear()} Mockeefy Technologies Pvt. Ltd.
            </p>
          </div>

          {/* Right: Top Mentors From Interactive Auto-Scrolling Page-to-Page Slider */}
          <TopMentorsCompanySlider />
        </div>

      </div>
    </footer>
  );
};

export default Footer;