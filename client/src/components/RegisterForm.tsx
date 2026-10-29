// src/components/RegisterForm.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/axios";
import { isAxiosError } from "axios";
import AuthLayout from "./auth/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { GoogleAuthButton } from "./auth/GoogleAuthButton";
import MockeefyLogo from "./MockeefyLogo";

interface FormData {
  email: string;
  otp: string;
  name: string;
  password: string;
  confirmPassword: string;
  googleId?: string;
}

export const RegisterForm = () => {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    otp: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { googleLogin } = useAuth();

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGoogleSuccess = async (accessToken: string) => {
    setError("");
    setIsLoading(true);
    try {
      const result = await googleLogin(accessToken);
      const isExisting = Boolean(result?.exists);
      const user = result?.user;

      if (isExisting && user) {
        // If already registered/logged-in user clicks Google on Create Account -> Navigate to dashboard
        const role = (user.userType || user.role)?.toLowerCase();
        if (role === "expert") {
          navigate("/dashboard", { replace: true });
        } else if (role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
        return;
      }

      const email = result?.googleData?.email || user?.email;
      const name = result?.googleData?.name || user?.name;
      const googleId = result?.googleData?.googleId || user?.googleId;
      const userType = user?.userType || user?.role;

      if (email) {
        navigate("/complete-profile", {
          state: {
            email,
            googleId,
            name,
            userType,
            isExisting: false,
          },
          replace: true,
        });
      } else {
        setError("Failed to retrieve Google profile details.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Google sign-up failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async () => {
    const res = await api.post("/api/auth/send-otp", { email: formData.email, type: "register" });
    return res.data;
  };

  const startCountdown = () => {
    setCountdown(30);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsLoading(true);
    try {
      await sendOtp();
      setFormData((prev) => ({ ...prev, otp: "" }));
      setStep("otp");
      startCountdown();
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message || "Failed to send OTP" : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await api.post("/api/auth/verify-otp", { email: formData.email, otp: formData.otp });
      navigate("/complete-profile", { state: { email: formData.email } });
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message || "Invalid code" : "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setError("");
    try {
      await sendOtp();
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full h-11 px-5 rounded-full border border-slate-200 bg-slate-50/30 text-slate-900 placeholder:text-slate-400 focus:border-[#0755E8] focus:ring-2 focus:ring-[#93B8FF]/40 focus:bg-white outline-none transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1.5";
  const btnPrimary =
    "w-full h-11 rounded-full bg-[#0755E8] text-white font-bold text-sm hover:bg-[#0645C7] active:bg-[#073AA3] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm";

  return (
    <AuthLayout title="Sign up">
      <div className="bg-white rounded-[28px] border border-slate-100 p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div className="flex items-center justify-center gap-2 mb-5">
          <MockeefyLogo className="h-12 w-12" variant="brand" />
          <span className="text-2xl font-logo tracking-tight text-[#0755E8]">Mockeefy</span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          {step === "email" ? "Create your account" : "Verify your email"}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {step === "email"
            ? "Join thousands of professionals mastering interviews"
            : `We sent a code to ${formData.email}`}
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {step === "email" ? (
          <>
            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading} className={btnPrimary}>
                {isLoading ? "Sending code..." : "Send verification code"}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Or continue with
                </span>
              </div>
            </div>

            <GoogleAuthButton
              onSuccess={handleGoogleSuccess}
              onError={setError}
              disabled={isLoading}
              label="Continue with Google"
            />
          </>
        ) : (
          <form onSubmit={handleOtpSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="otp" className={`${labelClass} text-center block`}>
                Verification code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={formData.otp}
                onChange={(e) => handleInputChange("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${inputClass} text-center text-lg tracking-[0.4em]`}
                required
              />
              <div className="flex justify-between items-center mt-2 px-1">
                <span className="text-xs text-slate-400">Didn't receive it?</span>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={countdown > 0 || isLoading}
                  className="text-xs font-semibold text-[#0755E8] hover:text-[#0645C7] disabled:text-slate-400"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading || formData.otp.length !== 6} className={btnPrimary}>
              {isLoading ? "Verifying..." : "Verify email"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setError(""); }}
              className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              ← Use a different email
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold text-[#0755E8] hover:text-[#0645C7] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default RegisterForm;
