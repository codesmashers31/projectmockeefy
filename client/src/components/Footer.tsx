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
  src: '/media/illustrations/Friendly%20Headset%20Support%20Guide.png',
  alt: 'Friendly Interview Expert & 1-on-1 Mock Interview Guide',
};

// ============================================================================
// Pre-Footer Promo Banner (1-on-1 Mock Interviews Mentorship)
// ============================================================================
const PreFooterExpertsBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-blue-100/90 bg-gradient-to-br from-[#F4F7FE] via-[#F8FAFF] to-[#EFF4FE] p-5 sm:p-6 lg:py-6 lg:px-8 mb-8 sm:mb-10 shadow-xs">
      <style>{`
        @keyframes playfulFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-7px) rotate(-1deg);
          }
          66% {
            transform: translateY(5px) rotate(0.8deg);
          }
        }
        @keyframes auraGlow {
          0%, 100% {
            opacity: 0.45;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.06);
          }
        }
        .animate-playful-float {
          animation: playfulFloat 4.8s ease-in-out infinite;
        }
        .animate-aura-glow {
          animation: auraGlow 5s ease-in-out infinite;
        }
      `}</style>

      {/* Split Hero Grid with Left Content & Right Floating Illustration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left: Headline, Tagline, Highlights & Direct Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/90 border border-blue-200/80 text-[#0755E8] text-xs font-bold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0755E8] animate-pulse" />
            <span>1-on-1 Mock Interviews</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-[26px] font-heading font-black text-slate-900 tracking-tight leading-snug">
            Stand out among candidates with{' '}
            <span className="bg-gradient-to-r from-[#0755E8] to-blue-600 bg-clip-text text-transparent">
              1-on-1 mock interviews
            </span>
          </h2>

          <p className="text-slate-600 text-xs sm:text-[13px] font-medium leading-relaxed max-w-lg">
            Practice live technical, system design, and HR rounds with verified interview experts from Google, Amazon, Microsoft, and top startups. Receive detailed rubrics and actionable feedback to crack your dream role.
          </p>

          {/* Quick Value Highlights */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0755E8]" />
              <span>FAANG Interview Experts</span>
            </span>
            <span className="text-slate-300 font-bold">—</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0755E8]" />
              <span>Live 1-on-1 Call</span>
            </span>
            <span className="text-slate-300 font-bold">—</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0755E8]" />
              <span>Actionable Feedback</span>
            </span>
          </div>

          {/* Action Buttons: Find Mentors & Become a Mentor */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <Link
              to="/mentors"
              className="relative group overflow-hidden inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black tracking-tight bg-gradient-to-r from-[#0755E8] via-[#2A72FF] to-[#0440BD] bg-[length:200%_auto] hover:bg-[position:right_center] shadow-md shadow-[#0755E8]/25 hover:shadow-lg hover:shadow-[#0755E8]/35 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 border border-white/25 text-center cursor-pointer"
            >
              {/* Interactive sweeping light sheen */}
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

              {/* Glowing soft radial highlight */}
              <span className="absolute -top-6 -left-6 w-14 h-14 bg-white/20 rounded-full blur-md group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <span className="relative z-10">Find Interview Experts</span>
              <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>

            <Link
              to="/signup?role=expert"
              className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-[#0755E8] hover:border-blue-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all active:scale-95 text-center cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Become an Interview Expert</span>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold pt-0.5">
            <Users className="w-4 h-4 text-[#0755E8]" />
            <span>Trusted by 10,000+ candidates across Google, Meta & Amazon</span>
          </div>
        </div>

        {/* Right: Pure Illustration with NO card background or text badges, with playful floating animations */}
        <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
          <div
            onClick={() => navigate('/mentors')}
            className="group relative w-full max-w-[280px] sm:max-w-[320px] cursor-pointer select-none"
            title="Click to Find Verified Interview Experts"
          >
            {/* Soft ambient aura / glow behind the illustration */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-200/50 via-indigo-100/40 to-cyan-100/30 rounded-full blur-2xl pointer-events-none animate-aura-glow" />

            {/* Seamless floating illustration */}
            <div className="relative animate-playful-float transition-transform duration-500 group-hover:scale-105">
              <img
                src={BANNER_ILLUSTRATION.src}
                alt={BANNER_ILLUSTRATION.alt}
                className="w-full h-auto max-h-[180px] sm:max-h-[210px] md:max-h-[230px] object-contain drop-shadow-md select-none pointer-events-none"
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
      className="flex items-center gap-2 text-xs flex-wrap sm:flex-nowrap justify-center lg:justify-end"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <span className="font-extrabold text-slate-700 tracking-tight mr-1 text-[12.5px] shrink-0 flex items-center gap-1.5">
        <span>Get Hired at Top MNCs:</span>
      </span>

      {/* Horizontal Page-to-Page Sliding Viewport */}
      <div className="relative overflow-hidden w-[310px] sm:w-[350px] md:w-[370px] py-1">
        <div
          className="flex transition-transform duration-600 ease-in-out"
          style={{ transform: `translateX(-${currentPage * 100}%)` }}
        >
          {COMPANY_PAGES.map((page, pageIdx) => (
            <div
              key={pageIdx}
              className="w-full shrink-0 flex items-center justify-center lg:justify-end gap-1.5 sm:gap-2 px-0.5"
            >
              {page.map((company) => (
                <Link
                  key={company.name}
                  to={`/mentors?search=${encodeURIComponent(company.search)}`}
                  title={`Explore ${company.name} Interview Experts`}
                  className="inline-flex items-center px-2.5 sm:px-3 py-1 bg-white hover:bg-blue-50/80 border border-slate-200/90 hover:border-[#0755E8]/60 rounded-lg text-xs font-bold text-slate-800 hover:text-[#0755E8] shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
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
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-8 pb-16 lg:pt-10 lg:pb-10'}`}>
        
        {/* Pre-Footer Banner Card with Real Verified Scrolling Experts */}
        {!minimal && showAppBanner && <PreFooterExpertsBanner />}

        {/* Main Footer Links & Connect Section */}
        {!minimal && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.1fr_0.75fr_0.9fr_0.9fr_1.65fr] gap-8 lg:gap-5 xl:gap-8 items-start mb-10">
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
                For Interview Experts
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
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 sm:p-5 shadow-xs flex flex-col justify-between md:col-span-2 lg:col-auto">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">Book a Mock Session</h4>
                <p className="text-xs text-slate-500 mt-1.5 mb-4 leading-relaxed font-medium">
                  Practice 1-on-1 with verified tech leaders and get real-time feedback.
                </p>
                <Link
                  to="/mentors"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] whitespace-nowrap"
                >
                  <span>Find Interview Experts</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] text-slate-500 font-semibold">
                <span className="whitespace-nowrap">500+ Active Interview Experts</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>Live Now</span>
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