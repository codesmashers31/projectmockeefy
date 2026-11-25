with open('client/src/pages/expert/Settings.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_start = '    return (\n        <div className="w-full space-y-6 text-left animate-in fade-in duration-200">\n            {/* Header */}'
new_start = '''    return (
        <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

            {/* Content Layer */}
            <div className="relative z-10 space-y-6">
                {/* Header */}'''

old_end = '''                    </div>
                </section>
            </div>
        </div>
    );'''

new_end = '''                    </div>
                </section>
            </div>
        </div>
    </div>
    );'''

if old_start in text and old_end in text:
    text = text.replace(old_start, new_start)
    text = text.replace(old_end, new_end)
    text_crlf = text.replace('\r\n', '\n').replace('\n', '\r\n')
    with open('client/src/pages/expert/Settings.tsx', 'wb') as f:
        f.write(text_crlf.encode('utf-8'))
    print("Wrapped Settings.tsx successfully")
else:
    print("Could not find start or end targets in Settings.tsx")
