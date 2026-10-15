import { Link } from 'react-router-dom';
import { Youtube, Instagram, Linkedin, Mail } from 'lucide-react';
import MockeefyLogo from './MockeefyLogo';

interface FooterProps {
  minimal?: boolean;
  showSkeletons?: boolean;
}

const socialLinks = [
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/@mockeefy',
    icon: Youtube,
    hoverClass: 'hover:text-[#FF0000] hover:border-red-200 hover:bg-red-50/70',
    ariaLabel: 'Visit Mockeefy on YouTube',
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/mockeefy',
    icon: Instagram,
    hoverClass: 'hover:text-[#E4405F] hover:border-pink-200 hover:bg-pink-50/70',
    ariaLabel: 'Follow Mockeefy on Instagram',
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/mockeefy',
    icon: Linkedin,
    hoverClass: 'hover:text-[#0A66C2] hover:border-blue-200 hover:bg-blue-50/70',
    ariaLabel: 'Connect with Mockeefy on LinkedIn',
  },
  {
    name: 'Email',
    href: 'mailto:support@mockeefy.com',
    icon: Mail,
    hoverClass: 'hover:text-[#0755E8] hover:border-blue-200 hover:bg-blue-50/70',
    ariaLabel: 'Email Mockeefy Support',
  },
];

const platformLinks = [
  { name: 'Find Mentors', href: '/mentors' },
  { name: 'Pricing & Plans', href: '/plans' },
  { name: 'My Sessions', href: '/my-sessions' },
  { name: 'Interview Tips', href: '/tips' },
  { name: 'Watch Mock Interviews', href: '/watch-mock' },
];

const expertLinks = [
  { name: 'Become a Mentor', href: '/signup?role=expert' },
  { name: 'Mentor Sign In', href: '/signin' },
  { name: 'Verify Credentials', href: '/certificates' },
  { name: 'Demo Booking', href: '/demo/booking' },
];

const policyLinks = [
  { name: 'Terms & Conditions', href: '/terms' },
  { name: 'Privacy Policy', href: '/privacy' },
  { name: 'Refund & Cancellation', href: '/refund-cancellation' },
  { name: 'Return Policy', href: '/return-policy' },
  { name: 'Shipping Policy', href: '/shipping-policy' },
];

const SkeletonFooter = ({ minimal }: { minimal: boolean }) => (
  <footer className="w-full border-t border-slate-200/80 bg-white">
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-10 pb-20 lg:pt-12 lg:pb-10'}`}>
      {!minimal && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-slate-100 shimmer-shining border border-slate-200/50" />
              <div className="h-6 w-24 rounded-lg bg-slate-100 shimmer-shining border border-slate-200/50" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-56 bg-slate-100 rounded shimmer-shining border border-slate-200/50" />
              <div className="h-3 w-48 bg-slate-100 rounded shimmer-shining border border-slate-200/50" />
            </div>
            <div className="flex gap-2.5 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-9 h-9 rounded-xl bg-slate-100 shimmer-shining border border-slate-200/50" />
              ))}
            </div>
          </div>

          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-4 w-24 rounded bg-slate-100 shimmer-shining border border-slate-200/50" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-3 w-32 rounded bg-slate-100 shimmer-shining border border-slate-200/50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="h-3.5 w-60 rounded bg-slate-100 shimmer-shining border border-slate-200/50" />
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3 w-14 rounded bg-slate-100 shimmer-shining border border-slate-200/50" />
            ))}
          </div>
        </div>
      </div>
    </div>
  </footer>
);

const Footer = ({ minimal = false, showSkeletons = false }: FooterProps) => {
  if (showSkeletons) {
    return <SkeletonFooter minimal={minimal} />;
  }

  return (
    <footer className="w-full border-t border-slate-200/80 bg-white">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${minimal ? 'py-4' : 'pt-10 pb-20 lg:pt-12 lg:pb-10'}`}>
        {!minimal && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-10">
            {/* Column 1: Brand & Contact Info */}
            <div className="space-y-4 lg:pr-4">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <MockeefyLogo className="h-8.5 w-8.5" variant="brand" />
                <span className="text-[20px] font-logo font-bold tracking-tight text-[#0755E8] group-hover:text-[#0645C7] transition-colors">
                  Mockeefy
                </span>
              </Link>

              <p className="text-slate-500 leading-relaxed text-xs sm:text-[13px] max-w-sm">
                The premier platform to practice 1-on-1 mock interviews with verified industry leaders. Master your technical and behavioral rounds with actionable, real-time feedback.
              </p>

              {/* Direct Email Contact Link */}
              <div className="pt-1">
                <a
                  href="mailto:support@mockeefy.com"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0755E8] transition-colors group/mail"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#0755E8] group-hover/mail:bg-[#0755E8] group-hover/mail:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span>support@mockeefy.com</span>
                </a>
              </div>

              {/* Social & Contact Logo Buttons */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Connect With Us
                </p>
                <div className="flex items-center gap-2.5">
                  {socialLinks.map((social) => {
                    const IconComponent = social.icon;
                    return (
                      <a
                        key={social.name}
                        href={social.href}
                        target={social.href.startsWith('http') ? '_blank' : undefined}
                        rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        aria-label={social.ariaLabel}
                        title={social.name}
                        className={`w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center text-slate-500 transition-all duration-200 shadow-2xs hover:scale-105 active:scale-95 ${social.hoverClass}`}
                      >
                        <IconComponent className="w-4.5 h-4.5 stroke-[1.9]" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Platform
              </h3>
              <ul className="space-y-2.5">
                {platformLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-slate-500 hover:text-[#0755E8] transition-colors text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-[#0755E8] transition-colors shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: For Experts */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                For Mentors
              </h3>
              <ul className="space-y-2.5">
                {expertLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-slate-500 hover:text-[#0755E8] transition-colors text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-[#0755E8] transition-colors shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Policies & Legal */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Legal & Trust
              </h3>
              <ul className="space-y-2.5">
                {policyLinks.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-slate-500 hover:text-[#0755E8] transition-colors text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-[#0755E8] transition-colors shrink-0" />
                      <span>{link.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Bottom Bar: Copyright & Quick Links */}
        <div className={`border-t border-slate-200/80 ${minimal ? 'pt-2' : 'pt-6'}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="text-center sm:text-left">
              © {new Date().getFullYear()} <span className="font-semibold text-slate-700">Mockeefy</span>. All rights reserved.
              <span className="hidden sm:inline text-slate-300 mx-2">|</span>
              <span className="text-slate-400">1-on-1 Mock Interviews with Verified Experts</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
              <Link to="/terms" className="hover:text-[#0755E8] transition-colors">
                Terms
              </Link>
              <span className="text-slate-300">·</span>
              <Link to="/privacy" className="hover:text-[#0755E8] transition-colors">
                Privacy
              </Link>
              <span className="text-slate-300">·</span>
              <Link to="/refund-cancellation" className="hover:text-[#0755E8] transition-colors">
                Refunds
              </Link>
              <span className="text-slate-300">·</span>
              <Link to="/return-policy" className="hover:text-[#0755E8] transition-colors">
                Returns
              </Link>
              <span className="text-slate-300">·</span>
              <Link to="/shipping-policy" className="hover:text-[#0755E8] transition-colors">
                Shipping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;