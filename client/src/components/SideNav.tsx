import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutGrid, 
  User, 
  CalendarDays, 
  Award, 
  Grid2X2, 
  FileText, 
  Settings, 
  LogOut, 
  X,
  Sparkles,
  Wallet 
} from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import MockeefyLogo from "./MockeefyLogo";

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: any;
};

type SideNavProps = {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  active?: string;
};

export default function SideNav({ isOpen = false, onClose, className = "" }: SideNavProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  const navItems = [
    { id: "dashboard", icon: LayoutGrid, label: 'Dashboard', to: '/dashboard' },
    { id: "profile", icon: User, label: 'Profile', to: '/dashboard/profile' },
    { id: "availability", icon: CalendarDays, label: 'Availability', to: '/dashboard/availability' },
    { id: "skills", icon: Award, label: 'Skills & Experience', to: '/dashboard/skills' },
    { id: "sessions", icon: Grid2X2, label: 'Sessions', to: '/dashboard/sessions' },
    { id: "withdraw", icon: Wallet, label: 'Payouts', to: '/dashboard/withdraw' }
  ];

  const SidebarContent = () => (
    <aside className={`w-full h-full border-r border-slate-200 bg-white flex flex-col shrink-0 shadow-2xl md:shadow-none ${className}`}>
      {/* Header Area */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <MockeefyLogo className="h-8 w-8" variant="brand" />
          <div className="flex flex-col justify-center mt-1">
            <span className="text-[22px] font-logo tracking-tight text-[#004fcb] leading-none mb-0.5">Mockeefy</span>
            <p className="text-[9px] text-slate-400 tracking-widest font-black uppercase leading-none">Expert Terminal</p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        {onClose && (
          <button 
            onClick={onClose} 
            className="xl:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 mb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Main Menu</p>
        </div>
        
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
              end={item.to === "/dashboard"}
            >
              {({ isActive }) => (
                <>
                  <Icon 
                    className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} 
                    strokeWidth={isActive ? 2.5 : 2} 
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
        
        <div className="pt-6 pb-2">
           <div className="px-3 mb-3">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</p>
           </div>
           
           <NavLink
             to="/dashboard/settings"
             onClick={onClose}
             className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
           >
             {({ isActive }) => (
               <>
                 <Settings 
                   className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} 
                   strokeWidth={isActive ? 2.5 : 2} 
                 />
                 Settings
               </>
             )}
           </NavLink>
        </div>
      </nav>

      {/* Bottom Actions Section */}
      <div className="p-5 border-t border-slate-100 bg-slate-50/50 shrink-0">
        {/* Premium Upgrade / Status Card */}
        {user?.userType === 'candidate' && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100/50 rounded-2xl p-4 mb-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Sparkles className="w-12 h-12 text-[#004fcb]" />
            </div>
            <div className="relative z-10">
              {user?.isPremium ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-[#004fcb] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Premium</div>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Free Sessions Left</h4>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-2xl font-black text-[#004fcb]">{user?.freeInterviewsCount || 0}</span>
                    <span className="text-[10px] text-slate-500 font-bold mb-1 uppercase">/ 3 Remaining</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight mb-0">Use these credits to book any expert for free.</p>
                </>
              ) : (
                <>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Go Premium</h4>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-black text-[#004fcb]">₹499</span>
                    <span className="text-[10px] text-slate-500 font-medium">/ Lifetime</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">Get 3 free interviews & premium certification.</p>
                  <button 
                    onClick={() => navigate('/payment', { state: { upgradeType: 'premium' } })}
                    className="w-full bg-slate-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#004fcb] transition-colors shadow-md"
                  >
                    Upgrade Now
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Sign Out */}
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-red-600 w-full rounded-xl hover:bg-red-50 transition-colors">
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600" strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden xl:block w-[260px] h-screen shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile slide-over */}
      <div className={`fixed inset-0 z-50 transition-opacity xl:hidden ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
        <div className={`absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
        <div className={`absolute inset-y-0 left-0 w-[280px] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
           <SidebarContent />
        </div>
      </div>
    </>
  );
}
