import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Youtube, Instagram, Linkedin, Mail, ArrowRight, Star, Sparkles, CheckCircle2 } from 'lucide-react';
import MockeefyLogo from './MockeefyLogo';

interface FooterProps {
  minimal?: boolean;
  showSkeletons?: boolean;
  showAppBanner?: boolean;
}

// ============================================================================
// Verified Experts for Scrolling Marquee Strip
// ============================================================================
const scrollingExperts = [
  {
    name: 'Priya Sharma',
    role: 'Senior SDE II',
    company: 'Google',
    avatar: '/media/avatars/300-1.png',
    rating: '4.9',
    sessions: '42 sessions',
  },
  {
    name: 'Rahul Verma',
    role: 'Staff Architect',
    company: 'Amazon',
    avatar: '/media/avatars/300-2.png',
    rating: '5.0',
    sessions: '68 sessions',
  },
  {
    name: 'Ananya Iyer',
    role: 'Frontend Lead',
    company: 'Microsoft',
    avatar: '/media/avatars/300-3.png',
    rating: '4.9',
    sessions: '35 sessions',
  },
  {
    name: 'Karthik Raja',
    role: 'Engineering Manager',
    company: 'Meta',
    avatar: '/media/avatars/300-5.png',
    rating: '4.8',
    sessions: '51 sessions',
  },
  {
    name: 'Sneha Patel',
    role: 'System Design Spec.',
    company: 'Flipkart',
    avatar: '/media/avatars/300-6.png',
    rating: '4.9',
    sessions: '29 sessions',
  },
  {
    name: 'Arjun Mehta',
    role: 'Cloud & DevOps Lead',
    company: 'Uber',
    avatar: '/media/avatars/300-8.png',
    rating: '5.0',
    sessions: '44 sessions',
  },
  {
    name: 'Divya Nambiar',
    role: 'Principal Engineer',
    company: 'Adobe',
    avatar: '/media/avatars/300-12.png',
    rating: '4.9',
    sessions: '38 sessions',
  },
  {
    name: 'Vikram Malhotra',
    role: 'Director of Eng.',
    company: 'Netflix',
    avatar: '/media/avatars/300-15.png',
    rating: '5.0',
    sessions: '73 sessions',
  },
  {
    name: 'Rohan Deshmukh',
    role: 'Backend Specialist',
    company: 'Apple',
    avatar: '/media/avatars/300-20.png',
    rating: '4.9',
    sessions: '31 sessions',
  },
];

// Duplicate list for infinite seamless marquee loop
const marqueeExperts = [...scrollingExperts, ...scrollingExperts];

