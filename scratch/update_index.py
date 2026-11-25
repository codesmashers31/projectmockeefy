import os

file_path = r'client/src/pages/expert/Index.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Normalize CRLF / LF for matching
text = text.replace('\r\n', '\n')

# 1. Update CardBottomWave height
old_wave = 'className={`absolute bottom-0 inset-x-0 w-full h-11 sm:h-13 pointer-events-none ${colorClass}`}'
new_wave = 'className={`absolute bottom-0 inset-x-0 w-full h-14 sm:h-16 pointer-events-none ${colorClass}`}'
assert old_wave in text, "old_wave not found"
text = text.replace(old_wave, new_wave, 1)

# 2. Update QuickActionCard
old_qac = """function QuickActionCard({ title, description, icon, badge, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center justify-between p-3 sm:p-3.5 bg-white border border-slate-200/90 rounded-2xl hover:border-blue-300 hover:shadow-md hover:ring-2 hover:ring-blue-50/80 transition-all duration-200 text-left cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 bg-slate-50 text-slate-600 rounded-xl shrink-0 group-hover:bg-[#0755E8] group-hover:text-white transition-colors duration-200 shadow-2xs border border-slate-200/70">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0755E8] transition-colors truncate">
              {title}
            </h4>
            {badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-100 shrink-0">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0755E8] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
    </button>
  );
}"""

new_qac = """function QuickActionCard({ title, description, icon, badge, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center justify-between p-3.5 sm:p-4 bg-white border border-slate-200/90 rounded-2xl hover:border-blue-300 hover:shadow-md hover:ring-2 hover:ring-blue-50/80 transition-all duration-200 text-left cursor-pointer"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-[#0755E8] group-hover:text-white transition-colors duration-200 shadow-2xs border border-slate-200/70">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0755E8] transition-colors truncate">
              {title}
            </h4>
            {badge && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#0755E8] border border-blue-200 shrink-0">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#0755E8] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
    </button>
  );
}"""
assert old_qac in text, "old_qac not found"
text = text.replace(old_qac, new_qac, 1)

# 3. Update Mentor Header into Executive Royal Blue Hero Banner
old_header = """        {/* 1. Executive Mentor Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-4 border-b border-slate-200/80">
          {/* Left: Mentor Identity & Status */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="relative shrink-0">
              <img
                src={getProfileImageUrl(expertProfile?.photoUrl || user?.profilePhoto, user?.name)}
                alt={user?.name || "Expert"}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-slate-100"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Expert')}&background=0755E8&color=fff&bold=true`;
                }}
              />
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                title="Online & Accepting Bookings"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight truncate">
                  {user?.name || expertProfile?.name || "Expert Mentor"}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/90 rounded-full shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                    Accepting Bookings
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200/90 rounded-full shadow-2xs text-[11px] font-bold text-[#0755E8]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
                  Verified Mentor
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-slate-700 font-semibold">
                  {expertProfile?.title || "Senior Interview Specialist"}
                </span>
                {expertProfile?.company && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {expertProfile.company}
                    </span>
                  </>
                )}
                {expertProfile?.category && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[#0755E8] font-medium bg-blue-50/70 px-2 py-0.5 rounded-md border border-blue-100/80 text-[11px]">
                      {expertProfile.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              onClick={() => navigate("/dashboard/reports")}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white border border-slate-200/90 text-slate-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              Download Report
            </button>

            {user?.id && (
              <button
                onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
                className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-white border border-blue-200 text-[#0755E8] text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-50/80 transition-all shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
                title="Preview how candidates view your profile card"
              >
                <ExternalLink className="w-4 h-4 text-[#0755E8]" />
                Public View
              </button>
            )}

            <button
              onClick={() => navigate("/dashboard/availability")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-[#0755E8]/25 hover:shadow-md cursor-pointer whitespace-nowrap shrink-0"
            >
              <CalendarPlus className="w-4 h-4" />
              Set Availability
            </button>
          </div>
        </div>"""

