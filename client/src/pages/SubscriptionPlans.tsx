import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Zap, Sparkles, Award, Briefcase, UserCheck, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import Navigation from "../components/Navigation";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import axios from "../lib/axios";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Plan {
  id: "free" | "pro-219" | "ultimate-419";
  name: string;
  tagline: string;
  price: string;
  priceNumber: number;
  period: string;
  badge?: string;
  icon: any;
  description: string;
  freeInterviews: number;
  features: string[];
  highlighted: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Starter",
    price: "₹0",
    priceNumber: 0,
    period: "forever",
    icon: Zap,
    description: "Explore the platform & prepare with community guides.",
    freeInterviews: 0,
    features: [
      "Full platform & mock test access",
      "Browse verified industry experts",
      "Basic interview prep materials",
      "Standard performance evaluation",
      "Community & email support",
    ],
    highlighted: false,
  },
  {
    id: "pro-219",
    name: "Pro",
    tagline: "Popular",
    price: "₹1",
    priceNumber: 1,
    period: "/ month",
    icon: Crown,
    description: "Ideal for candidates targeting immediate mock practice.",
    freeInterviews: 3,
    features: [
      "3 Free interview bookings",
      "1 Certificate free",
      "Job referral assistance",
      "Detailed mentor scorecards",
      "Priority expert matching",
      "Priority email support",
    ],
    highlighted: false,
  },
  {
    id: "ultimate-419",
    name: "Ultimate Career",
    tagline: "Best Value",
    price: "₹2",
    priceNumber: 2,
    period: "/ month",
    badge: "All-in-One",
    icon: Sparkles,
    description: "Complete preparation with HR connect & placement support.",
    freeInterviews: 6,
    features: [
      "6 Free mock interviews",
      "2 Certificates free",
      "Job referral guaranteed access",
      "HR real connect (30 min)",
      "Dedicated job support",
      "Full analytics & scorecards",
      "24/7 Priority support",
    ],
    highlighted: true,
  },
];

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuth();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // Determine current active plan
  const currentPlanId: "free" | "pro-219" | "ultimate-419" = !user
    ? "free"
    : user.isPremium
    ? user.premiumPlan === "ultimate-419"
      ? "ultimate-419"
      : "pro-219"
    : "free";

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan: Plan) => {
    // If clicking Free plan
    if (plan.id === "free") {
      navigate("/browse-experts");
      return;
    }

    // Require authentication
    if (!user) {
      Swal.fire({
        title: "Sign in required",
        text: "Please sign in or create an account to activate your subscription.",
        icon: "info",
        showCancelButton: true,
        confirmButtonColor: "#0755E8",
        confirmButtonText: "Sign in now",
      }).then((res) => {
        if (res.isConfirmed) {
          navigate("/signin?redirect=/plans");
        }
      });
      return;
    }

    // If clicking current plan
    if (plan.id === currentPlanId) {
      navigate("/browse-experts");
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay checkout failed to load. Please check your internet connection.");
      }

      // 1. Create order on backend
      const orderRes = await axios.post("/api/payment/create-order", {
        amount: plan.priceNumber,
        currency: "INR",
        receipt: `sub_${plan.id}_${Date.now()}`,
      });

      const { order } = orderRes.data;
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_SqNEn1MzouLlsg";

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "Mockeefy",
        description: `${plan.name} Subscription (₹${plan.priceNumber})`,
        order_id: order.id,
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: user.phone || user.personalInfo?.phone || "",
        },
        theme: {
          color: "#0755E8",
        },
        handler: async (response: any) => {
          try {
            setProcessingPlanId(plan.id);

            // 3. Verify Payment on Backend
            const verifyRes = await axios.post("/api/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentType: "subscription",
              planId: plan.id,
              freeInterviews: plan.freeInterviews,
              price: plan.priceNumber,
              user: user,
            });

            if (verifyRes.data.success) {
              // 4. Refresh auth state so Navbar and Page update immediately
              if (fetchProfile) {
                await fetchProfile();
              }

              Swal.fire({
                title: `Welcome to ${plan.name}! 🎉`,
                html: `
                  <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #334155;">
                    <p style="margin-bottom: 8px;">Your <strong>${plan.name}</strong> is now officially active!</p>
                    <p style="color: #059669; font-weight: 700;">✓ ${plan.freeInterviews} Free mock interview credits added to your account</p>
                    <p style="color: #059669; font-weight: 500;">✓ Verified certification access granted</p>
                    <p style="color: #059669; font-weight: 500;">✓ Job referral pipeline enabled</p>
                    ${plan.id === "ultimate-419" ? '<p style="color: #059669; font-weight: 500;">✓ 30-min HR real connect & job support unlocked</p>' : ''}
                  </div>
                `,
                icon: "success",
                confirmButtonColor: "#0755E8",
                confirmButtonText: "Explore Experts & Book Now",
              }).then(() => {
                navigate("/browse-experts");
              });
            } else {
              throw new Error("Payment verification failed on the server.");
            }
          } catch (verifyError: any) {
            console.error("Payment Verification Error:", verifyError);
            Swal.fire({
              title: "Payment Error",
              text: verifyError.response?.data?.message || verifyError.message || "Could not verify payment.",
              icon: "error",
            });
          } finally {
            setProcessingPlanId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPlanId(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setProcessingPlanId(null);
        Swal.fire({
          title: "Payment Failed",
          text: resp.error?.description || "Payment could not be completed.",
          icon: "error",
        });
      });
      rzp.open();
    } catch (err: any) {
      console.error("Razorpay Checkout Error:", err);
      setProcessingPlanId(null);
      Swal.fire({
        title: "Checkout Error",
        text: err.response?.data?.message || err.message || "Failed to start checkout.",
        icon: "error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <div className="sticky top-0 z-50">
        <Navigation />
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Active Membership Banner (if user is premium) */}
        {user?.isPremium && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#0755E8] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Crown size={22} className="fill-current" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#0755E8] bg-blue-100/80 px-2 py-0.5 rounded-md">
                    Current Active Plan
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  You are subscribed to the{" "}
                  <span className="text-[#0755E8]">
                    {currentPlanId === "ultimate-419" ? "Ultimate Career Plan" : "Pro Plan"}
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="text-right hidden md:block">
                <p className="text-[10px] uppercase font-bold text-slate-400">Mock Credits</p>
                <p className="text-sm font-extrabold text-[#0755E8]">
                  {user.freeInterviewsCount || 0} Free Left
                </p>
              </div>
              <Button
                onClick={() => navigate("/browse-experts")}
                className="bg-[#0755E8] hover:bg-[#0645C7] text-white text-xs font-bold h-9 px-4 rounded-xl shadow-xs cursor-pointer"
              >
                Book with Free Credit
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0755E8] text-xs font-bold uppercase tracking-wider mb-2.5">
            Transparent Pricing
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Flexible plans for every career stage
          </h1>
          <p className="mt-2 text-slate-500 text-xs sm:text-sm">
            Instant Razorpay activation. Unlock mock interviews, verified certificates, and recruiter connect.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlanId;
            const isProcessing = processingPlanId === plan.id;
            const isUltimate = plan.id === "ultimate-419";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl bg-white p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 ${
                  isCurrent
                    ? "border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                    : plan.highlighted
                    ? "border-2 border-[#0755E8] shadow-lg shadow-blue-500/10 ring-1 ring-[#0755E8]/20"
                    : "border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow"
                }`}
              >
                {/* Status Badges */}
                {isCurrent ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Current Plan
                  </span>
                ) : plan.tagline ? (
                  <span
                    className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      plan.highlighted
                        ? "bg-[#0755E8] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 border border-slate-200/60"
                    }`}
                  >
                    {plan.tagline}
                  </span>
                ) : null}

                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? "bg-emerald-100 text-emerald-700"
                            : plan.highlighted
                            ? "bg-[#0755E8] text-white"
                            : "bg-blue-50 text-[#0755E8]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <h2 className="text-base font-bold text-slate-900">{plan.name}</h2>
                    </div>
                    {plan.badge && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug mb-3">
                    {plan.description}
                  </p>

                  {/* Price Row */}
                  <div className="flex items-baseline gap-1 py-3 my-2 border-y border-slate-100">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-slate-400 text-xs font-medium">{plan.period}</span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2 mt-3 mb-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 leading-tight">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isCurrent
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-emerald-50 text-emerald-600"
                          }`}
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA with Razorpay */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isProcessing}
                    className={`w-full h-10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 shadow-none"
                        : isUltimate
                        ? "bg-[#0755E8] hover:bg-[#0645C7] text-white shadow-sm shadow-blue-500/25 active:scale-[0.98]"
                        : plan.id === "free"
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-none"
                        : "bg-blue-50 hover:bg-[#0755E8] text-[#0755E8] hover:text-white border border-blue-200 hover:border-transparent active:scale-[0.98]"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Connecting Razorpay...</span>
                      </>
                    ) : isCurrent ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Current Active Plan</span>
                      </>
                    ) : plan.id === "free" ? (
                      <span>Free Platform Tier</span>
                    ) : (
                      <>
                        <span>Pay {plan.price} & Activate</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Trust Bar */}
        <div className="mt-10 bg-white rounded-xl border border-slate-200/80 px-4 py-3.5 shadow-2xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Award className="w-4 h-4 text-[#0755E8] shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Verified Certifications</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Briefcase className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Job Referrals</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">30m HR Real Connect</span>
            </div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Dedicated Job Support</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
