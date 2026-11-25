with open('client/src/pages/expert/Sessions.tsx', 'rb') as f:
    raw = f.read()

old_wrapper = (
    b'        <div className="w-full space-y-6 text-left animate-in fade-in duration-200">\r\r\n'
    b'            <div className="space-y-6">'
)

new_wrapper = (
    b'        <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">\r\r\n'
    b'            {/* Decorative ambient blue lighting */}\r\r\n'
    b'            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />\r\r\n'
    b'            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />\r\r\n'
    b'\r\r\n'
    b'            <div className="relative z-10 space-y-6">'
)

if old_wrapper in raw:
    raw = raw.replace(old_wrapper, new_wrapper)
    with open('client/src/pages/expert/Sessions.tsx', 'wb') as f:
        f.write(raw)
    print("Wrapped Sessions.tsx successfully")
else:
    print("old_wrapper not found in Sessions.tsx")
