import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Instagram, Linkedin, Mail, Star, Sparkles, Send } from 'lucide-react';
import MockeefyLogo from './MockeefyLogo';
import { toast } from 'sonner';

interface FooterProps {
  minimal?: boolean;
  showSkeletons?: boolean;
  showAppBanner?: boolean;
}

// ============================================================================
// Official Google Play & App Store Badge Buttons
// ============================================================================
const GooglePlayBadge = ({ className = "" }: { className?: string }) => (
  <button
    type="button"
    onClick={() => toast.info("Mockeefy Android app is launching soon on Google Play Store!")}
    aria-label="Get it on Google Play"
    className={`h-10 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl inline-flex items-center gap-2.5 border border-slate-800 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] shrink-0 text-left cursor-pointer ${className}`}
  >
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M3.6 1.4L13.8 11.6L3.6 21.8C3.2 21.4 3 20.7 3 19.8V3.4C3 2.5 3.2 1.8 3.6 1.4Z" fill="#00E5FF" />
      <path d="M17.3 8.1L13.8 11.6L3.6 1.4C4.1 1.1 4.7 1.1 5.3 1.4L17.3 8.1Z" fill="#FFD600" />
      <path d="M17.3 15.1L5.3 21.8C4.7 22.1 4.1 22.1 3.6 21.8L13.8 11.6L17.3 15.1Z" fill="#FF3D00" />
      <path d="M20.8 10.1L17.3 8.1L13.8 11.6L17.3 15.1L20.8 13.1C21.6 12.6 22 11.9 22 11.6C22 11.3 21.6 10.6 20.8 10.1Z" fill="#FF007A" />
    </svg>
    <div className="leading-tight">
      <span className="block text-[8px] uppercase tracking-wider text-slate-300 font-medium">GET IT ON</span>
      <span className="block text-[12px] font-semibold text-white tracking-tight -mt-0.5">Google Play</span>
    </div>
  </button>
);

const AppStoreBadge = ({ className = "" }: { className?: string }) => (
  <button
    type="button"
    onClick={() => toast.info("Mockeefy iOS app is launching soon on the Apple App Store!")}
    aria-label="Download on the App Store"
    className={`h-10 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl inline-flex items-center gap-2.5 border border-slate-800 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] shrink-0 text-left cursor-pointer ${className}`}
  >
    <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.71-.93 2.73 1.01.08 2.04-.51 2.63-1.23" />
    </svg>
    <div className="leading-tight">
      <span className="block text-[8px] text-slate-300 font-medium">Download on the</span>
      <span className="block text-[12px] font-semibold text-white tracking-tight -mt-0.5">App Store</span>
    </div>
  </button>
);

// ============================================================================
// Stylized QR Code Box
// ============================================================================
const QRCodeBox = () => (
  <div className="flex flex-col items-center gap-1.5 shrink-0 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
    <div className="w-20 h-20 p-1 bg-white rounded-lg flex items-center justify-center">
      <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
        {/* Top-left position marker */}
        <rect x="6" y="6" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="5" />
        <rect x="13" y="13" width="12" height="12" rx="2" fill="currentColor" />
        {/* Top-right position marker */}
        <rect x="68" y="6" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="5" />
        <rect x="75" y="13" width="12" height="12" rx="2" fill="currentColor" />
        {/* Bottom-left position marker */}
        <rect x="6" y="68" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="5" />
        <rect x="13" y="75" width="12" height="12" rx="2" fill="currentColor" />
        {/* Data points grid */}
        <rect x="38" y="10" width="6" height="6" rx="1" />
        <rect x="52" y="10" width="6" height="6" rx="1" />
        <rect x="38" y="22" width="6" height="6" rx="1" />
        <rect x="48" y="28" width="6" height="6" rx="1" />
        <rect x="8" y="42" width="6" height="6" rx="1" />
        <rect x="20" y="48" width="6" height="6" rx="1" />
        <rect x="32" y="40" width="6" height="6" rx="1" />
        <rect x="42" y="42" width="6" height="6" rx="1" />
        <rect x="54" y="40" width="6" height="6" rx="1" />
        <rect x="64" y="48" width="6" height="6" rx="1" />
        <rect x="76" y="40" width="6" height="6" rx="1" />
        <rect x="88" y="44" width="6" height="6" rx="1" />
        <rect x="40" y="56" width="6" height="6" rx="1" />
        <rect x="54" y="52" width="6" height="6" rx="1" />
        <rect x="42" y="70" width="6" height="6" rx="1" />
        <rect x="54" y="68" width="6" height="6" rx="1" />
        <rect x="66" y="76" width="6" height="6" rx="1" />
        <rect x="80" y="70" width="6" height="6" rx="1" />
        <rect x="74" y="84" width="6" height="6" rx="1" />
        <rect x="86" y="86" width="6" height="6" rx="1" />
        <rect x="48" y="84" width="6" height="6" rx="1" />
        {/* Center Mockeefy brand badge */}
        <circle cx="50" cy="50" r="5" fill="#0755E8" />
      </svg>
    </div>
    <span className="text-[11px] font-semibold text-slate-500 text-center tracking-tight">
      Scan to download
    </span>
  </div>
);

