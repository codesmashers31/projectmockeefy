with open('client/src/pages/expert/Sessions.tsx', 'r', encoding='utf-8', newline='') as f:
    text = f.read()

# 1. Replace outer container
old_wrapper = '''        <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-6">'''

new_wrapper = '''        <div className="w-full space-y-6 text-left animate-in fade-in duration-200">
            <div className="space-y-6">'''

if old_wrapper in text:
    text = text.replace(old_wrapper, new_wrapper)
    print("Replaced outer wrapper")
else:
    print("old_wrapper not found, check current text")

# 2. Replace 3 KPI cards with Option 4 Modern KPI cards
old_kpi = '''                {/* ======================================================== */}
                {/* --- 2. COMPACT SUMMARY METRICS --- */}
                {/* ======================================================== */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {/* Upcoming Sessions */}
                    <div
                        onClick={() => { setStatusFilter('upcoming'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'upcoming'
                                ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-500/10'
                                : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <CalendarCheck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{upcomingSessionsCount}</span>
                            <span className="text-xs text-slate-500 font-medium">Interviews</span>
                        </div>
                    </div>

                    {/* Today's Agenda */}
                    <div
                        onClick={() => { setDateQuickFilter('today'); setCustomDateFilter(''); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            dateQuickFilter === 'today'
                                ? 'bg-white border-emerald-400 shadow-md ring-2 ring-emerald-500/10'
                                : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Agenda</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{todaySessionsCount}</span>
                            <span className="text-xs text-slate-500 font-medium">Scheduled today</span>
                        </div>
                    </div>

                    {/* Completed Sessions */}
                    <div
                        onClick={() => { setStatusFilter('completed'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'completed'
                                ? 'bg-white border-purple-400 shadow-md ring-2 ring-purple-500/10'
                                : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed</span>
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">{completedSessionsCount}</span>
                            <span className="text-xs text-slate-500 font-medium">Total interviews</span>
                        </div>
                    </div>
                </div>'''

new_kpi = '''                {/* ======================================================== */}
                {/* --- 2. OPTION 4 MODERN KPI CARDS --- */}
                {/* ======================================================== */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    {/* Upcoming Sessions */}
                    <div
                        onClick={() => { setStatusFilter('upcoming'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`relative overflow-hidden p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                            statusFilter === 'upcoming'
                                ? 'bg-gradient-to-b from-[#EBF3FF] via-white to-white border-blue-400 shadow-md ring-2 ring-blue-500/15'
                                : 'bg-gradient-to-b from-[#F5F8FF] via-white to-white border-blue-100/90 hover:border-blue-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <CalendarCheck className="w-4 h-4" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="relative z-10 space-y-0.5">
                            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Upcoming</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{upcomingSessionsCount}</span>
                                <span className="text-xs text-slate-500 font-medium">Interviews</span>
                            </div>
                        </div>
                        {/* Option 4 Decorative Bottom Wave */}
                        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none opacity-40">
                            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full text-blue-500 fill-current">
                                <path d="M0,32 C120,55 240,10 400,32 L400,60 L0,60 Z" />
                            </svg>
                        </div>
                    </div>

                    {/* Today's Agenda */}
                    <div
                        onClick={() => { setDateQuickFilter('today'); setCustomDateFilter(''); }}
                        className={`relative overflow-hidden p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                            dateQuickFilter === 'today'
                                ? 'bg-gradient-to-b from-[#ECFDF5] via-white to-white border-emerald-400 shadow-md ring-2 ring-emerald-500/15'
                                : 'bg-gradient-to-b from-[#F2FBF7] via-white to-white border-emerald-100/90 hover:border-emerald-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="relative z-10 space-y-0.5">
                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Today's Agenda</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{todaySessionsCount}</span>
                                <span className="text-xs text-slate-500 font-medium">Scheduled today</span>
                            </div>
                        </div>
                        {/* Option 4 Decorative Bottom Wave */}
                        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none opacity-40">
                            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full text-emerald-500 fill-current">
                                <path d="M0,32 C120,55 240,10 400,32 L400,60 L0,60 Z" />
                            </svg>
                        </div>
                    </div>

                    {/* Completed Sessions */}
                    <div
                        onClick={() => { setStatusFilter('completed'); setDateQuickFilter('all'); setCustomDateFilter(''); }}
                        className={`relative overflow-hidden p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                            statusFilter === 'completed'
                                ? 'bg-gradient-to-b from-[#FAF5FF] via-white to-white border-purple-400 shadow-md ring-2 ring-purple-500/15'
                                : 'bg-gradient-to-b from-[#FBF8FF] via-white to-white border-purple-100/90 hover:border-purple-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="relative z-10 space-y-0.5">
                            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Completed</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{completedSessionsCount}</span>
                                <span className="text-xs text-slate-500 font-medium">Total interviews</span>
                            </div>
                        </div>
                        {/* Option 4 Decorative Bottom Wave */}
                        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none opacity-40">
                            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full text-purple-500 fill-current">
                                <path d="M0,32 C120,55 240,10 400,32 L400,60 L0,60 Z" />
                            </svg>
                        </div>
                    </div>
                </div>'''

if old_kpi in text:
    text = text.replace(old_kpi, new_kpi)
    print("Replaced KPI cards")
else:
    print("old_kpi not found")

# 3. Upgrade toolbar container
text = text.replace(
    '<div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">',
    '<div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 space-y-3.5 shadow-xs">'
)

# 4. Upgrade Modal Container
text = text.replace(
    '<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">',
    '<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90">'
)

with open('client/src/pages/expert/Sessions.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(text)

print("Saved Sessions.tsx successfully")
