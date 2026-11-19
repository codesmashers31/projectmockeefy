import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, Calendar, Clock, Video, ShieldCheck, Zap, Sparkles, CreditCard, Smartphone, Landmark, Wallet } from "lucide-react";
import axios from '../lib/axios';
import { useAuth } from "../context/AuthContext";
import Navigation from "./Navigation";
import Footer from "./Footer";
import { ConfirmationLoadingModal } from "./ConfirmationLoadingModal";
import { showBookingSuccessAlert } from "../lib/bookingSuccessAlert";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fetchProfile } = useAuth();
  const bookingDetails = location.state?.bookingDetails;
  const upgradeType = location.state?.upgradeType;
  const searchParams = new URLSearchParams(location.search);
  const planQuery = searchParams.get('plan');

  const isSubscription = upgradeType === 'premium' || Boolean(planQuery);
  const planId = location.state?.planId || planQuery || (isSubscription ? 'pro-219' : null);
  const isUltimate = planId === 'ultimate-419' || planId === '419' || location.state?.price === 419 || location.state?.price === 2;

  const planCredits = isUltimate ? 6 : 3;
  const planPrice = isUltimate ? 2 : 1;
  const planName = isUltimate ? "Ultimate Career Plan" : "Pro Starter Plan";
  const planSubtitle = isUltimate
    ? "6 Free Interviews + 2 Certificates + HR Connect (30m) + Job Support"
    : "3 Free Interviews + 1 Certificate + Job Referral";

  const [isProcessing, setIsProcessing] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(false);
  const [appliedFreePromo, setAppliedFreePromo] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");
  const [transactionId, setTransactionId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isConfirmingMeeting, setIsConfirmingMeeting] = useState(false);

  // Unified Wallet State (Change 4)
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(false);

  useEffect(() => {
    if (user && !isSubscription) {
      axios.get("/api/wallet/balance")
        .then((res) => {
          if (res.data?.success) {
            setWalletBalance(res.data.availableBalance ?? res.data.balance ?? 0);
          }
        })
        .catch(() => setWalletBalance(0));
    }
  }, [user, isSubscription]);

  // Parse price from string (e.g. "₹500") if needed
  const parsePrice = (price: string | number) => {
    if (typeof price === "number") return price;
    if (typeof price === "string")
      return parseInt(price.replace(/[^0-9]/g, ""), 10) || 0;
    return 0;
  };

  // Base price dynamically resolved from plan or booking details
  const basePrice = isSubscription 
    ? (location.state?.price || planPrice)
    : (bookingDetails?.price ? parsePrice(bookingDetails.price) : 3);

  const gstAmount = 0; // Temporarily removed GST for testing
  const discountAmount = appliedFreePromo
    ? basePrice + gstAmount
    : appliedDiscount
      ? Math.floor(basePrice * 0.25)
      : 0;

  const orderSummary = {
    productName: isSubscription 
      ? planName 
      : (bookingDetails ? `${bookingDetails.category || bookingDetails.skill} Mock Interview` : "Premium Subscription"),
    plan: isSubscription
      ? planSubtitle
      : (bookingDetails ? `${bookingDetails.duration} Min Session with ${bookingDetails.expertName}` : "Annual Plan"),
    basePrice: basePrice,
    discount: discountAmount,
    gst: gstAmount,
    get total() {
      return Math.max(0, this.basePrice - this.discount + this.gst);
    },
  };

  // Wallet deductions & calculations
  const walletDeduction = useMemo(() => {
    if (!useWallet || isSubscription || appliedFreePromo || walletBalance <= 0) return 0;
    return Math.min(walletBalance, orderSummary.total);
  }, [useWallet, isSubscription, appliedFreePromo, walletBalance, orderSummary.total]);

  const payableViaGateway = useMemo(() => {
    return Math.max(0, orderSummary.total - walletDeduction);
  }, [orderSummary.total, walletDeduction]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getKolkataDateString = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(dateObj);
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const year = parts.find(p => p.type === 'year')?.value;
    return `${year}-${month}-${day}`;
  };

  const buildBookingPayload = () => {
    let startTimeISO = new Date().toISOString();
    let endTimeISO = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    if (bookingDetails?.date && bookingDetails?.slot?.time) {
      const kolkataDateStr = getKolkataDateString(bookingDetails.date);
      const timeParts = bookingDetails.slot.time.split(/\s*[-–]\s*/);
      const startStr = timeParts[0];
      const [time, period] = startStr.split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      const hh = hours.toString().padStart(2, '0');
      const mm = minutes.toString().padStart(2, '0');
      
      const startKolkata = new Date(`${kolkataDateStr}T${hh}:${mm}:00+05:30`);
      startTimeISO = startKolkata.toISOString();
      const duration = bookingDetails.duration || 60;
      endTimeISO = new Date(startKolkata.getTime() + duration * 60000).toISOString();
    }

    return {
      expertId: bookingDetails?.expertId,
      expertName: bookingDetails?.expertName,
      expertEmail: bookingDetails?.expertEmail,
      candidateId: user?.id || user?.userId || (user as any)?._id,
      candidateName: user?.name,
      candidateEmail: user?.email,
      candidatePhone: user?.personalInfo?.phone || user?.phone,
      startTime: startTimeISO,
      endTime: endTimeISO,
      price: orderSummary.total,
      topics: Array.isArray(bookingDetails?.topics) && bookingDetails.topics.length
        ? bookingDetails.topics
        : [bookingDetails?.skill || bookingDetails?.category || "General Mock Interview"],
      duration: bookingDetails?.duration || 30,
      skill: bookingDetails?.skill,
      category: bookingDetails?.category,
      level: bookingDetails?.level,
      notes: appliedFreePromo 
        ? `Booked with promo code: ${discountCode.trim().toUpperCase()}` 
        : useWallet
        ? `Booked with Mockeefy wallet balance (Deduction: ₹${walletDeduction})`
        : "Booked via Payment Page",
    };
  };

  const handlePaymentSuccess = async (response: any, reservationKey?: string | null) => {
    try {
      setIsProcessing(true);
      setIsConfirmingMeeting(true);

      const payload = isSubscription ? null : buildBookingPayload();

      const verifyResponse = await axios.post('/api/payment/verify-payment', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        paymentType: isSubscription ? 'subscription' : 'booking',
        planId: isSubscription ? (isUltimate ? 'ultimate-419' : 'pro-219') : undefined,
        freeInterviews: isSubscription ? planCredits : undefined,
        price: orderSummary.total,
        user: user,
        useWallet: Boolean(useWallet && walletDeduction > 0),
        walletDeduction: walletDeduction,
        reservationKey: reservationKey,
        bookingDetails: payload
      });

      const showScheduledSuccessAlert = () => {
        if (isSubscription) {
          Swal.fire({
            title: isUltimate ? "Welcome to Ultimate Career! 🎉" : "Welcome to Pro! 🎉",
            html: `
              <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #334155;">
                <p style="margin-bottom: 8px;">Your Mockeefy <strong>${planName}</strong> is now active.</p>
                <p style="color: #059669; font-weight: 600;">✓ You have ${planCredits} credits to book sessions for free!</p>
                <p style="color: #059669; font-weight: 500;">✓ ${isUltimate ? '2 Certificates free' : '1 Certificate free'}</p>
                <p style="color: #059669; font-weight: 500;">✓ Job referral assistance included</p>
                ${isUltimate ? '<p style="color: #059669; font-weight: 500;">✓ 30-min HR real connect & job support</p>' : ''}
              </div>
            `,
            icon: "success",
            confirmButtonColor: "#0755E8",
            confirmButtonText: "View My Bookings",
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              container: "swal-top-container",
            },
          }).then(() => {
            navigate("/my-sessions");
          });
        } else {
          const formattedDate = bookingDetails?.date
            ? new Date(bookingDetails.date).toLocaleDateString('en-US', {
                timeZone: 'Asia/Kolkata',
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : "Upcoming Date";
          const timeSlot = bookingDetails?.slot?.time || "Confirmed Slot";
          const mentorName = bookingDetails?.expertName || "Mentor";

          window.dispatchEvent(
            new CustomEvent("session-booked", {
              detail: { bookingDetails: payload }
            })
          );

          navigate("/my-sessions", { replace: true });

          showBookingSuccessAlert({
            title: "Meeting Scheduled",
            mentorName,
            dateStr: formattedDate,
            timeSlot,
            duration: bookingDetails?.duration,
            onConfirm: () => {
              navigate("/my-sessions");
            },
          });
        }
      };

      if (verifyResponse.data?.walletCredited) {
        setIsConfirmingMeeting(false);
        setIsProcessing(false);
        Swal.fire({
          title: verifyResponse.data.title || "Payment Added to Your Mockeefy Wallet",
          html: `
            <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
              <p style="margin-bottom: 12px;">${verifyResponse.data.message}</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 12px 0;">
                <p style="margin: 4px 0;"><strong>Credited Amount:</strong> ₹${verifyResponse.data.amountCredited}</p>
                <p style="margin: 4px 0;"><strong>Updated Wallet Balance:</strong> ₹${verifyResponse.data.updatedBalance}</p>
                <p style="margin: 4px 0; font-size: 11.5px; color: #64748b;"><strong>Wallet Transaction Ref:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${verifyResponse.data.walletTransactionRef || 'N/A'}</code></p>
              </div>
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "View Wallet",
          cancelButtonText: "Book Another Interview",
          confirmButtonColor: "#0755E8",
          cancelButtonColor: "#64748b"
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/wallet");
          } else {
            navigate("/find-mentor");
          }
        });
        return;
      }

      if (verifyResponse.data.success) {
        if (fetchProfile) await fetchProfile();
        setPaymentStatus("success");
        setTransactionId(response.razorpay_payment_id);
        showScheduledSuccessAlert();
      } else {
        throw new Error("Payment verification failed.");
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      setIsConfirmingMeeting(false);
      setPaymentStatus("error");
      setErrors({ submit: err.message || "Failed to process payment." });

      if (err?.response?.data?.walletCredited) {
        const d = err.response.data;
        Swal.fire({
          title: d.title || "Payment Added to Your Mockeefy Wallet",
          html: `
            <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #334155;">
              <p style="margin-bottom: 12px;">${d.message}</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 12px 0;">
                <p style="margin: 4px 0;"><strong>Credited Amount:</strong> ₹${d.amountCredited}</p>
                <p style="margin: 4px 0;"><strong>Updated Wallet Balance:</strong> ₹${d.updatedBalance}</p>
                <p style="margin: 4px 0; font-size: 11.5px; color: #64748b;"><strong>Wallet Transaction Ref:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${d.walletTransactionRef || 'N/A'}</code></p>
              </div>
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "View Wallet",
          cancelButtonText: "Book Another Interview",
          confirmButtonColor: "#0755E8",
          cancelButtonColor: "#64748b"
        }).then((result) => {
          if (result.isConfirmed) {
            navigate("/wallet");
          } else {
            navigate("/find-mentor");
          }
        });
        return;
      }

      Swal.fire({
        title: "Error",
        text: err.message || "Failed to process payment.",
        icon: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Full Wallet Booking (Scenario A)
  const handleConfirmWalletBooking = async () => {
    if (orderSummary.total <= 0) return;
    setIsProcessing(true);
    setIsConfirmingMeeting(true);
    try {
      const payload = buildBookingPayload();
      payload.price = orderSummary.total;
      const res = await axios.post("/api/payment/book-with-wallet", {
        bookingDetails: payload,
      });

      if (res.data?.success) {
        if (fetchProfile) await fetchProfile();
        setPaymentStatus("success");
        setTransactionId(res.data.sessionId || "WALLET-PAYMENT");

        const formattedDate = bookingDetails?.date
          ? new Date(bookingDetails.date).toLocaleDateString('en-US', {
              timeZone: 'Asia/Kolkata',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : "Upcoming Date";
        const timeSlot = bookingDetails?.slot?.time || "Confirmed Slot";
        const mentorName = bookingDetails?.expertName || "Mentor";

        window.dispatchEvent(
          new CustomEvent("session-booked", {
            detail: { bookingDetails: payload }
          })
        );

        navigate("/my-sessions", { replace: true });

        showBookingSuccessAlert({
          title: "Meeting Scheduled",
          mentorName,
          dateStr: formattedDate,
          timeSlot,
          duration: bookingDetails?.duration,
          onConfirm: () => {
            navigate("/my-sessions");
          },
        });
      } else {
        throw new Error(res.data?.message || "Failed to book session with wallet.");
      }
    } catch (err: any) {
      console.error("Wallet Booking Error:", err);
      setIsConfirmingMeeting(false);
      setPaymentStatus("error");
      const errMsg = err.response?.data?.message || err.message || "Failed to book session with wallet.";
      setErrors({ submit: errMsg });
      Swal.fire({ title: "Error", text: errMsg, icon: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Gateway Payment (Scenario B & C: Partial wallet or Standard checkout)
  const handleInitiatePayment = async () => {
    setIsProcessing(true);
    let reservationKey: string | null = null;
    try {
      const res = await loadRazorpayScript();
      if (!res) throw new Error("Razorpay SDK failed to load.");

      const payload = isSubscription ? null : buildBookingPayload();
      const amountToCharge = isSubscription ? orderSummary.total : payableViaGateway;

      const orderResponse = await axios.post('/api/payment/create-order', {
        amount: amountToCharge,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        planId: isSubscription ? (isUltimate ? 'ultimate-419' : 'pro-219') : undefined,
        useWallet: Boolean(useWallet && walletDeduction > 0),
        bookingDetails: payload
      });

      const { order, reservationKey: resKey } = orderResponse.data;
      if (resKey) reservationKey = resKey;

      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_SqNEn1MzouLlsg";

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency,
        name: "Mockeefy",
        description: orderSummary.productName,
        order_id: order.id,
        handler: (response: any) => handlePaymentSuccess(response, reservationKey),
        modal: {
          ondismiss: async () => {
            setIsProcessing(false);
            if (reservationKey || (useWallet && walletDeduction > 0)) {
              try {
                await axios.post('/api/wallet/cancel-reservation', {
                  reservationKey: reservationKey || order.id
                });
              } catch (e) {
                console.warn('Failed to cancel wallet reservation on modal dismiss', e);
              }
            }
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#0755E8",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async (failResponse: any) => {
        setIsProcessing(false);
        if (reservationKey || (useWallet && walletDeduction > 0)) {
          try {
            await axios.post('/api/wallet/cancel-reservation', {
              reservationKey: reservationKey || order.id
            });
          } catch (e) {
            console.warn('Failed to cancel wallet reservation on payment failure', e);
          }
        }
        Swal.fire({
          title: "Payment Failed",
          text: failResponse?.error?.description || "Payment could not be completed.",
          icon: "error"
        });
      });
      rzp.open();
    } catch (err: any) {
      console.error("Payment Initiation Error:", err);
      setPaymentStatus("error");
      setErrors({ submit: err.message || "Payment initiation failed." });
      Swal.fire({ title: "Error", text: err.message, icon: "error" });
      setIsProcessing(false);
    }
  };

  const handleApplyDiscount = () => {
    const code = discountCode.trim().toUpperCase();
    if (code === "FREEMU001") {
      setAppliedFreePromo(true);
      setAppliedDiscount(false);
      setUseWallet(false);
      Swal.fire({ title: "Applied!", text: "Free session — no payment required!", icon: "success", timer: 2000 });
    } else {
      Swal.fire({ title: "Invalid", text: "Code not found", icon: "error" });
    }
  };

  const handleConfirmFreeBooking = async () => {
    if (orderSummary.total > 0) return;
    setIsProcessing(true);
    try {
      if (isSubscription) {
        const res = await axios.post("/api/payment/create-free-subscription", {
          userId: user?.id || user?.userId || (user as any)?._id,
          planId: isUltimate ? 'ultimate-419' : 'pro-219',
          freeInterviews: planCredits
        });
        if (res.data?.success) {
          if (fetchProfile) await fetchProfile();
          setPaymentStatus("success");
          setTransactionId("FREE-PREMIUM-" + Date.now());
          Swal.fire({
            title: isUltimate ? "Welcome to Ultimate Career! 🎉" : "Welcome to Pro! 🎉",
            html: `
              <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #334155;">
                <p style="margin-bottom: 8px;">Your Mockeefy <strong>${planName}</strong> is now active.</p>
                <p style="color: #059669; font-weight: 600;">✓ You have ${planCredits} credits to book sessions for free!</p>
                <p style="color: #059669; font-weight: 500;">✓ ${isUltimate ? '2 Certificates free' : '1 Certificate free'}</p>
                <p style="color: #059669; font-weight: 500;">✓ Job referral assistance included</p>
                ${isUltimate ? '<p style="color: #059669; font-weight: 500;">✓ 30-min HR real connect & job support</p>' : ''}
              </div>
            `,
            icon: "success",
            confirmButtonColor: "#0755E8",
            confirmButtonText: "View My Bookings",
            allowOutsideClick: false,
            allowEscapeKey: false,
            customClass: {
              container: "swal-top-container",
            },
          }).then(() => {
            navigate("/my-sessions");
          });
        } else {
          throw new Error(res.data?.message || "Free subscription failed");
        }
      } else {
        const payload = buildBookingPayload();
        const res = await axios.post("/api/payment/create-free-booking", {
          bookingDetails: payload,
        });
        if (res.data?.success) {
          setPaymentStatus("success");
          setTransactionId(res.data.sessionId || "FREE");
          const formattedDate = bookingDetails?.date
            ? new Date(bookingDetails.date).toLocaleDateString('en-US', {
                timeZone: 'Asia/Kolkata',
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : "Upcoming Date";
          const timeSlot = bookingDetails?.slot?.time || "Confirmed Slot";
          const mentorName = bookingDetails?.expertName || "Mentor";

          window.dispatchEvent(
            new CustomEvent("session-booked", {
              detail: { bookingDetails: payload }
            })
          );

          navigate("/my-sessions", { replace: true });

          showBookingSuccessAlert({
            title: "Meeting Scheduled",
            mentorName,
            dateStr: formattedDate,
            timeSlot,
            duration: bookingDetails?.duration,
            onConfirm: () => {
              navigate("/my-sessions");
            },
          });
        } else {
          throw new Error(res.data?.message || "Free booking failed");
        }
      }
    } catch (err: any) {
      setPaymentStatus("error");
      const errorMessage = err.response?.data?.message || err.message || "Failed to confirm free transaction.";
      setErrors({ submit: errorMessage });
      Swal.fire({ title: "Error", text: errorMessage, icon: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isConfirmingMeeting) {
    return (
      <ConfirmationLoadingModal
        expertName={bookingDetails?.expertName || "Mentor"}
        isConfirming={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <div className="sticky top-0 z-50">
        <Navigation />
      </div>

      <div className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] hover:bg-[#D5E5FF] active:bg-[#C2DBFF] text-[#0755E8] border border-[#93B8FF]/80 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Secure Checkout</span>
            </div>
          </header>

          {paymentStatus === "error" && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center text-red-700">
              <ShieldCheck className="w-5 h-5 mr-3 text-red-500" />
              <span className="font-medium text-sm">Payment failed: {Object.values(errors)[0] || "Please check your payment details"}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Payment CTA Section */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Booking</h2>
                <p className="text-gray-500 mb-6">One-click secure payment. Use your Mockeefy wallet balance or pay with UPI, Cards, or Netbanking.</p>

                {/* Unified Wallet Balance Section (Change 4) */}
                {user && !isSubscription && (
                  <div className="mb-6 p-4 bg-blue-50/70 border border-blue-200/90 rounded-2xl space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useWallet}
                          disabled={walletBalance <= 0 || appliedFreePromo}
                          onChange={(e) => setUseWallet(e.target.checked)}
                          className="w-4 h-4 rounded text-[#0755E8] focus:ring-[#0755E8] cursor-pointer"
                        />
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Wallet className="w-4 h-4 text-[#0755E8]" />
                          Use Mockeefy Wallet Balance
                        </span>
                      </label>
                      <span className="text-xs font-extrabold text-[#0755E8] bg-white px-2.5 py-1 rounded-full border border-blue-200 shadow-2xs">
                        Available: ₹{walletBalance}
                      </span>
                    </div>

                    {walletBalance <= 0 ? (
                      <p className="text-[11px] text-slate-500 pt-0.5">
                        You have ₹0 in your wallet balance. Expert earnings will be credited here and can be used for future bookings.
                      </p>
                    ) : useWallet ? (
                      <div className="pt-2.5 border-t border-blue-200/60 text-xs space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span>Interview Price:</span>
                          <span className="font-semibold text-slate-800">₹{orderSummary.total}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>Paid from Wallet:</span>
                          <span>-₹{walletDeduction}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-blue-200/50">
                          <span>Payable via Razorpay:</span>
                          <span className="text-sm text-[#0755E8]">₹{payableViaGateway}</span>
                        </div>
                        {walletBalance >= orderSummary.total ? (
                          <p className="text-[11px] text-emerald-700 font-medium pt-0.5">
                            ✓ Full amount covered by wallet. Instant booking without payment gateway.
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 pt-0.5">
                            Remaining ₹{payableViaGateway} will be charged through Razorpay checkout.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 pt-0.5">
                        Check the box above to apply your available ₹{walletBalance} towards this session.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {orderSummary.total === 0 ? (
                    <button
                      onClick={handleConfirmFreeBooking}
                      disabled={isProcessing}
                      className="w-full bg-green-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-green-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                    >
                      {isProcessing ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2 fill-current" />
                          Confirm free booking
                        </>
                      )}
                    </button>
                  ) : useWallet && walletBalance >= orderSummary.total ? (
                    <button
                      onClick={handleConfirmWalletBooking}
                      disabled={isProcessing}
                      className="w-full bg-[#0755E8] text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                    >
                      {isProcessing ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Wallet className="w-5 h-5 mr-2 stroke-[2.5]" />
                          Confirm with Wallet — ₹{orderSummary.total}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleInitiatePayment}
                      disabled={isProcessing}
                      className="w-full bg-[#004fcb] text-white py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                    >
                      {isProcessing ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2 fill-current" />
                          {useWallet && walletDeduction > 0
                            ? `Proceed to Pay ₹${payableViaGateway} (₹${walletDeduction} from Wallet)`
                            : `Proceed to Pay ₹${orderSummary.total}`}
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex justify-center items-center space-x-6 pt-6 border-t border-gray-50 text-gray-400">
                    <div className="flex flex-col items-center gap-1.5 opacity-70 hover:opacity-100 hover:text-[#004fcb] transition-all cursor-default">
                      <Smartphone className="w-5 h-5 shrink-0" strokeWidth={2} />
                      <span className="text-[9px] font-extrabold uppercase tracking-widest">UPI</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 opacity-70 hover:opacity-100 hover:text-[#004fcb] transition-all cursor-default">
                      <CreditCard className="w-5 h-5 shrink-0" strokeWidth={2} />
                      <span className="text-[9px] font-extrabold uppercase tracking-widest">Cards</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 opacity-70 hover:opacity-100 hover:text-[#004fcb] transition-all cursor-default">
                      <Landmark className="w-5 h-5 shrink-0" strokeWidth={2} />
                      <span className="text-[9px] font-extrabold uppercase tracking-widest">Banking</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo Section */}
              <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
                <label className="block text-sm font-semibold text-blue-900 mb-3">Have a discount code?</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                  />
                  <button
                    onClick={handleApplyDiscount}
                    className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {appliedFreePromo && <p className="text-green-600 text-sm font-medium mt-2">✓ Free session — no payment required!</p>}
                {appliedDiscount && !appliedFreePromo && <p className="text-green-600 text-sm font-medium mt-2">✓ 25% discount applied!</p>}
              </div>
            </div>

            {/* Detailed Summary Section */}
            <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-900/5 border border-gray-100 h-fit sticky top-8">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                {isSubscription ? "Plan Details" : "Booking Details"}
              </h3>
              
              {isSubscription ? (
                <div className="space-y-4 mb-8">
                  <div className="flex flex-col p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl relative overflow-hidden">
                    <Sparkles className="w-24 h-24 text-blue-500/10 absolute -right-6 -bottom-6" />
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <div className="w-10 h-10 bg-[#004fcb] rounded-xl flex items-center justify-center shadow-sm text-white">
                        {isUltimate ? <Sparkles className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-gray-900 font-bold leading-tight">{planName}</h4>
                        <p className="text-[10px] uppercase font-bold text-[#004fcb] tracking-wider">₹{orderSummary.total} / month</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mb-4 relative z-10">
                      {isUltimate 
                        ? "Complete career booster with 6 mock interviews, 2 certificates, HR real connect, and job placement support."
                        : "Accelerate your interview preparation with 3 free mentor bookings, certificate, and job referrals."}
                    </p>
                    <ul className="space-y-2.5 relative z-10">
                      <li className="flex items-start text-xs text-gray-700 font-medium">
                        <CheckCircle className="w-4 h-4 text-[#004fcb] mr-2 shrink-0 mt-0.5" /> 
                        <span><strong>{planCredits} Free Mock Interviews</strong> — Book with any verified mentor.</span>
                      </li>
                      <li className="flex items-start text-xs text-gray-700 font-medium">
                        <CheckCircle className="w-4 h-4 text-[#004fcb] mr-2 shrink-0 mt-0.5" /> 
                        <span><strong>{isUltimate ? "2 Free Certificates" : "1 Free Certificate"}</strong> — Showcase your interview credentials.</span>
                      </li>
                      <li className="flex items-start text-xs text-gray-700 font-medium">
                        <CheckCircle className="w-4 h-4 text-[#004fcb] mr-2 shrink-0 mt-0.5" /> 
                        <span><strong>Job Referral Assistance</strong> — Direct visibility with hiring partners.</span>
                      </li>
                      {isUltimate && (
                        <>
                          <li className="flex items-start text-xs text-gray-700 font-medium">
                            <CheckCircle className="w-4 h-4 text-[#004fcb] mr-2 shrink-0 mt-0.5" /> 
                            <span><strong>30-Min HR Real Connect</strong> — 1-on-1 strategy with an active hiring recruiter.</span>
                          </li>
                          <li className="flex items-start text-xs text-gray-700 font-medium">
                            <CheckCircle className="w-4 h-4 text-[#004fcb] mr-2 shrink-0 mt-0.5" /> 
                            <span><strong>Dedicated Job Support</strong> — Resume review & placement guidance.</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-center justify-center text-indigo-650 shrink-0">
                        <Video size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{orderSummary.productName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">with {bookingDetails?.expertName || "Expert Session"}</p>
                      </div>
                    </div>
                    
                    {/* Badges for booking details */}
                    <div className="flex flex-wrap gap-1.5 justify-end max-w-[280px]">
                      {bookingDetails?.category && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100/60 text-[9px] font-bold text-blue-650 tracking-wide inline-flex items-center gap-1 leading-normal shadow-sm shadow-blue-100/10">
                          <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                          {bookingDetails.category}
                        </span>
                      )}
                      {bookingDetails?.skill && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100/60 text-[9px] font-bold text-emerald-650 tracking-wide inline-flex items-center gap-1 leading-normal shadow-sm shadow-emerald-100/10">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                          {bookingDetails.skill}
                        </span>
                      )}
                      {bookingDetails?.duration && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200/60 text-[9px] font-bold text-slate-600 tracking-wide inline-flex items-center gap-1 leading-normal shadow-sm shadow-slate-100/10">
                          <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                          {bookingDetails.duration} Min
                        </span>
                      )}
                      {bookingDetails?.level && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/60 text-[9px] font-bold text-indigo-650 tracking-wide inline-flex items-center gap-1 leading-normal shadow-sm shadow-indigo-100/10">
                          <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                          {bookingDetails.level}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Calendar size={13} className="text-indigo-650" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">Date</p>
                      </div>
                      <p className="text-xs font-black text-slate-800 tracking-tight mt-1.5">
                        {bookingDetails?.date 
                          ? new Date(bookingDetails.date).toLocaleDateString('en-US', {
                              timeZone: 'Asia/Kolkata',
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : "TBD"}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Clock size={13} className="text-indigo-650" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">Time Slot</p>
                      </div>
                      <p className="text-xs font-black text-slate-800 tracking-tight mt-1.5">
                        {bookingDetails?.slot?.time || "TBD"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-gray-100">
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Base Amount</span>
                  <span>₹{orderSummary.basePrice}</span>
                </div>
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>GST (18%)</span>
                  <span>₹{orderSummary.gst}</span>
                </div>
                {(appliedDiscount || appliedFreePromo) && (
                  <div className="flex justify-between text-green-600 text-sm font-medium">
                    <span>{appliedFreePromo ? "Free promo" : "Discount"}</span>
                    <span>-₹{orderSummary.discount}</span>
                  </div>
                )}
                {useWallet && walletDeduction > 0 && (
                  <div className="flex justify-between text-emerald-600 text-sm font-semibold">
                    <span>Paid from Wallet</span>
                    <span>-₹{walletDeduction}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-900 text-xl font-black pt-4">
                  <span>{useWallet && walletDeduction > 0 ? "Final Payable" : "Total"}</span>
                  <span>₹{useWallet && walletDeduction > 0 ? payableViaGateway : orderSummary.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">
              {isSubscription ? `Welcome to ${planName}! 🎉` : "Booking Success!"}
            </h2>
            <p className="text-gray-500 mb-2 leading-relaxed">
              {isSubscription 
                ? `Your Mockeefy ${planName} is now active. You have ${planCredits} credits to book sessions for free!` 
                : "Your session has been successfully scheduled. Check your email for details."}
            </p>
            {transactionId && (
              <p className="text-xs text-gray-400 mb-8 font-mono">
                Transaction ID: {transactionId}
              </p>
            )}
            <div className="w-full space-y-3">
              {!isSubscription && (
                <button
                  onClick={() => navigate("/my-sessions")}
                  className="w-full bg-[#004fcb] text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Go to My Sessions
                </button>
              )}
              <button
                onClick={() => navigate(isSubscription ? "/dashboard" : "/")}
                className="w-full bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 hover:text-rose-900 border border-rose-200/90 py-3.5 rounded-2xl font-bold transition-all shadow-2xs cursor-pointer"
              >
                {isSubscription ? "Go to Dashboard" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default PaymentPage;
