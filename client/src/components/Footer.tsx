import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { getProfileImageUrl } from '../lib/imageUtils';
import { getCurrentCompany, getJobTitle } from '../lib/expertUtils';
import { Youtube, Instagram, Linkedin, Mail, ArrowRight, Star, Sparkles } from 'lucide-react';
import MockeefyLogo from './MockeefyLogo';

interface FooterProps {
  minimal?: boolean;
  showSkeletons?: boolean;
  showAppBanner?: boolean;
}

// ============================================================================
// Pre-Footer Promo Banner with Real Verified Experts Scrolling Track
// ============================================================================
const PreFooterExpertsBanner = () => {
  const navigate = useNavigate();

  // Fetch real verified active experts from the API
  const { data: expertsData = [], isLoading } = useQuery({
    queryKey: ['footerVerifiedExperts'],
    queryFn: async () => {
      const res = await axios.get('/api/expert/verified');
      return Array.isArray(res.data) ? res.data : res.data.data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Map to top interview experts from our real database
  const realExperts = useMemo(() => {
    if (!Array.isArray(expertsData) || expertsData.length === 0) {
      return [];
    }

    const mapped = expertsData.map((expert: any) => {
      const cat =
        expert.personalInformation?.category ||
        expert.category ||
        expert.professionalDetails?.industry ||
        'Software Engineering';

      const name =
        expert.personalInformation?.userName ||
        expert.name ||
        expert.userDetails?.name ||
        'Verified Mentor';

      const company = getCurrentCompany(expert.professionalDetails, cat);
      const role = getJobTitle(expert.professionalDetails, cat);
      const rating = expert.metrics?.avgRating
        ? Number(expert.metrics.avgRating).toFixed(1)
        : '5.0';
      const totalSessions = expert.metrics?.totalSessions || expert.metrics?.totalReviews || 12;
      const avatar = getProfileImageUrl(expert.profileImage);
      const initials = name
        .trim()
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return {
        id: expert._id || expert.userId,
        name,
        role,
        company,
        rating,
        sessions: `${totalSessions} sessions`,
        avatar,
        initials,
        numericRating: Number(expert.metrics?.avgRating || 5),
        numericSessions: totalSessions,
      };
    });

    // Sort by top interview experts (rating and sessions)
    return mapped
      .sort((a, b) => b.numericRating * 10 + b.numericSessions - (a.numericRating * 10 + a.numericSessions))
      .slice(0, 16);
  }, [expertsData]);

  // Duplicate for seamless infinite marquee loop
  const marqueeList = useMemo(() => {
    if (realExperts.length === 0) return [];
    return [...realExperts, ...realExperts];
  }, [realExperts]);

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
          animation: scrollExpertsMarquee 34s linear infinite;
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

        {/* Action Buttons */}
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

      {/* Bottom Section: Scrolling Experts Track (Using Real Mentors from DB) */}
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

          {isLoading && realExperts.length === 0 ? (
            /* Loading Skeletons */
            <div className="flex items-center gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-56 sm:w-60 h-16 bg-white/70 rounded-2xl border border-slate-200/50 shimmer-shining shrink-0"
                />
              ))}
            </div>
          ) : (
            /* Real Verified Mentors Marquee */
            <div className="animate-experts-marquee flex items-center gap-3.5">
              {marqueeList.map((expert, idx) => (
                <div
                  key={`${expert.id}-${idx}`}
                  onClick={() => navigate(`/book-session?expertId=${expert.id}`)}
                  className="flex items-center gap-3 px-3.5 py-2.5 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-2xs shrink-0 w-56 sm:w-60 hover:border-[#0755E8] hover:shadow-sm hover:-translate-y-0.5 transition-all group cursor-pointer"
                >
                  {/* Real Expert Photo */}
                  <div className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-xs bg-slate-100 flex items-center justify-center">
                    <img
                      src={expert.avatar}
                      alt={expert.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="text-[11px] font-black text-[#0755E8] select-none absolute">
                      {expert.initials}
                    </span>
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0755E8] text-white flex items-center justify-center text-[9px] font-bold border-2 border-white z-10">
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
                      <span className="font-bold text-[#0755E8] bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[90px]">
                        {expert.company}
                      </span>
                      <span className="text-slate-400 truncate">{expert.sessions}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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

          {/* Right: Top Mentors From Branded Badges */}
          <div className="flex items-center gap-2 text-xs flex-wrap justify-center lg:justify-end">
            <span className="font-extrabold text-slate-700 tracking-tight mr-1 text-[12.5px]">
              Top Mentors From:
            </span>

            {/* Google Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-default select-none">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Google</span>
            </span>

            {/* Microsoft Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-default select-none">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span>Microsoft</span>
            </span>

            {/* Amazon Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-default select-none">
              <svg className="w-3.5 h-3.5 shrink-0 text-[#FF9900]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.9 14.8c-2.4 1.7-5.9 2.6-8.9 2.6-4.2 0-8-1.5-10.8-4.1-.2-.2-.2-.5 0-.7.3-.2.6-.2.8 0 2.6 2.4 6.2 3.8 10.1 3.8 2.8 0 6.1-.8 8.4-2.4.4-.3.9.1.8.5-.1.1-.2.2-.4.3zm6.6-1.5c-.3-.4-1.8-.2-2.5 0-.2 0-.3-.2-.1-.3 1.3-.9 3.4-.6 3.7-.3.3.3.1 2.5-1.1 3.5-.2.2-.4.1-.3-.1.4-.7.6-2.4.3-2.8z" />
                <path d="M14.5 3.5c-3.1 0-5.7 2.1-5.7 5.6 0 3.2 2.1 5.3 5.4 5.3 1.6 0 3.1-.6 4-1.7v1.4c0 .2.2.4.4.4h1.7c.2 0 .4-.2.4-.4V3.8c0-.2-.2-.4-.4-.4h-1.7c-.2 0-.4.2-.4.4v1.2c-1-.9-2.3-1.5-3.7-1.5zm.7 2.3c1.7 0 3 1.4 3 3.3s-1.3 3.3-3 3.3-3-1.4-3-3.3 1.3-3.3 3-3.3z" />
              </svg>
              <span>Amazon</span>
            </span>

            {/* Meta Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-default select-none">
              <svg className="w-3.5 h-3.5 shrink-0 text-[#0668E1]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5.7c-2.3 0-4.3 1.2-5.7 3-1.6 2.2-2.5 5.2-2.5 8.3 0 1.9.4 3.7 1.3 5.3.2.4.6.7 1.1.7.7 0 1.3-.6 1.3-1.3 0-.3-.1-.6-.2-.8-.7-1.2-1-2.5-1-3.9 0-2.6.7-5.1 2.1-7 1.1-1.4 2.5-2.2 4-2.2 1.6 0 3 .8 4.1 2.2 1.4 1.9 2.1 4.4 2.1 7 0 1.4-.3 2.7-1 3.9-.1.2-.2.5-.2.8 0 .7.6 1.3 1.3 1.3.5 0 .9-.3 1.1-.7.9-1.6 1.3-3.4 1.3-5.3 0-3.1-.9-6.1-2.5-8.3-1.4-1.8-3.4-3-5.7-3z" />
              </svg>
              <span>Meta</span>
            </span>

            {/* Flipkart Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-default select-none">
              <span className="w-3.5 h-3.5 rounded-full bg-[#2874F0] text-[#FFE500] text-[10px] font-black flex items-center justify-center leading-none italic shrink-0">
                f
              </span>
              <span>Flipkart</span>
            </span>

            {/* Apple Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 shadow-2xs hover:shadow-xs transition-all cursor-default select-none">
              <svg className="w-3.5 h-3.5 shrink-0 fill-current text-slate-900" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.78-8.8-10.27-18.91-13.48-30.33-3.21-11.41-4.82-22.12-4.82-32.13 0-14.54 3.65-26.68 10.96-36.41 7.3-9.74 16.59-14.7 27.86-14.89 5.35 0 11.16 1.41 17.43 4.24 6.27 2.83 10.19 4.3 11.76 4.41 1.79-.11 5.92-1.63 12.39-4.57 6.47-2.93 12.18-4.29 17.13-4.08 12.63.65 22.84 5.33 30.63 14.04-11.09 6.74-16.52 16.09-16.3 28.05.22 9.57 3.86 17.61 10.92 24.14 7.07 6.52 15.38 10.33 24.95 11.41-2.07 6.31-4.79 12.55-8.16 18.72zm-35.84-112.59c0 7.4-2.67 14.36-8.02 20.88-5.35 6.52-11.85 10.43-19.5 11.73-.22-.87-.33-1.85-.33-2.93 0-7.17 2.88-14.24 8.64-21.2 5.76-6.95 12.44-10.97 20.05-12.06.11 1.19.16 2.38.16 3.58z" />
              </svg>
              <span>Apple</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;