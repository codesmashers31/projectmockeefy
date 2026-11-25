with open('client/src/pages/expert/Settings.tsx', 'r', encoding='utf-8') as f:
    text = f.read() # in universal newlines mode, text has \n

old_toggle = '''const Toggle = ({
    checked,
    onChange,
    label,
    description,
    disabled = false
}: {
    checked: boolean;
    onChange: () => void;
    label: string;
    description?: string;
    disabled?: boolean;
}) => (
    <div className="flex items-start justify-between py-4">
        <div className="flex-1 pr-4">
            <label
                className={`text-sm font-medium text-gray-900 select-none ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                onClick={disabled ? undefined : onChange}
            >
                {label}
            </label>
            {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
        </div>
        <button
            type="button"
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                checked ? 'bg-blue-600' : 'bg-gray-200'
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            role="switch"
            aria-checked={checked}
            onClick={disabled ? undefined : onChange}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    </div>
);'''

new_toggle = '''const Toggle = ({
    checked,
    onChange,
    label,
    description,
    disabled = false
}: {
    checked: boolean;
    onChange: () => void;
    label: string;
    description?: string;
    disabled?: boolean;
}) => (
    <div className="flex items-start justify-between py-4.5 gap-4">
        <div className="flex-1 min-w-0 pr-2">
            <label
                className={`text-sm font-bold text-slate-900 select-none ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:text-blue-600"} transition-colors`}
                onClick={disabled ? undefined : onChange}
            >
                {label}
            </label>
            {description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>}
        </div>
        <button
            type="button"
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                checked ? 'bg-blue-600' : 'bg-slate-200'
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            role="switch"
            aria-checked={checked}
            onClick={disabled ? undefined : onChange}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    </div>
);'''

if old_toggle in text:
    text = text.replace(old_toggle, new_toggle)
    print("Replaced Toggle component")
else:
    print("old_toggle not found")

old_return = '''    return (
        <div className="sidebar-main-card relative w-full max-w-[1400px] mx-auto rounded-2xl sm:rounded-[28px] border border-slate-200/90 bg-gradient-to-b from-[#EBF3FF] via-white to-white p-4 sm:p-6 md:p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] overflow-hidden font-sans text-left space-y-8 animate-in fade-in duration-200">
            {/* Decorative ambient blue lighting */}
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-blue-300/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-200/25 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                        <p className="text-sm text-gray-500">Manage your preferences and account settings</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isDirty && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                                Unsaved changes
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={!isDirty || loading}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isDirty && !loading
                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer active:scale-95"
                                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-75"
                            }`}
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div>
                    <div className="max-w-3xl mx-auto space-y-8">

                        {/* Notifications Section */}
                        <section className="bg-white rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Bell size={20} />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl border border-gray-100 px-6 py-2">
                                <Toggle
                                    label="Email Notifications"
                                    description="Receive updates about new bookings and messages via email."
                                    checked={settings.emailAlerts}
                                    onChange={() => handleToggle('emailAlerts')}
                                />
                                <div className="h-px bg-gray-100" />
                                <Toggle
                                    label="SMS Alerts"
                                    description="Get text messages for immediate reminders (charges may apply)."
                                    checked={settings.smsAlerts}
                                    onChange={() => handleToggle('smsAlerts')}
                                />
                                <div className="h-px bg-gray-100" />
                                <Toggle
                                    label="Product Updates"
                                    description="Receive news about new features and improvements."
                                    checked={settings.marketingEmails}
                                    onChange={() => handleToggle('marketingEmails')}
                                />
                            </div>
                        </section>

                        {/* Privacy Section */}
                        <section className="bg-white rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                    <Shield size={20} />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Privacy & Visibility</h2>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl border border-gray-100 px-6 py-2">
                                <Toggle
                                    label="Public Profile"
                                    description="Allow your profile to be visible to candidates searching for experts."
                                    checked={settings.publicProfile}
                                    onChange={() => handleToggle('publicProfile')}
                                />
                                <div className="h-px bg-gray-100" />
                                <Toggle
                                    label="Show Online Status"
                                    description="Let others know when you are currently active."
                                    checked={settings.showOnlineStatus}
                                    onChange={() => handleToggle('showOnlineStatus')}
                                />
                                <div className="h-px bg-gray-100" />
                                <Toggle
                                    label="Search Engine Indexing"
                                    description="Allow your profile to appear in Google search results."
                                    checked={settings.allowSearchEngines}
                                    onChange={() => handleToggle('allowSearchEngines')}
                                />
                            </div>
                        </section>

                        {/* Session Preferences */}
                        <section className="bg-white rounded-lg">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                    <Clock size={20} />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900">Session Preferences</h2>
                            </div>
                            <div className="bg-gray-50/50 rounded-xl border border-gray-100 px-6 py-2">
                                <Toggle
                                    label="Auto-Accept Bookings"
                                    description="Automatically accept booking requests that match your availability."
                                    checked={settings.autoAccept}
                                    onChange={() => handleToggle('autoAccept')}
                                />
                                <div className="h-px bg-gray-100" />
                                <Toggle
                                    label="Allow Rescheduling"
                                    description="Allow candidates to reschedule sessions up to 24h in advance."
                                    checked={settings.allowRescheduling}
                                    onChange={() => handleToggle('allowRescheduling')}
                                />
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    );'''