new_header = """        {/* 1. Executive Mentor Royal Blue Hero Banner (matching Candidate Discovery Hero) */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0755E8] via-[#0540B0] to-[#032B7A] p-6 sm:p-8 text-white overflow-hidden shadow-xl shadow-blue-900/15">
          {/* Ambient glowing lighting orbs */}
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Mentor Identity & Status */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getProfileImageUrl(expertProfile?.photoUrl || user?.profilePhoto, user?.name)}
                  alt={user?.name || "Expert"}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/90 shadow-lg ring-4 ring-white/20 bg-white"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Expert')}&background=0755E8&color=fff&bold=true`;
                  }}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-400 border-2 border-white shadow-xs animate-pulse"
                  title="Online & Accepting Bookings"
                />
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight truncate">
                    {user?.name || expertProfile?.name || "Expert Mentor"}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-full shadow-2xs text-[11px] font-extrabold text-white uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Accepting Bookings
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-full shadow-2xs text-[11px] font-extrabold text-white">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                    Verified Mentor
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-blue-100 font-medium flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm sm:text-base">
                    {expertProfile?.title || "Senior Software Engineer"}
                  </span>
                  {expertProfile?.company && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                      <span className="font-extrabold text-white flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-blue-200" />
                        {expertProfile.company}
                      </span>
                    </>
                  )}
                  {expertProfile?.category && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                      <span className="text-white font-semibold bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/20 text-xs">
                        {expertProfile.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Glass Quick Stats Card + Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Live Glass Stats Pill (Matching Candidate Discovery Hero) */}
              <div className="flex items-center justify-around sm:justify-start gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-white shadow-2xs">
                <div className="text-center px-1">
                  <div className="text-lg sm:text-xl font-black text-white leading-tight">
                    {stats.totalSessions}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                    Rounds
                  </div>
                </div>
                <div className="w-px h-7 bg-white/20" />
                <div className="text-center px-1">
                  <div className="text-lg sm:text-xl font-black text-white leading-tight flex items-center justify-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                    {expertProfile?.rating ? Number(expertProfile.rating).toFixed(1) : "5.0"}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                    Rating
                  </div>
                </div>
                <div className="w-px h-7 bg-white/20" />
                <div className="text-center px-1">
                  <div className="text-lg sm:text-xl font-black text-white leading-tight">
                    ₹{formatCurrency(stats.walletBalance)}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                    Balance
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => navigate("/dashboard/availability")}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-white hover:bg-blue-50 text-[#0755E8] text-xs sm:text-sm font-black rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <CalendarPlus className="w-4.5 h-4.5 text-[#0755E8]" />
                  <span>Set Availability</span>
                </button>

                <button
                  onClick={() => navigate("/dashboard/reports")}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-3 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  <FileText className="w-4 h-4" />
                  <span>Report</span>
                </button>

                {user?.id && (
                  <button
                    onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-3 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                    title="Public View"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Public</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>"""
assert old_header in text, "old_header not found"
text = text.replace(old_header, new_header, 1)

# 4. Scale up the 4 Wave KPI Cards
old_wave_cards = """          {/* 4 Floating Wave KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Sessions (Blue) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-[#F0F6FF] border border-blue-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-blue-300 transition-all duration-200 cursor-pointer min-h-[170px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Box className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-sm font-bold text-blue-700 tracking-tight mb-1">
                  Total Sessions
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  {stats.totalSessions}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  +12% this month
                </p>
              </div>

              <CardBottomWave colorClass="text-blue-200/70" />
            </div>

            {/* Card 2: Upcoming Sessions (Green) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-[#F0FDF4] border border-emerald-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-emerald-300 transition-all duration-200 cursor-pointer min-h-[170px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-sm font-bold text-emerald-700 tracking-tight mb-1">
                  Upcoming
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  {stats.upcomingSessions}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Next 7 Days
                </p>
              </div>

              <CardBottomWave colorClass="text-emerald-200/70" />
            </div>

            {/* Card 3: Wallet Balance (Amber) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/withdraw")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/withdraw")}
              className="relative bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-amber-300 transition-all duration-200 cursor-pointer min-h-[170px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <Wallet className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-amber-200 flex items-center justify-center text-amber-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-sm font-bold text-amber-800 tracking-tight mb-1">
                  Wallet Balance
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  ₹{formatCurrency(stats.walletBalance)}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Available for withdrawal
                </p>
              </div>

              <CardBottomWave colorClass="text-amber-200/70" />
            </div>

            {/* Card 4: Total Earnings (Rose) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/reports")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/reports")}
              className="relative bg-[#FFF1F2] border border-rose-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-1 hover:border-rose-300 transition-all duration-200 cursor-pointer min-h-[170px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/30 group-hover:scale-105 transition-transform">
                  <IndianRupee className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-rose-100 flex items-center justify-center text-rose-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-sm font-bold text-rose-700 tracking-tight mb-1">
                  Total Earnings
                </h4>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight my-0.5">
                  {formattedRevenue}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Current Month
                </p>
              </div>

              <CardBottomWave colorClass="text-rose-200/70" />
            </div>
          </div>"""

