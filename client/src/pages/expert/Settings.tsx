import { useState, useEffect, useMemo, useCallback } from "react";
import { Bell, Shield, Clock, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "../../lib/axios";
import { useAuth } from "../../context/AuthContext";
import ExpertPageSkeleton from "../../components/ExpertPageSkeleton";

// Simple Tailwind Switch Component
const Toggle = ({
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
);

export interface ExpertSettingsState {
    emailAlerts: boolean;
    smsAlerts: boolean;
    marketingEmails: boolean;
    publicProfile: boolean;
    showOnlineStatus: boolean;
    allowSearchEngines: boolean;
    autoAccept: boolean;
    allowRescheduling: boolean;
}

const DEFAULT_SETTINGS: ExpertSettingsState = {
    emailAlerts: true,
    smsAlerts: false,
    marketingEmails: false,
    publicProfile: true,
    showOnlineStatus: true,
    allowSearchEngines: true,
    autoAccept: false,
    allowRescheduling: true
};

export default function Settings() {
    const { isLoading: isAuthLoading } = useAuth();
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<ExpertSettingsState>(DEFAULT_SETTINGS);
    const [initialSettings, setInitialSettings] = useState<ExpertSettingsState | null>(null);

    // Fetch persisted preferences from MongoDB
    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get("/api/expert/settings");
            if (res.data?.success && res.data.settings) {
                const loaded: ExpertSettingsState = { ...DEFAULT_SETTINGS, ...res.data.settings };
                setSettings(loaded);
                setInitialSettings(loaded);
            }
        } catch (err: any) {
            console.error("Error loading expert settings:", err);
            toast.error(err.response?.data?.message || "Failed to load preferences from server.");
        } finally {
            setInitialLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Detect unsaved changes (dirty state)
    const isDirty = useMemo(() => {
        if (!initialSettings) return false;
        return (Object.keys(settings) as Array<keyof ExpertSettingsState>).some(
            (key) => settings[key] !== initialSettings[key]
        );
    }, [settings, initialSettings]);

    // Unsaved modifications browser navigation warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const handleToggle = (key: keyof ExpertSettingsState) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        if (!isDirty || loading) return;
        setLoading(true);

        try {
            const res = await axios.put("/api/expert/settings", settings);
            if (res.data?.success && res.data.settings) {
                const saved: ExpertSettingsState = { ...DEFAULT_SETTINGS, ...res.data.settings };
                setSettings(saved);
                setInitialSettings(saved);
                toast.success(res.data.message || "Settings saved successfully");
            } else {
                throw new Error(res.data?.message || "Failed to save settings");
            }
        } catch (err: any) {
            console.error("Error persisting expert settings:", err);
            toast.error(err.response?.data?.message || "Failed to save settings. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (isAuthLoading || initialLoading) {
        return <ExpertPageSkeleton variant="settings" />;
    }

    return (
        <div className="sidebar-main-card relative w-full rounded-2xl sm:rounded-[28px] border border-blue-200/80 bg-gradient-to-b from-[#DCEBFF] via-[#F4F8FF] to-white p-4 sm:p-6 md:p-8 shadow-[0_8px_32px_-12px_rgba(7,85,232,0.08)] overflow-hidden font-sans text-left space-y-6 animate-in fade-in duration-200">
            {/* Decorative ambient blue lighting - Vivid & clearly visible */}
            <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/35 via-indigo-300/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-gradient-to-br from-sky-400/25 via-blue-200/20 to-transparent blur-2xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-200/30 via-blue-100/10 to-transparent pointer-events-none" />

            {/* Content Layer */}
            <div className="relative z-10 space-y-6">
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
    </div>
    );
}
