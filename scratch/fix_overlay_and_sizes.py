import re

# ====================================================================
# 1. Update ExpertLayout.tsx container width to max-w-[1440px]
# ====================================================================
layout_path = 'client/src/components/ExpertLayout.tsx'
with open(layout_path, 'r', encoding='utf-8') as f:
    layout_text = f.read()

layout_text = re.sub(r'max-w-7xl', 'max-w-[1440px]', layout_text)
with open(layout_path, 'w', encoding='utf-8') as f:
    f.write(layout_text)
print("Updated ExpertLayout.tsx")

# ====================================================================
# 2. Update TopNav.tsx container width and left box
# ====================================================================
topnav_path = 'client/src/components/TopNav.tsx'
with open(topnav_path, 'r', encoding='utf-8') as f:
    topnav_text = f.read()

topnav_text = re.sub(r'max-w-7xl', 'max-w-[1440px]', topnav_text)
with open(topnav_path, 'w', encoding='utf-8') as f:
    f.write(topnav_text)
print("Updated TopNav.tsx")

# ====================================================================
# 3. Update SideNav.tsx width to w-[260px]
# ====================================================================
sidenav_path = 'client/src/components/SideNav.tsx'
with open(sidenav_path, 'r', encoding='utf-8') as f:
    sidenav_text = f.read()

sidenav_text = sidenav_text.replace('w-[285px]', 'w-[260px]')
with open(sidenav_path, 'w', encoding='utf-8') as f:
    f.write(sidenav_text)
print("Updated SideNav.tsx")

# ====================================================================
# 4. Update Profile.tsx left sidebar width
# ====================================================================
profile_path = 'client/src/pages/expert/Profile.tsx'
with open(profile_path, 'r', encoding='utf-8') as f:
    profile_text = f.read()

profile_text = profile_text.replace('lg:w-68', 'lg:w-60')
with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(profile_text)
print("Updated Profile.tsx")

# ====================================================================
# 5. Update ExpertProfileHeader.tsx (Fix the overlay bug!)
# ====================================================================
header_path = 'client/src/components/ExpertProfileHeader.tsx'
with open(header_path, 'r', encoding='utf-8') as f:
    header_text = f.read().replace('\r\n', '\n')

# Find the entire top card in ExpertProfileHeader.tsx and make it stacked/unconstrained
old_header_card = """      {/* 1. Executive Top Hero Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col xl:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle ambient gradient mesh */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-blue-100/35 via-indigo-100/20 to-transparent blur-3xl pointer-events-none" />

        {/* Left: Mentor Avatar & Executive Bio */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 min-w-0 flex-1 text-center sm:text-left relative z-10">
          {/* Avatar with Camera Hover Button */}
          <div className="relative shrink-0 group">
            <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-3xl overflow-hidden border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              {(profile.photoUrl && !profile.photoUrl.includes("default-avatar.png") && !profile.photoUrl.includes("ui-avatars.com")) ? (
                <img
                  src={getProfileImageUrl(profile.photoUrl)}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-3xl sm:text-4xl font-black text-[#0755E8] uppercase tracking-wider">
                  {(profile.name || user?.name || 'ME').trim().substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Camera Overlay Trigger */}
            <div ref={photoMenuRef} className="absolute -bottom-1 -right-1 z-20">
              <button
                type="button"
                onClick={() => {
                  if (hasCustomPhoto) {
                    setPhotoMenuOpen(prev => !prev);
                  } else {
                    photoInputRef.current?.click();
                  }
                }}
                disabled={uploading}
                className="bg-white p-2 rounded-xl shadow-md border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-[#0755E8] transition-all cursor-pointer group-hover:scale-105 active:scale-95 flex items-center justify-center"
                title={hasCustomPhoto ? "Adjust or change photo" : "Upload profile photo"}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#0755E8] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {photoMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={handleAdjustCurrentPhoto}
                    className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-[#0755E8] hover:bg-blue-50/80 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 text-[#0755E8]" />
                    <span>Adjust &amp; Crop Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      photoInputRef.current?.click();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload New Photo</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={photoInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelected}
            />
          </div>

          {/* Identity Info */}
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate capitalize">
                {formatDisplayName(profile.name || user?.name || "Expert Mentor")}
              </h1>
              {profile.status === "Active" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#0755E8] bg-blue-50 border border-blue-200/90 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
                  MOCKEEFY VERIFIED
                </span>
              )}
            </div>

            <div className="text-sm font-semibold text-slate-700 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span>{profile.title || "Senior Software Engineer"}</span>
              {profile.company && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/80">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  {profile.company}
                </span>
              )}
            </div>

            {/* Badges Ribbon */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${statusConfig.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>

              {(profile.city || profile.country) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200/80">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </span>
              )}

              {profile.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50/70 text-[#0755E8] border border-blue-200/80">
                  <Code className="w-3.5 h-3.5 text-[#0755E8]" />
                  {profile.category}
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                {profile.totalExperience ? `${profile.totalExperience} Yrs Exp` : "MNC Specialist"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Consolidated Executive Verification Status Card */}
        <div className="w-full xl:w-96 shrink-0 relative z-10">"""

