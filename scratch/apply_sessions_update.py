with open('client/src/pages/expert/Sessions.tsx', 'rb') as f:
    raw = f.read()

# Replace outer sidebar-main-card wrapper
old_wrapper = (
    b'        <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">\r\r\n'
    b'            {/* Decorative ambient blue lighting */}\r\r\n'
    b'            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />\r\r\n'
    b'            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />\r\r\n'
    b'\r\r\n'
    b'            <div className="relative z-10 space-y-6">'
)

new_wrapper = (
    b'        <div className="w-full space-y-6 text-left animate-in fade-in duration-200">\r\r\n'
    b'            <div className="space-y-6">'
)

print('old_wrapper found:', old_wrapper in raw)
if old_wrapper in raw:
    raw = raw.replace(old_wrapper, new_wrapper)
    print("Replaced wrapper successfully!")

# Replace KPI cards
old_kpi_start = b'                {/* --- 2. COMPACT SUMMARY METRICS --- */}'
old_kpi_end = b'                {/* --- 3. FILTER & SEARCH TOOLBAR --- */}'

idx_start = raw.find(old_kpi_start)
idx_end = raw.find(old_kpi_end)
print('KPI start:', idx_start, 'KPI end:', idx_end)

if idx_start != -1 and idx_end != -1:
    # Find the comment block start before old_kpi_start
    banner_start = raw.rfind(b'                {/* ======================================================== */}', 0, idx_start)
    banner_end = raw.rfind(b'                {/* ======================================================== */}', 0, idx_end)
    
    new_kpi = (
        b'                {/* --- 2. OPTION 4 MODERN KPI CARDS --- */}\r\r\n'
        b'                {/* ======================================================== */}\r\r\n'
        b'                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">\r\r\n'
        b'                    {/* Upcoming Sessions */}\r\r\n'
        b'                    <div\r\r\n'
        b'                        onClick={() => { setStatusFilter(\'upcoming\'); setDateQuickFilter(\'all\'); setCustomDateFilter(\'\'); }}\r\r\n'
        b'                        className={`relative overflow-hidden p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${\r\r\n'
        b'                            statusFilter === \'upcoming\'\r\r\n'
        b'                                ? \'bg-gradient-to-b from-[#EBF3FF] via-white to-white border-blue-400 shadow-md ring-2 ring-blue-500/15\'\r\r\n'
        b'                                : \'bg-gradient-to-b from-[#F5F8FF] via-white to-white border-blue-100/90 hover:border-blue-300 shadow-2xs hover:shadow-xs\'\r\r\n'
        b'                        }`}\r\r\n'
        b'                    >\r\r\n'
        b'                        <div className="flex items-center justify-between mb-3 relative z-10">\r\r\n'
        b'                            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">\r\r\n'
        b'                                <CalendarCheck className="w-4 h-4" />\r\r\n'
        b'                            </div>\r\r\n'
        b'                            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">\r\r\n'
        b'                                <ChevronRight className="w-3.5 h-3.5" />\r\r\n'
        b'                            </div>\r\r\n'
        b'                        </div>\r\r\n'
        b'                        <div className="relative z-10 space-y-0.5">\r\r\n'
        b'                            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">Upcoming</span>\r\r\n'
        b'                            <div className="flex items-baseline gap-2">\r\r\n'
        b'                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{upcomingSessionsCount}</span>\r\r\n'
        b'                                <span className="text-xs text-slate-500 font-medium">Interviews</span>\r\r\n'
        b'                            </div>\r\r\n'
        b'                        </div>\r\r\n'
        b'                        {/* Option 4 Decorative Bottom Wave */}\r\r\n'
        b'                        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none opacity-40">\r\r\n'
        b'                            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full text-blue-500 fill-current">\r\r\n'
        b'                                <path d="M0,32 C120,55 240,10 400,32 L400,60 L0,60 Z" />\r\r\n'
        b'                            </svg>\r\r\n'
        b'                        </div>\r\r\n'
        b'                    </div>\r\r\n'
        b'\r\r\n'
        b'                    {/* Today\'s Agenda */}\r\r\n'
        b'                    <div\r\r\n'
        b'                        onClick={() => { setDateQuickFilter(\'today\'); setCustomDateFilter(\'\'); }}\r\r\n'
        b'                        className={`relative overflow-hidden p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${\r\r\n'
        b'                            dateQuickFilter === \'today\'\r\r\n'
        b'                                ? \'bg-gradient-to-b from-[#ECFDF5] via-white to-white border-emerald-400 shadow-md ring-2 ring-emerald-500/15\'\r\r\n'
        b'                                : \'bg-gradient-to-b from-[#F2FBF7] via-white to-white border-emerald-100/90 hover:border-emerald-300 shadow-2xs hover:shadow-xs\'\r\r\n'
        b'                        }`}\r\r\n'
        b'                    >\r\r\n'
        b'                        <div className="flex items-center justify-between mb-3 relative z-10">\r\r\n'
        b'                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">\r\r\n'
        b'                                <Clock className="w-4 h-4" />\r\r\n'
        b'                            </div>\r\r\n'
        b'                            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">\r\r\n'
        b'                                <ChevronRight className="w-3.5 h-3.5" />\r\r\n'
        b'                            </div>\r\r\n'
        b'                        </div>\r\r\n'
        b'                        <div className="relative z-10 space-y-0.5">\r\r\n'
        b'                            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Today\'s Agenda</span>\r\r\n'
        b'                            <div className="flex items-baseline gap-2">\r\r\n'
        b'                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{todaySessionsCount}</span>\r\r\n'
        b'                                <span className="text-xs text-slate-500 font-medium">Scheduled today</span>\r\r\n'
        b'                            </div>\r\r\n'
        b'                        </div>\r\r\n'
        b'                        {/* Option 4 Decorative Bottom Wave */}\r\r\n'
        b'                        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none opacity-40">\r\r\n'
        b'                            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full text-emerald-500 fill-current">\r\r\n'
        b'                                <path d="M0,32 C120,55 240,10 400,32 L400,60 L0,60 Z" />\r\r\n'
        b'                            </svg>\r\r\n'
        b'                        </div>\r\r\n'
        b'                    </div>\r\r\n'
        b'\r\r\n'
        b'                    {/* Completed Sessions */}\r\r\n'
        b'                    <div\r\r\n'
        b'                        onClick={() => { setStatusFilter(\'completed\'); setDateQuickFilter(\'all\'); setCustomDateFilter(\'\'); }}\r\r\n'
        b'                        className={`relative overflow-hidden p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${\r\r\n'
        b'                            statusFilter === \'completed\'\r\r\n'
        b'                                ? \'bg-gradient-to-b from-[#FAF5FF] via-white to-white border-purple-400 shadow-md ring-2 ring-purple-500/15\'\r\r\n'
        b'                                : \'bg-gradient-to-b from-[#FBF8FF] via-white to-white border-purple-100/90 hover:border-purple-300 shadow-2xs hover:shadow-xs\'\r\r\n'
        b'                        }`}\r\r\n'
        b'                    >\r\r\n'
        b'                        <div className="flex items-center justify-between mb-3 relative z-10">\r\r\n'
        b'                            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">\r\r\n'
        b'                                <CheckCircle2 className="w-4 h-4" />\r\r\n'
        b'                            </div>\r\r\n'
        b'                            <div className="w-6 h-6 rounded-full bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600">\r\r\n'
        b'                                <ChevronRight className="w-3.5 h-3.5" />\r\r\n'
        b'                            </div>\r\r\n'
        b'                        </div>\r\r\n'
        b'                        <div className="relative z-10 space-y-0.5">\r\r\n'
        b'                            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Completed</span>\r\r\n'
        b'                            <div className="flex items-baseline gap-2">\r\r\n'
        b'                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{completedSessionsCount}</span>\r\r\n'
        b'                                <span className="text-xs text-slate-500 font-medium">Total interviews</span>\r\r\n'
        b'                            </div>\r\r\n'
        b'                        </div>\r\r\n'
        b'                        {/* Option 4 Decorative Bottom Wave */}\r\r\n'
        b'                        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none opacity-40">\r\r\n'
        b'                            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full text-purple-500 fill-current">\r\r\n'
        b'                                <path d="M0,32 C120,55 240,10 400,32 L400,60 L0,60 Z" />\r\r\n'
        b'                            </svg>\r\r\n'
        b'                        </div>\r\r\n'
        b'                    </div>\r\r\n'
        b'                </div>\r\r\n\r\r\n'
    )
    
    raw = raw[:banner_start] + b'                {/* ======================================================== */}\r\r\n' + new_kpi + raw[banner_end:]
    print("Replaced KPI block successfully!")

# Upgrade toolbar container:
raw = raw.replace(
    b'<div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3.5 shadow-2xs">',
    b'<div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 space-y-3.5 shadow-xs">'
)

# Upgrade Modal Container:
raw = raw.replace(
    b'<div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">',
    b'<div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200/90">'
)

with open('client/src/pages/expert/Sessions.tsx', 'wb') as f:
    f.write(raw)

print("Saved client/src/pages/expert/Sessions.tsx successfully")