new_return = '''    return (
        <div className="w-full space-y-6 text-left animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4 pb-2 border-b border-slate-200/70">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage your notifications, privacy, and interview preferences</p>
                </div>
                <div className="flex items-center gap-3">
                    {isDirty && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 shadow-2xs animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Unsaved changes</span>
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || loading}
                        className={`flex items-center gap-2 px-4.5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                            isDirty && !loading
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md cursor-pointer active:scale-95"
                                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        }`}
                    >
                        {loading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={15} />
                        )}
                        <span>{loading ? "Saving..." : "Save Changes"}</span>
                    </button>
                </div>
            </div>

            {/* Content Cards */}
            <div className="space-y-6">
                {/* Notifications Section Card */}
                <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <Bell size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Notifications</h2>
                            <p className="text-xs text-slate-500">Configure your booking notifications and alert channels</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/60 rounded-2xl border border-slate-100 px-5 sm:px-6 divide-y divide-slate-100">
                        <Toggle
                            label="Email Notifications"
                            description="Receive updates about new bookings and messages via email."
                            checked={settings.emailAlerts}
                            onChange={() => handleToggle('emailAlerts')}
                        />
                        <Toggle
                            label="SMS Alerts"
                            description="Get text messages for immediate reminders (charges may apply)."
                            checked={settings.smsAlerts}
                            onChange={() => handleToggle('smsAlerts')}
                        />
                        <Toggle
                            label="Product Updates"
                            description="Receive news about new features and improvements."
                            checked={settings.marketingEmails}
                            onChange={() => handleToggle('marketingEmails')}
                        />
                    </div>
                </section>

                {/* Privacy & Visibility Section Card */}
                <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Privacy & Visibility</h2>
                            <p className="text-xs text-slate-500">Control candidate discoverability and online presence</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/60 rounded-2xl border border-slate-100 px-5 sm:px-6 divide-y divide-slate-100">
                        <Toggle
                            label="Public Profile"
                            description="Allow your profile to be visible to candidates searching for experts."
                            checked={settings.publicProfile}
                            onChange={() => handleToggle('publicProfile')}
                        />
                        <Toggle
                            label="Show Online Status"
                            description="Let others know when you are currently active."
                            checked={settings.showOnlineStatus}
                            onChange={() => handleToggle('showOnlineStatus')}
                        />
                        <Toggle
                            label="Search Engine Indexing"
                            description="Allow your profile to appear in Google search results."
                            checked={settings.allowSearchEngines}
                            onChange={() => handleToggle('allowSearchEngines')}
                        />
                    </div>
                </section>

                {/* Session Preferences Section Card */}
                <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Session Preferences</h2>
                            <p className="text-xs text-slate-500">Configure scheduling automation and candidate rescheduling rules</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/60 rounded-2xl border border-slate-100 px-5 sm:px-6 divide-y divide-slate-100">
                        <Toggle
                            label="Auto-Accept Bookings"
                            description="Automatically accept booking requests that match your availability."
                            checked={settings.autoAccept}
                            onChange={() => handleToggle('autoAccept')}
                        />
                        <Toggle
                            label="Allow Rescheduling"
                            description="Allow candidates to reschedule sessions up to 24h in advance."
                            checked={settings.allowRescheduling}
                            onChange={() => handleToggle('allowRescheduling')}
                        />
                    </div>
                </section>
            </div>
        </div>
    );'''

if old_return in text:
    text = text.replace(old_return, new_return)
    print("Replaced return JSX")
else:
    print("old_return not found")

# Convert \n to \r\n for Windows CRLF
text_crlf = text.replace('\r\n', '\n').replace('\n', '\r\n')
with open('client/src/pages/expert/Settings.tsx', 'wb') as f:
    f.write(text_crlf.encode('utf-8'))

print("Saved Settings.tsx successfully")