new_header_card = """      {/* 1. Executive Top Hero Header Card with Clean Non-Overlaying Layout */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-5 relative overflow-hidden">
        {/* Subtle ambient gradient mesh */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-blue-100/35 via-indigo-100/20 to-transparent blur-3xl pointer-events-none" />

        {/* Identity Row */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 min-w-0 text-center sm:text-left relative z-10">
          {/* Avatar with Camera Hover Button */}
          <div className="relative shrink-0 group">
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              {(profile.photoUrl && !profile.photoUrl.includes("default-avatar.png") && !profile.photoUrl.includes("ui-avatars.com")) ? (
                <img
                  src={getProfileImageUrl(profile.photoUrl)}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-[#0755E8] uppercase tracking-wider">
                  {(profile.name || user?.name || 'ME').trim().substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Camera Overlay Trigger */}
            <div ref={photoMenuRef} className="absolute -bottom-1 -right-1 z-20">
              <button
                type="button"
                onClick={() => {
                  if (hasCustomPhoto) {
                    setPhotoMenuOpen(prev => !prev);
                  } else {
                    photoInputRef.current?.click();
                  }
                }}
                disabled={uploading}
                className="bg-white p-2 rounded-xl shadow-md border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-[#0755E8] transition-all cursor-pointer group-hover:scale-105 active:scale-95 flex items-center justify-center"
                title={hasCustomPhoto ? "Adjust or change photo" : "Upload profile photo"}
              >
                {uploading ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#0755E8] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-slate-700" />
                )}
              </button>

              {photoMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={handleAdjustCurrentPhoto}
                    className="w-full px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-[#0755E8] hover:bg-blue-50/80 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 text-[#0755E8]" />
                    <span>Adjust &amp; Crop Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false);
                      photoInputRef.current?.click();
                    }}
                    className="w-full px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload New Photo</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={photoInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileSelected}
            />
          </div>

          {/* Identity Info */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate capitalize">
                {formatDisplayName(profile.name || user?.name || "Expert Mentor")}
              </h1>
              {profile.status === "Active" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-[#0755E8] bg-blue-50 border border-blue-200/90 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
                  MOCKEEFY VERIFIED
                </span>
              )}
            </div>

            <div className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span>{profile.title || "Senior Software Engineer"}</span>
              {profile.company && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/80">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  {profile.company}
                </span>
              )}
            </div>

            {/* Badges Ribbon */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold border shadow-2xs ${statusConfig.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>

              {(profile.city || profile.country) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200/80">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {[profile.city, profile.country].filter(Boolean).join(", ")}
                </span>
              )}

              {profile.category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-blue-50/70 text-[#0755E8] border border-blue-200/80">
                  <Code className="w-3.5 h-3.5 text-[#0755E8]" />
                  {profile.category}
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                {profile.totalExperience ? `${profile.totalExperience} Yrs Exp` : "MNC Specialist"}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Status Card - Full width & clean flow, preventing any overlay */}
        <div className="w-full pt-3 border-t border-slate-100 relative z-10">"""

assert old_header_card in header_text, "old_header_card not found in ExpertProfileHeader.tsx"
header_text = header_text.replace(old_header_card, new_header_card, 1)

# Also update trust checkmarks in ExpertProfileHeader.tsx to a clean grid
old_checkmarks = """              {/* Trust Checkmarks */}
              <div className="space-y-1 text-xs text-emerald-900/90 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>UIDAI Aadhaar Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Corporate Work ID at {profile.company || "MNC"} Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Master Coach Service Agreement Signed</span>
                </div>
              </div>"""

new_checkmarks = """              {/* Trust Checkmarks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-900/90 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>UIDAI Aadhaar Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Work ID at {profile.company || "MNC"} Confirmed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Coach Agreement Signed</span>
                </div>
              </div>"""

if old_checkmarks in header_text:
    header_text = header_text.replace(old_checkmarks, new_checkmarks, 1)

with open(header_path, 'w', encoding='utf-8') as f:
    f.write(header_text)
print("Updated ExpertProfileHeader.tsx")

# ====================================================================
# 6. Update Index.tsx (Replace solid blue banner with luminous gradient banner)
# ====================================================================
index_path = 'client/src/pages/expert/Index.tsx'
with open(index_path, 'r', encoding='utf-8') as f:
    index_text = f.read().replace('\r\n', '\n')

