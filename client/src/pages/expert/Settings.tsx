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
    );
}
