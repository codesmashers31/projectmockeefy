import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Check, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "./auth/AuthLayout";
import MockeefyLogo from "./MockeefyLogo";

interface LocationState {
  email?: string;
  userType?: string;
  googleId?: string;
  name?: string;
  isExisting?: boolean;
}

/**
 * Hand-drawn outline illustration icon for Candidate
 * Depicts a learner with graduation cap, notebook with checkmarks, and hand-drawn stars/sparkles.
 */
function CandidateHandDrawnIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full transition-transform duration-300 group-hover:scale-110"
      aria-hidden="true"
    >
      {/* Soft gradient / colorful background blob */}
      <path
        d="M14 20C16 11 27 7 38 9C49 11 55 21 53 33C51 45 41 54 28 53C15 52 10 40 12 29C12.5 24 13 22 14 20Z"
        fill={isSelected ? "#DBEAFE" : "#EFF6FF"}
        className="transition-colors duration-200"
      />

      {/* Body / Vibrant Blue Shirt */}
      <path
        d="M17 45C17 37 21 34 28 34C35 34 39 37 39 45"
        fill="#3B82F6"
        stroke="#1E40AF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Shirt collar notch */}
      <path d="M26 34L28 37L30 34" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" />

      {/* Head with warm skin tone */}
      <circle
        cx="28"
        cy="22"
        r="9.5"
        fill="#FFEDD5"
        stroke="#1E293B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Friendly Eyes & Smile */}
      <circle cx="25" cy="21.5" r="1.1" fill="#1E293B" />
      <circle cx="31" cy="21.5" r="1.1" fill="#1E293B" />
      <path
        d="M25 25.5C26.5 27.5 29.5 27.5 31 25.5"
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Cheerful rosy cheeks */}
      <circle cx="23" cy="24" r="1.5" fill="#FDA4AF" opacity="0.8" />
      <circle cx="33" cy="24" r="1.5" fill="#FDA4AF" opacity="0.8" />

      {/* Vibrant Indigo Graduation Cap */}
      <path
        d="M18 15L28 10.5L38 15L28 19.5L18 15Z"
        fill="#4F46E5"
        stroke="#1E1B4B"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M23 17.5V20.5C23 22 25.5 23.5 28 23.5C30.5 23.5 33 22 33 20.5V17.5"
        fill="#4338CA"
        stroke="#1E1B4B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Gold Tassel */}
      <path
        d="M38 15V21C38 21.8 40 22 40 21V16"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="40" cy="22" r="1.4" fill="#F59E0B" />

      {/* Resume / Checklist Sheet */}
      <rect
        x="33"
        y="27"
        width="19"
        height="24"
        rx="3"
        fill="#FFFFFF"
        stroke="#2563EB"
        strokeWidth="1.8"
      />
      {/* Sheet header bar */}
      <rect x="35" y="29" width="15" height="3" rx="1" fill="#3B82F6" />
      {/* Checklist blue lines */}
      <line x1="36" y1="35.5" x2="47" y2="35.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="36" y1="39.5" x2="45" y2="39.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="36" y1="43.5" x2="43" y2="43.5" stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" />

      {/* Bright Green Checkmark badge on resume */}
      <circle cx="47" cy="44" r="4.5" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.4" />
      <path
        d="M45 44L46.5 45.5L49.5 42.5"
        stroke="#059669"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Colorful Sparkles */}
      <path d="M48 9L49.5 12.5L53 14L49.5 15.5L48 19L46.5 15.5L43 14L46.5 12.5L48 9Z" fill="#F59E0B" />
      <path d="M10 26L11.5 28.5L14 30L11.5 31.5L10 34L8.5 31.5L6 30L8.5 28.5L10 26Z" fill="#06B6D4" />
    </svg>
  );
}

/**
 * Hand-drawn outline illustration icon for Expert
 * Depicts a mentor with glasses, suit collar/tie, insight speech bubble with star, and verified badge.
 */
function ExpertHandDrawnIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full transition-transform duration-300 group-hover:scale-110"
      aria-hidden="true"
    >
      {/* Soft gradient / colorful warm background blob */}
      <path
        d="M12 23C14 13 25 8 37 9C49 10 56 20 54 32C52 44 43 54 30 54C17 54 9 42 10 31C10.5 27 11.2 25 12 23Z"
        fill={isSelected ? "#FEF3C7" : "#FFFBEB"}
        className="transition-colors duration-200"
      />

      {/* Professional Suit Jacket & Tie */}
      <path
        d="M16 45C16 36 20 33 27 33C34 33 38 36 38 45"
        fill="#1E293B"
        stroke="#0F172A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Crisp White Shirt Collar */}
      <path d="M23 33L27 37L31 33" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.4" />
      {/* Vibrant Red / Coral Tie */}
      <path d="M25.5 33.5L27 38L28.5 33.5" stroke="#EF4444" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M26 38L27 45L28 38" stroke="#EF4444" strokeWidth="1.8" fill="#EF4444" />

      {/* Head with warm skin tone */}
      <circle
        cx="27"
        cy="22"
        r="9.5"
        fill="#FFEDD5"
        stroke="#1E293B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Sleek Royal Blue Glasses with Lens Shimmer */}
      <rect x="20.5" y="19" width="6" height="4.5" rx="1.2" fill="#DBEAFE" stroke="#0755E8" strokeWidth="1.7" />
      <rect x="28.5" y="19" width="6" height="4.5" rx="1.2" fill="#DBEAFE" stroke="#0755E8" strokeWidth="1.7" />
      <line x1="26.5" y1="20.5" x2="28.5" y2="20.5" stroke="#0755E8" strokeWidth="1.6" />
      {/* Lens reflection glints */}
      <line x1="22" y1="20.5" x2="23.5" y2="22" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
      <line x1="30" y1="20.5" x2="31.5" y2="22" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />

      {/* Confident Smile */}
      <path
        d="M24.5 26.5C26 28.2 29 28.2 30.5 26.5"
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Cheeks */}
      <circle cx="22" cy="24.5" r="1.4" fill="#FDA4AF" opacity="0.7" />
      <circle cx="32" cy="24.5" r="1.4" fill="#FDA4AF" opacity="0.7" />

      {/* Golden Insight Speech Bubble with Star */}
      <path
        d="M38 14C38 9.5 44 7 50 7C56 7 60 10 60 15.5C60 20.5 55 23.5 49 23.5C47.5 23.5 45.5 24 44 25.5C44.5 24 44 23 43.5 22.5C39.5 21 38 17.5 38 14Z"
        fill="#FFFBEB"
        stroke="#F59E0B"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shiny Gold Star */}
      <path
        d="M49 10L50.3 12.8L53.3 13.2L51 15.2L51.6 18.2L49 16.7L46.4 18.2L47 15.2L44.7 13.2L47.7 12.8L49 10Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Verified Shield Badge (Emerald & Cyan) */}
      <path
        d="M44 33L51 30L58 33V40C58 45.5 54 49.5 51 51.5C48 49.5 44 45.5 44 40V33Z"
        fill="#10B981"
        stroke="#047857"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Shield inner highlight */}
      <path
        d="M46 35L51 32.8L56 35V39.5C56 43.5 53 46.8 51 48.5C49 46.8 46 43.5 46 39.5V35Z"
        fill="#34D399"
        opacity="0.5"
      />
      {/* Crisp White Checkmark */}
      <path
        d="M47.5 40.5L49.8 42.8L54.5 37.5"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Colorful Sparkles */}
      <path d="M12 10L13.5 13L16.5 14.5L13.5 16L12 19L10.5 16L7.5 14.5L10.5 13L12 10Z" fill="#F59E0B" />
      <path d="M57 26L58 27.5L60 28.5L58 29.5L57 31L56 29.5L54 28.5L56 27.5L57 26Z" fill="#8B5CF6" />
    </svg>
  );
}

const inputClass =
  "w-full h-11 px-5 rounded-full border border-slate-200 bg-slate-50/30 text-slate-900 placeholder:text-slate-400 focus:border-[#0755E8] focus:ring-2 focus:ring-[#93B8FF]/40 focus:bg-white outline-none transition-all text-sm";