// ============================================================================
// Pre-Footer Promo Banner with Scrolling Experts (No App / No QR Code)
// ============================================================================
const PreFooterExpertsBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-blue-100/90 bg-gradient-to-br from-[#F4F7FE] via-[#F8FAFF] to-[#EFF4FE] p-6 sm:p-8 lg:p-9 mb-12 sm:mb-14 shadow-xs">
      <style>{`
        @keyframes scrollExpertsMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-experts-marquee {
          display: flex;
          width: max-content;
          animation: scrollExpertsMarquee 32s linear infinite;
        }
        .animate-experts-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Top Section: Headline, Tagline & Direct Web Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-8 pb-6 border-b border-blue-100/70">
        <div className="max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0755E8] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#0755E8]" />
            1-on-1 Mock Interviews
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-heading font-extrabold text-slate-900 tracking-tight leading-snug">
            Stand out among candidates with 1-on-1 mock interviews
          </h2>

          <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
            Practice live technical, system design, and HR rounds with verified mentors from Google, Amazon, Microsoft, and top startups.
          </p>
        </div>

        {/* Action Buttons (Web Booking, no app links) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <Link
            to="/mentors"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-[#0755E8]/20 transition-all active:scale-95 text-center"
          >
            <span>Find Mentors</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/signup?role=expert"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 hover:text-[#0755E8] hover:border-blue-200 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-all active:scale-95 text-center"
          >
            <span>Become a Mentor</span>
          </Link>
        </div>
      </div>

      {/* Bottom Section: Scrolling Experts Track */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Top Verified Mentors
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-normal">
              · Ready for live sessions
            </span>
          </div>
          <Link to="/mentors" className="text-xs font-bold text-[#0755E8] hover:underline flex items-center gap-1">
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Marquee Container with Gradient Fade Edges */}
        <div className="relative overflow-hidden w-full py-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-[#F4F7FE] to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-[#EFF4FE] to-transparent z-10" />

          <div className="animate-experts-marquee flex items-center gap-3.5">
            {marqueeExperts.map((expert, idx) => (
              <div
                key={`${expert.name}-${idx}`}
                onClick={() => navigate('/mentors')}
                className="flex items-center gap-3 px-3.5 py-2.5 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs shrink-0 w-56 sm:w-60 hover:border-[#0755E8] hover:shadow-sm hover:-translate-y-0.5 transition-all group cursor-pointer"
              >
                {/* Expert Photo */}
                <div className="relative shrink-0">
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0755E8] text-white flex items-center justify-center text-[9px] font-bold border-2 border-white">
                    ✓
                  </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-800 truncate group-hover:text-[#0755E8] transition-colors">
                      {expert.name}
                    </p>
                    <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold shrink-0">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{expert.rating}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{expert.role}</p>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="font-bold text-[#0755E8] bg-blue-50 px-1.5 py-0.5 rounded">
                      {expert.company}
                    </span>
                    <span className="text-slate-400">{expert.sessions}</span>
                  </div>
                </div>
              </div>
            ))}
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
// Main Footer Component (Naukri Alignment + Mockeefy Web Identity)
// ============================================================================
const Footer = ({ minimal = false, showSkeletons = false, showAppBanner = true }: FooterProps) => {
  if (showSkeletons) {
    return <SkeletonFooter minimal={minimal} />;
  }

  return (
    <footer className="w-full border-t border-slate-200/80 bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-10 pb-20 lg:pt-12 lg:pb-10'}`}>
        
        {/* Pre-Footer Banner Card with Scrolling Experts */}
        {!minimal && showAppBanner && <PreFooterExpertsBanner />}

        {/* Main Footer Links & Connect Section */}
        {!minimal && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6 xl:gap-8 items-start mb-10">
            {/* Column 1: Logo & Connect With Us */}
            <div className="space-y-5">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <MockeefyLogo className="h-8.5 w-8.5" variant="brand" />
                <span className="text-[20px] font-logo font-bold tracking-tight text-[#0755E8] group-hover:text-[#0645C7] transition-colors">
                  Mockeefy
                </span>
              </Link>

              <div>
                <p className="text-xs font-bold text-slate-800 tracking-wide mb-3">
                  Connect with us
                </p>
                <div className="flex items-center gap-3.5 text-slate-400">
                  {/* YouTube */}
                  <a
                    href="https://www.youtube.com/@mockeefy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    title="YouTube"
                    className="hover:text-[#FF0000] hover:scale-110 active:scale-95 transition-all"
                  >
                    <Youtube className="w-5 h-5 stroke-[1.8]" />
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://www.instagram.com/mockeefy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    title="Instagram"
                    className="hover:text-[#E4405F] hover:scale-110 active:scale-95 transition-all"
                  >
                    <Instagram className="w-5 h-5 stroke-[1.8]" />
                  </a>

                  {/* LinkedIn */}
                  <a
                    href="https://www.linkedin.com/company/mockeefy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    title="LinkedIn"
                    className="hover:text-[#0A66C2] hover:scale-110 active:scale-95 transition-all"
                  >
                    <Linkedin className="w-5 h-5 stroke-[1.8]" />
                  </a>

                  {/* Email */}
                  <a
                    href="mailto:support@mockeefy.com"
                    aria-label="Email support@mockeefy.com"
                    title="Email Us"
                    className="hover:text-[#0755E8] hover:scale-110 active:scale-95 transition-all"
                  >
                    <Mail className="w-5 h-5 stroke-[1.8]" />
                  </a>
                </div>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div>
              <p className="text-xs font-bold text-slate-800 tracking-wide mb-3">
                Platform
              </p>
              <ul className="space-y-2.5">
                {platformLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] text-slate-600 hover:text-[#0755E8] transition-colors block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: For Mentors */}
            <div>
              <p className="text-xs font-bold text-slate-800 tracking-wide mb-3">
                For Mentors
              </p>
              <ul className="space-y-2.5">
                {mentorLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] text-slate-600 hover:text-[#0755E8] transition-colors block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Legal & Policies */}
            <div>
              <p className="text-xs font-bold text-slate-800 tracking-wide mb-3">
                Legal & Trust
              </p>
              <ul className="space-y-2.5">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-[13px] text-slate-600 hover:text-[#0755E8] transition-colors block py-0.5 leading-snug"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 5: Right "Book a Mock Session" Action Card (No App references) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900">Book a Mock Session</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                Practice 1-on-1 with verified tech leaders and get real-time feedback.
              </p>
              <Link
                to="/mentors"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <span>Find Mentors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          {/* Left: Trademark Notice */}
          <div className="text-center sm:text-left leading-relaxed">
            <p className="text-slate-400">All trademarks are the property of their respective owners.</p>
            <p className="font-medium text-slate-600 mt-0.5">
              All rights reserved © {new Date().getFullYear()} Mockeefy Technologies Pvt. Ltd.
            </p>
          </div>

          {/* Right: Top Mentors From Brand Tags */}
          <div className="flex items-center gap-3 text-xs flex-wrap justify-center sm:justify-end">
            <span className="font-semibold text-slate-400">Top Mentors From:</span>
            <span className="font-bold text-slate-600 hover:text-[#0755E8] transition-colors cursor-default">Google</span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-slate-600 hover:text-[#0755E8] transition-colors cursor-default">Microsoft</span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-slate-600 hover:text-[#0755E8] transition-colors cursor-default">Amazon</span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-slate-600 hover:text-[#0755E8] transition-colors cursor-default">Meta</span>
            <span className="text-slate-300">·</span>
            <span className="font-bold text-slate-600 hover:text-[#0755E8] transition-colors cursor-default">Flipkart</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;