new_wave_cards = """          {/* 4 Floating Wave KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Total Sessions (Blue) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-[#F0F6FF] border border-blue-200/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 transition-all duration-200 cursor-pointer min-h-[195px] sm:min-h-[205px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Box className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-base font-black text-blue-700 tracking-tight mb-1">
                  Total Sessions
                </h4>
                <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight my-1">
                  {stats.totalSessions}
                </div>
                <p className="text-xs sm:text-[13px] font-bold text-slate-500">
                  +12% this month
                </p>
              </div>

              <CardBottomWave colorClass="text-blue-200/70" />
            </div>

            {/* Card 2: Upcoming Sessions (Green) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-[#F0FDF4] border border-emerald-200/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300 transition-all duration-200 cursor-pointer min-h-[195px] sm:min-h-[205px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-base font-black text-emerald-700 tracking-tight mb-1">
                  Upcoming
                </h4>
                <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight my-1">
                  {stats.upcomingSessions}
                </div>
                <p className="text-xs sm:text-[13px] font-bold text-slate-500">
                  Next 7 Days
                </p>
              </div>

              <CardBottomWave colorClass="text-emerald-200/70" />
            </div>

            {/* Card 3: Wallet Balance (Amber) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/withdraw")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/withdraw")}
              className="relative bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-1 hover:border-amber-300 transition-all duration-200 cursor-pointer min-h-[195px] sm:min-h-[205px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <Wallet className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-amber-200 flex items-center justify-center text-amber-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-base font-black text-amber-800 tracking-tight mb-1">
                  Wallet Balance
                </h4>
                <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight my-1">
                  ₹{formatCurrency(stats.walletBalance)}
                </div>
                <p className="text-xs sm:text-[13px] font-bold text-slate-500">
                  Available for withdrawal
                </p>
              </div>

              <CardBottomWave colorClass="text-amber-200/70" />
            </div>

            {/* Card 4: Total Earnings (Rose) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/reports")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/reports")}
              className="relative bg-[#FFF1F2] border border-rose-200/80 rounded-2xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-1 hover:border-rose-300 transition-all duration-200 cursor-pointer min-h-[195px] sm:min-h-[205px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/30 group-hover:scale-105 transition-transform">
                  <IndianRupee className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-rose-100 flex items-center justify-center text-rose-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={16} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-base font-black text-rose-700 tracking-tight mb-1">
                  Total Earnings
                </h4>
                <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight my-1">
                  {formattedRevenue}
                </div>
                <p className="text-xs sm:text-[13px] font-bold text-slate-500">
                  Current Month
                </p>
              </div>

              <CardBottomWave colorClass="text-rose-200/70" />
            </div>
          </div>"""
assert old_wave_cards in text, "old_wave_cards not found"
text = text.replace(old_wave_cards, new_wave_cards, 1)

# 5. Scale up Session Cards
old_session_card = """                    <div
                      key={session._id || session.sessionId}
                      className="group relative bg-white hover:bg-blue-50/20 border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0755E8] flex items-center justify-center font-bold text-base border border-blue-100 shrink-0 shadow-2xs overflow-hidden">
                          {candidatePhoto ? (
                            <img
                              src={candidatePhoto}
                              alt={candidateName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidateName)}&background=EAF2FF&color=0755E8&bold=true`;
                              }}
                            />
                          ) : (
                            <span>{candidateName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                              {candidateName}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0755E8] border border-blue-200/80 uppercase tracking-wide truncate max-w-[220px]">
                              {topic}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                              {sessionDate}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1 font-semibold text-[#0755E8]">
                              <Clock className="w-3.5 h-3.5" />
                              {sessionTime}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : timing.isLive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {isCompleted ? "Completed" : timing.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => navigate(`/dashboard/sessions/${session.sessionId || session._id}`)}
                          className="text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                        >
                          Dossier
                        </button>
                        {isCompleted ? (
                          <button
                            onClick={() => navigate(`/dashboard/sessions/${session.sessionId || session._id}`)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Scorecard
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/live-meeting?meetingId=${session.sessionId || session._id}`)}
                            className="bg-[#0755E8] hover:bg-[#0645C7] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm shadow-[#0755E8]/20 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Join Call
                          </button>
                        )}
                      </div>
                    </div>"""

new_session_card = """                    <div
                      key={session._id || session.sessionId}
                      className="group relative bg-white hover:bg-blue-50/20 border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 sm:p-5.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#0755E8] flex items-center justify-center font-black text-lg border border-blue-100 shrink-0 shadow-2xs overflow-hidden">
                          {candidatePhoto ? (
                            <img
                              src={candidatePhoto}
                              alt={candidateName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidateName)}&background=EAF2FF&color=0755E8&bold=true`;
                              }}
                            />
                          ) : (
                            <span>{candidateName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="font-black text-slate-900 text-base sm:text-lg truncate">
                              {candidateName}
                            </h4>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#0755E8] border border-blue-200/80 uppercase tracking-wide truncate max-w-[220px]">
                              {topic}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1.5 font-bold text-slate-700">
                              <CalendarDays className="w-4 h-4 text-slate-400" />
                              {sessionDate}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="flex items-center gap-1.5 font-bold text-[#0755E8]">
                              <Clock className="w-4 h-4" />
                              {sessionTime}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                                isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : timing.isLive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {isCompleted ? "Completed" : timing.text}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => navigate(`/dashboard/sessions/${session.sessionId || session._id}`)}
                          className="text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
                        >
                          Dossier
                        </button>
                        {isCompleted ? (
                          <button
                            onClick={() => navigate(`/dashboard/sessions/${session.sessionId || session._id}`)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Check className="w-4 h-4" />
                            Scorecard
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/live-meeting?meetingId=${session.sessionId || session._id}`)}
                            className="bg-[#0755E8] hover:bg-[#0645C7] text-white px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-sm shadow-[#0755E8]/20 flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Video className="w-4 h-4" />
                            Join Call
                          </button>
                        )}
                      </div>
                    </div>"""
assert old_session_card in text, "old_session_card not found"
text = text.replace(old_session_card, new_session_card, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Successfully transformed Expert Index.tsx!")