const labelClass = "block text-xs font-semibold text-slate-700 mb-1.5";
const btnPrimary =
  "w-full h-11 rounded-full bg-[#0755E8] text-white font-bold text-sm hover:bg-[#0645C7] transition-all shadow-md shadow-[#0755E8]/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, register } = useAuth();
  const state = (location.state || {}) as LocationState;

  const effectiveEmail = state?.email || user?.email || "";
  const effectiveName = state?.name || user?.name || "";
  const effectiveUserType = state?.userType || user?.userType || (user as any)?.role || "";
  const effectiveGoogleId = state?.googleId;
  const isExisting = Boolean(state?.isExisting || user?.email);

  const [formData, setFormData] = useState({
    name: effectiveName,
    password: "",
    confirmPassword: "",
    userType: effectiveUserType,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!effectiveEmail) {
      navigate("/signup", { replace: true });
      return;
    }
    if (effectiveUserType) {
      setFormData((prev) => ({ ...prev, userType: prev.userType || effectiveUserType }));
    }
    if (effectiveName) {
      setFormData((prev) => ({ ...prev, name: prev.name || effectiveName }));
    }
  }, [effectiveEmail, effectiveName, effectiveUserType, navigate]);

  const handleInputChange = (field: string, value: string) => {
    setError("");
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!formData.userType) {
      setError("Please select whether you're a Candidate or Expert");
      return;
    }

    if (!isExisting) {
      if (!formData.password || formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    } else {
      if (formData.password) {
        if (formData.password.length < 6) {
          setError("New password must be at least 6 characters long");
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          return;
        }
      }
    }

    setIsLoading(true);
    setError("");

    try {
      await register(
        effectiveEmail,
        formData.password || undefined,
        formData.userType,
        formData.name.trim(),
        effectiveGoogleId
      );
      if (formData.userType === "expert") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete profile");
    } finally {
      setIsLoading(false);
    }
  };

  if (!effectiveEmail) return null;

  return (
    <AuthLayout title="Complete profile">
      <div className="bg-white rounded-[28px] border border-slate-100 p-6 sm:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <MockeefyLogo className="h-10 w-10 sm:h-12 sm:w-12" variant="brand" />
          <span className="text-2xl font-logo tracking-tight text-[#0755E8]">Mockeefy</span>
        </div>

        <div className="text-center sm:text-left mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Complete your profile</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isExisting ? "Review and confirm your details to continue" : "Add your details and select your account role to get started"}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Full Name */}
          <div>
            <label htmlFor="name" className={labelClass}>
              Full name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* 2. Interactive Role Selection: Candidate vs Expert */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>
                I am a
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                Choose your account role
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Candidate Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleInputChange("userType", "candidate")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleInputChange("userType", "candidate")}
                className={`group relative rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                  formData.userType === "candidate"
                    ? "border-2 border-[#0755E8] bg-gradient-to-b from-[#F0F5FF]/90 via-[#F8FAFF] to-white shadow-[0_6px_20px_-4px_rgba(7,85,232,0.16)] ring-3 ring-[#0755E8]/10"
                    : "border border-slate-200/90 bg-white hover:border-[#0755E8]/50 hover:bg-slate-50/50 shadow-2xs hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {/* Compact Hand-Drawn Candidate Illustration Icon Container */}
                    <div
                      className={`w-9.5 h-9.5 min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center p-1 transition-all duration-200 ${
                        formData.userType === "candidate"
                          ? "bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 border-2 border-[#0755E8] shadow-sm shadow-[#0755E8]/20 ring-2 ring-[#0755E8]/15"
                          : "bg-gradient-to-br from-blue-50/90 via-sky-50/60 to-indigo-50/50 border border-blue-200/80 shadow-2xs group-hover:border-[#0755E8]/60 group-hover:shadow-xs group-hover:scale-105"
                      }`}
                    >
                      <CandidateHandDrawnIcon isSelected={formData.userType === "candidate"} />
                    </div>

                    {/* Radio Checkmark Indicator */}
                    <div
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                        formData.userType === "candidate"
                          ? "bg-[#0755E8] text-white shadow-xs"
                          : "border-2 border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {formData.userType === "candidate" && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 tracking-tight leading-snug">
                    Candidate
                  </h3>

                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-normal mt-0.5">
                    Mock Drills • Scorecards • Certificates
                  </p>
                </div>
              </div>

              {/* Expert Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleInputChange("userType", "expert")}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleInputChange("userType", "expert")}
                className={`group relative rounded-xl sm:rounded-2xl p-3 sm:p-3.5 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                  formData.userType === "expert"
                    ? "border-2 border-[#0755E8] bg-gradient-to-b from-[#F0F5FF]/90 via-[#F8FAFF] to-white shadow-[0_6px_20px_-4px_rgba(7,85,232,0.16)] ring-3 ring-[#0755E8]/10"
                    : "border border-slate-200/90 bg-white hover:border-[#0755E8]/50 hover:bg-slate-50/50 shadow-2xs hover:shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {/* Compact Hand-Drawn Expert Illustration Icon Container */}
                    <div
                      className={`w-9.5 h-9.5 min-w-[38px] min-h-[38px] rounded-xl flex items-center justify-center p-1 transition-all duration-200 ${
                        formData.userType === "expert"
                          ? "bg-gradient-to-br from-amber-100/90 via-orange-50 to-indigo-100 border-2 border-[#0755E8] shadow-sm shadow-[#0755E8]/20 ring-2 ring-[#0755E8]/15"
                          : "bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-indigo-50/50 border border-amber-200/80 shadow-2xs group-hover:border-amber-400 group-hover:shadow-xs group-hover:scale-105"
                      }`}
                    >
                      <ExpertHandDrawnIcon isSelected={formData.userType === "expert"} />
                    </div>

                    {/* Radio Checkmark Indicator */}
                    <div
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                        formData.userType === "expert"
                          ? "bg-[#0755E8] text-white shadow-xs"
                          : "border-2 border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {formData.userType === "expert" && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 tracking-tight leading-snug">
                    Expert
                  </h3>

                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-normal mt-0.5">
                    Flexible Hours • Payouts • Mentorship
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Password */}
          <div>
            <label htmlFor="password" className={labelClass}>
              Create password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={isExisting ? "Set new password (optional)" : "At least 6 characters"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`${inputClass} pr-11`}
                required={!isExisting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 4. Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder={isExisting ? "Repeat password if changing" : "Repeat password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className={`${inputClass} pr-11`}
                required={!isExisting && Boolean(formData.password)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={isLoading} className={btnPrimary}>
            {isLoading ? (isExisting ? "Saving..." : "Creating account...") : (isExisting ? "Save & Continue" : "Complete account")}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          <Link to="/signin" className="font-semibold text-[#0755E8] hover:text-[#0645C7] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