// ============================================================================
// Pre-Footer Promo Banner Card (Naukri-Style Adapted for Mockeefy)
// ============================================================================
const PreFooterAppBanner = () => {
  const [contactInput, setContactInput] = useState('');

  const handleGetLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInput.trim()) {
      toast.error('Please enter a valid mobile number or email address');
      return;
    }
    toast.success(`App link sent to ${contactInput}!`);
    setContactInput('');
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-blue-100/90 bg-gradient-to-br from-[#F2F5FE] via-[#F8FAFF] to-[#EFF3FD] p-6 sm:p-8 lg:p-10 mb-12 sm:mb-14 shadow-xs">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-10">
        {/* Left Section: Content, Input & Badges */}
        <div className="flex-1 w-full max-w-xl space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight leading-snug">
              Stand out among candidates with 1-on-1 mock interviews
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              Available for Web, Android and iOS apps
            </p>
          </div>

          {/* Interactive Get Link Input */}
          <form
            onSubmit={handleGetLink}
            className="flex items-center gap-2 bg-white p-1.5 pl-4 rounded-full border border-slate-200/90 shadow-2xs focus-within:border-[#0755E8] focus-within:ring-2 focus-within:ring-[#0755E8]/10 transition-all max-w-md"
          >
            <input
              type="text"
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              placeholder="Enter mobile number or email..."
              className="flex-1 text-xs sm:text-[13px] bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none min-w-0"
            />
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs sm:text-[13px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Get link
            </button>
          </form>

          {/* Badges & QR Code Row */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2.5">
              <GooglePlayBadge />
              <AppStoreBadge />
            </div>
            <div className="hidden sm:block">
              <QRCodeBox />
            </div>
          </div>
        </div>

        {/* Right Section: Mobile App Mockup Preview */}
        <div className="hidden lg:flex items-end justify-center shrink-0 relative pr-4">
          {/* Subtle paper airplane decoration */}
          <div className="absolute -left-6 top-10 flex items-center gap-1.5 text-slate-400">
            <Send className="w-5 h-5 -rotate-12 text-[#0755E8]/60" />
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">Live Mocks</span>
          </div>

          {/* Phone Frame */}
          <div className="w-[290px] bg-white rounded-t-[32px] border-4 border-b-0 border-slate-900/90 shadow-2xl p-3 pb-0">
            {/* Top Speaker Notch */}
            <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />

            {/* In-app header */}
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-800">24+ Verified Mentors</span>
              </div>
              <Link to="/mentors" className="text-[11px] font-bold text-[#0755E8] hover:underline">
                View All
              </Link>
            </div>

            {/* In-app mentor cards preview */}
            <div className="space-y-2.5 pb-3">
              {/* Card 1 */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-[#F8FAFC] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-black text-[#0755E8]">
                  G
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">Senior Java Architect</p>
                  <p className="text-[10px] text-slate-500">Google · ⭐ 4.9 · 8+ yrs</p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-[#F8FAFC] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-black text-amber-700">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">System Design Specialist</p>
                  <p className="text-[10px] text-slate-500">Amazon · ⭐ 5.0 · 10+ yrs</p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-2.5 rounded-xl border border-slate-100 bg-[#F8FAFC] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-xs font-black text-blue-700">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">Senior Engineering Lead</p>
                  <p className="text-[10px] text-slate-500">Microsoft · ⭐ 4.9 · 7+ yrs</p>
                </div>
              </div>
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
// Main Footer Component (Naukri-Style Layout with Mockeefy Identity)
// ============================================================================
const Footer = ({ minimal = false, showSkeletons = false, showAppBanner = true }: FooterProps) => {
  if (showSkeletons) {
    return <SkeletonFooter minimal={minimal} />;
  }

  return (
    <footer className="w-full border-t border-slate-200/80 bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-10 pb-20 lg:pt-12 lg:pb-10'}`}>
        
        {/* Pre-Footer Promo Banner Card (Visible on regular pages) */}
        {!minimal && showAppBanner && <PreFooterAppBanner />}

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

            {/* Column 5: Right "Apply / Prepare on the go" Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900">Prepare on the go</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                Get real-time session reminders & expert feedback on our App
              </p>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5">
                <GooglePlayBadge className="w-full justify-center" />
                <AppStoreBadge className="w-full justify-center" />
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