old_index_hero = """{/* 1. Executive Mentor Royal Blue Hero Banner (matching Candidate Discovery Hero) */}
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
        </div>"""

new_index_hero = """{/* 1. Executive Mentor Header Banner with Luminous Soft Gradient (Theme Matched, Non-Collapsing) */}
        <div className="relative rounded-2xl sm:rounded-3xl border border-blue-200/90 bg-gradient-to-r from-[#EBF3FF] via-[#F6F9FF] to-white p-5 sm:p-6 shadow-xs overflow-hidden">
          {/* Subtle ambient lighting glows */}
          <div className="absolute -top-10 -right-10 w-60 h-60 rounded-full bg-blue-300/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-indigo-200/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
            {/* Left: Mentor Identity & Status with Clean Alignment */}
            <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={getProfileImageUrl(expertProfile?.photoUrl || user?.profilePhoto, user?.name)}
                  alt={user?.name || "Expert"}
                  className="w-15 h-15 sm:w-17 sm:h-17 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-slate-100"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Expert')}&background=0755E8&color=fff&bold=true`;
                  }}
                />
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs animate-pulse"
                  title="Online & Accepting Bookings"
                />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight capitalize truncate">
                    {formatDisplayName(user?.name || expertProfile?.name || "Expert Mentor")}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200/90 rounded-full shadow-2xs text-[11px] font-bold text-emerald-700 uppercase tracking-wide shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Accepting Bookings
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 border border-blue-200/90 rounded-full shadow-2xs text-[11px] font-bold text-[#0755E8] shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0755E8]" />
                    Verified Mentor
                  </span>
                </div>

                <div className="text-xs sm:text-[13px] text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                  <span className="text-slate-800 font-bold capitalize">
                    {expertProfile?.title || "Senior Software Engineer"}
                  </span>
                  {expertProfile?.company && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="font-extrabold text-slate-800 flex items-center gap-1 capitalize">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {expertProfile.company}
                      </span>
                    </>
                  )}
                  {expertProfile?.category && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                      <span className="text-[#0755E8] font-bold bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-100 text-xs">
                        {expertProfile.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Clean Action Buttons Aligned Without Any Collapsing or Squeezing */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <button
                onClick={() => navigate("/dashboard/reports")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 bg-white border border-slate-200/90 text-slate-700 text-xs sm:text-sm font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Download Report</span>
              </button>

              {user?.id && (
                <button
                  onClick={() => window.open(`/expert-profile/${user.id}`, "_blank")}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 bg-white border border-blue-200 text-[#0755E8] text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-50/80 transition-all shadow-2xs cursor-pointer whitespace-nowrap active:scale-95"
                  title="Public View"
                >
                  <ExternalLink className="w-4 h-4 text-[#0755E8]" />
                  <span>Public View</span>
                </button>
              )}

              <button
                onClick={() => navigate("/dashboard/availability")}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-[#0755E8]/25 hover:shadow-md cursor-pointer whitespace-nowrap active:scale-95"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Set Availability</span>
              </button>
            </div>
          </div>
        </div>"""

assert old_index_hero in index_text, "old_index_hero not found in Index.tsx"
index_text = index_text.replace(old_index_hero, new_index_hero, 1)

# Now calibrate the 4 Wave KPI Cards to proportionate size (min-h-[165px], text-3xl font, p-5)
old_cards = """          {/* 4 Floating Wave KPI Cards */}
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

new_cards = """          {/* 4 Floating Wave KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Sessions (Blue) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate("/dashboard/sessions")}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard/sessions")}
              className="relative bg-[#F0F6FF] border border-blue-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <Box className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-blue-100 flex items-center justify-center text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-blue-700 tracking-tight mb-0.5">
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
              className="relative bg-[#F0FDF4] border border-emerald-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-700 tracking-tight mb-0.5">
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
              className="relative bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-amber-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-500/30 group-hover:scale-105 transition-transform">
                  <Wallet className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-amber-200 flex items-center justify-center text-amber-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-amber-800 tracking-tight mb-0.5">
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
              className="relative bg-[#FFF1F2] border border-rose-200/80 rounded-2xl p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-rose-300 transition-all duration-200 cursor-pointer min-h-[165px] group text-left select-none"
            >
              <div className="flex items-center justify-between relative z-10 mb-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-sm shadow-rose-500/30 group-hover:scale-105 transition-transform">
                  <IndianRupee className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="w-7 h-7 rounded-full bg-white shadow-xs border border-rose-100 flex items-center justify-center text-rose-600 group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight size={14} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="relative z-10">
                <h4 className="text-xs sm:text-sm font-bold text-rose-700 tracking-tight mb-0.5">
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

if old_cards in index_text:
    index_text = index_text.replace(old_cards, new_cards, 1)

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(index_text)
print("Updated Index.tsx")
