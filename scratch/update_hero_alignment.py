import re

# ==========================================
# 1. Update client/src/pages/expert/Index.tsx
# ==========================================
file_path = 'client/src/pages/expert/Index.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace('\r\n', '\n')

# Check import
if 'formatDisplayName' not in text:
    text = text.replace(
        'import { getProfileImageUrl } from "../../lib/imageUtils";',
        'import { getProfileImageUrl } from "../../lib/imageUtils";\nimport { formatDisplayName } from "../../lib/utils";'
    )

# Replace Hero Banner
old_hero_pattern = r'\{\/\* 1\. Executive Mentor Royal Blue Hero Banner.*?\{\/\* Incomplete Profile Alert'
new_hero = """{/* 1. Executive Mentor Royal Blue Hero Banner (matching Candidate Discovery Hero) */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#0755E8] via-[#0540B0] to-[#032B7A] p-6 sm:p-7 text-white overflow-hidden shadow-xl shadow-blue-900/15">
          {/* Ambient glowing lighting orbs */}
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
            {/* Left: Mentor Identity & Status with Perfect Baseline Alignment */}
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
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

              <div className="min-w-0 space-y-1.5 flex flex-col justify-center">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight capitalize truncate">
                    {formatDisplayName(user?.name || expertProfile?.name || "Expert Mentor")}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-full shadow-2xs text-[11px] font-extrabold text-white uppercase tracking-wider shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Accepting Bookings
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-full shadow-2xs text-[11px] font-extrabold text-white shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-200" />
                    Verified Mentor
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-blue-100 font-medium flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm sm:text-base capitalize">
                    {expertProfile?.title || "Senior Software Engineer"}
                  </span>
                  {expertProfile?.company && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                      <span className="font-extrabold text-white flex items-center gap-1 capitalize">
                        <Building2 className="w-4 h-4 text-blue-200 shrink-0" />
                        {expertProfile.company}
                      </span>
                    </>
                  )}
                  {expertProfile?.category && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                      <span className="text-white font-semibold bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/20 text-xs">
                        {expertProfile.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Glass Quick Stats Card + Action Buttons with Unified Height & Clean Alignment */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {/* Live Glass Stats Pill (Matching Candidate Discovery Hero) */}
              <div className="hidden xl:flex items-center gap-3.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 text-white shadow-2xs">
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

              {/* Action Buttons Matching User Layout Order */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => navigate("/dashboard/reports")}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Report</span>
                </button>

                {user?.id && (
                  <button
                    onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
                    title="Public View"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                    <span>Public View</span>
                  </button>
                )}

                <button
                  onClick={() => navigate("/dashboard/availability")}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-white hover:bg-blue-50 text-[#0755E8] text-xs sm:text-sm font-black rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <CalendarPlus className="w-4.5 h-4.5 text-[#0755E8]" />
                  <span>Set Availability</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Incomplete Profile Alert"""

text = re.sub(old_hero_pattern, new_hero, text, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated Index.tsx successfully")
