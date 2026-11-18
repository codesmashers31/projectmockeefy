import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Search,
  Users,
  Award,
  Calendar,
  Video,
  Send,
  CheckCircle2,
  ChevronDown,
  Mail,
  ArrowRight,
  X,
  MessageSquare,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "../lib/axios";
import { toast } from "sonner";

interface FAQ {
  id: string;
  category: "all" | "interviews" | "certificates" | "wallet" | "tech";
  question: string;
  answer: string;
  actionText?: string;
  actionUrl?: string;
}

const FAQS: FAQ[] = [
  {
    id: "faq-1",
    category: "interviews",
    question: "What if the interviewer didn't join or was late?",
    answer:
      "Please wait up to 10 minutes in the meeting. If your interviewer does not join within 10 minutes, the session is automatically marked as an Expert No-Show and your money is 100% refunded to your wallet immediately so you can book another expert.",
    actionText: "View My Sessions & Bookings →",
    actionUrl: "/my-sessions",
  },
  {
    id: "faq-2",
    category: "certificates",
    question: "Why didn't I get a certificate after my interview?",
    answer:
      "Mockeefy certificates are awarded for completing 3 mock interviews in the same category (for example, 3 in Full Stack or 3 in AI). One completed interview counts as 1 of 3 towards your official certificate. Once you finish all 3, your certificate is generated automatically!",
    actionText: "Check Certificate Progress →",
    actionUrl: "/certificates",
  },
  {
    id: "faq-3",
    category: "interviews",
    question: "What if I have a conflict or problem with the interviewer?",
    answer:
      "If the interviewer was unprofessional, ended the session early, or did not conduct a proper interview, please send us a quick message using the form below. We will review the session and issue a full refund or a free re-booking.",
  },
  {
    id: "faq-4",
    category: "wallet",
    question: "How do refunds and wallet balance work?",
    answer:
      "Whenever a session is cancelled or an expert misses an appointment, the full amount is added to your Mockeefy Wallet in seconds. You can use your wallet balance to book any interview expert anytime, or withdraw it to your bank account.",
    actionText: "View Wallet Balance →",
    actionUrl: "/wallet",
  },
  {
    id: "faq-5",
    category: "interviews",
    question: "How do I reschedule or cancel my interview?",
    answer:
      "Go to 'My Sessions', find your upcoming booking, and click 'Reschedule' or 'Cancel'. You can reschedule or cancel for free anytime up to 4 hours before your session start time.",
    actionText: "Manage Bookings →",
    actionUrl: "/my-sessions",
  },
  {
    id: "faq-6",
    category: "tech",
    question: "Camera or microphone not working in the meeting?",
    answer:
      "Click the lock/padlock icon on the left side of your browser's address bar and make sure Camera and Microphone permissions are set to 'Allow'. Also make sure Zoom, Teams, or other video apps are closed, then refresh the page.",
  },
  {
    id: "faq-7",
    category: "certificates",
    question: "How do I download my certificate or share it on LinkedIn?",
    answer:
      "Go to the Certificates page, click on your certificate, and click 'Download PDF' to save your official certificate, or copy your credential link to share on LinkedIn or with recruiters.",
    actionText: "Go to Certificates →",
    actionUrl: "/certificates",
  },
];

export default function HelpSupportPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openFaq, setOpenFaq] = useState<string | null>("faq-1");

  // Simple Contact Form State
  const [topic, setTopic] = useState("Interviewer Issue or No-Show");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return FAQS.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeCategory]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please enter a short message describing your issue.");
      return;
    }

    const emailToSend = user?.email || guestEmail.trim();
    if (!emailToSend) {
      toast.error("Please provide your email address so our support team can reply to you.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/support/ticket", {
        topic,
        sessionId: sessionId.trim(),
        message: message.trim(),
        email: emailToSend,
        name: user?.name,
      });

      if (res.data?.success) {
        const ticketId = res.data?.data?.ticketId;
        setSubmittedTicketId(ticketId);
        setIsSent(true);
        toast.success(`Ticket #${ticketId || ""} sent to Admin Support!`);
        setMessage("");
        setSessionId("");
      } else {
        toast.error(res.data?.message || "Failed to submit support ticket.");
      }
    } catch (err: any) {
      console.error("Support ticket error:", err);
      toast.error(
        err.response?.data?.message || "Failed to connect to support server. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickTopic = (newTopic: string, targetFaqId?: string) => {
    setTopic(newTopic);
    if (targetFaqId) {
      setOpenFaq(targetFaqId);
    }
    const formElement = document.getElementById("contact-support-box");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 font-sans text-left">
      {/* ========================================================= */}
      {/* 1. FRIENDLY HEADER & SEARCH                               */}
      {/* ========================================================= */}
      <section className="bg-gradient-to-br from-[#EAF2FF] via-white to-blue-50/50 border border-blue-200/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0755E8] text-white flex items-center justify-center shadow-sm shrink-0">
            <HelpCircle size={24} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              How can we help you?
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Quick answers and easy support for your mock interviews and certificates.
            </p>
          </div>
        </div>

        {/* Clean, Simple Search Input */}
        <div className="relative max-w-xl pt-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type your question (e.g. interviewer late, certificate, refund)..."
            className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0755E8] focus:ring-2 focus:ring-[#0755E8]/10 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. FOUR EASY 1-CLICK RESOLUTION CARDS                     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card 1: Interviewer Issue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2.5 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center">
              <Users size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Interviewer didn't join or left early?
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              If an interviewer is 10 minutes late, you automatically receive a 100% full refund to your wallet to re-book anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleQuickTopic("Interviewer Issue or No-Show", "faq-1")}
            className="text-xs font-bold text-[#0755E8] hover:underline flex items-center gap-1 pt-1 text-left cursor-pointer"
          >
            <span>Report interviewer &amp; get help</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Card 2: Certificate Status */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2.5 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0755E8] border border-blue-200/60 flex items-center justify-center">
              <Award size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Where is my certificate?
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              You receive an official certificate after completing 3 mock interviews in the same category.
            </p>
          </div>
          <Link
            to="/certificates"
            className="text-xs font-bold text-[#0755E8] hover:underline flex items-center gap-1 pt-1"
          >
            <span>Check certificate progress</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Card 3: Reschedule or Cancel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2.5 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Need to reschedule or cancel?
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              You can reschedule or cancel your session for free up to 4 hours before your start time.
            </p>
          </div>
          <Link
            to="/my-sessions"
            className="text-xs font-bold text-[#0755E8] hover:underline flex items-center gap-1 pt-1"
          >
            <span>Go to My Sessions</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Card 4: Audio / Video Help */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2.5 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center">
              <Video size={16} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Camera or mic not working?
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click the lock icon in your address bar and make sure Camera and Mic are set to 'Allow'.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpenFaq("faq-6")}
            className="text-xs font-bold text-[#0755E8] hover:underline flex items-center gap-1 pt-1 text-left cursor-pointer"
          >
            <span>See quick camera tips</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SIMPLE, EXPANDABLE QUESTIONS                           */}
      {/* ========================================================= */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            Frequently Asked Questions
          </h2>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "all", label: "All" },
              { id: "interviews", label: "Interviews" },
              { id: "certificates", label: "Certificates" },
              { id: "wallet", label: "Refunds" },
              { id: "tech", label: "Camera/Mic" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-[#0755E8] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQs list */}
        {filteredFaqs.length > 0 ? (
          <div className="space-y-2">
            {filteredFaqs.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`border rounded-2xl transition-all overflow-hidden ${
                    isOpen
                      ? "border-blue-200 bg-blue-50/20"
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {faq.question}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-[#0755E8]" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100/80 space-y-2 animate-in fade-in duration-150">
                      <p>{faq.answer}</p>
                      {faq.actionUrl && (
                        <Link
                          to={faq.actionUrl}
                          className="inline-block font-bold text-[#0755E8] hover:underline"
                        >
                          {faq.actionText}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 space-y-1">
            <p className="text-xs font-bold text-slate-700">No matching answers found</p>
            <p className="text-xs text-slate-400">
              Send us a message below and we will help you immediately!
            </p>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 4. SIMPLE "SEND US A MESSAGE" BOX (DIRECT & EASY)         */}
      {/* ========================================================= */}
      <section
        id="contact-support-box"
        className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0755E8] flex items-center justify-center shrink-0">
            <MessageSquare size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Still need help? Send us a message
            </h2>
            <p className="text-xs text-slate-500">
              Tell us what happened and our support team will help you within 2 hours.
            </p>
          </div>
        </div>

        {isSent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 animate-in fade-in duration-200">
            <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-emerald-950">
              Message Delivered to Admin!
            </h3>
            {submittedTicketId && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-emerald-800 shadow-2xs">
                <Ticket size={14} className="text-emerald-600" />
                Ticket #{submittedTicketId}
              </div>
            )}
            <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
              Our support team has logged your ticket and is actively reviewing it. We will reach out to{" "}
              <strong>{user?.email || guestEmail || "your email"}</strong> shortly.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSent(false);
                  setSubmittedTicketId(null);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
              >
                Send another message
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Topic */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">What is your issue about?</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0755E8] focus:bg-white"
                >
                  <option value="Interviewer Issue or No-Show">Interviewer Issue or No-Show</option>
                  <option value="Certificate Did Not Come">Certificate Did Not Come</option>
                  <option value="Wallet or Refund Issue">Wallet or Refund Issue</option>
                  <option value="Audio or Video Problem">Audio or Video Problem</option>
                  <option value="Other Question">Other Question</option>
                </select>
              </div>

              {/* Session ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Session ID <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Paste session ID if applicable"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0755E8] focus:bg-white"
                />
              </div>
            </div>

            {/* If user is not logged in, ask for their email */}
            {!user && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Your Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email to receive our reply"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0755E8] focus:bg-white"
                />
              </div>
            )}

            {/* Message */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">How can we help? *</label>
              <textarea
                required
                rows={3}
                placeholder="Explain what happened briefly (e.g. interviewer didn't show up, or I completed 3 sessions and need my certificate)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0755E8] focus:bg-white leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-400">
                Replying to: <span className="font-semibold text-slate-600">{user?.email || guestEmail || "your email"}</span>
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#0755E8] hover:bg-[#0645C7] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ========================================================= */}
      {/* 5. QUICK DIRECT EMAIL CONTACT                             */}
      {/* ========================================================= */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-2.5">
          <Mail size={16} className="text-[#0755E8]" />
          <span className="text-xs text-slate-600">
            Prefer direct email? Reach our support team anytime at{" "}
            <a
              href="mailto:support@mockeefy.com"
              className="font-bold text-[#0755E8] hover:underline"
            >
              support@mockeefy.com
            </a>
          </span>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-500">
          Response time: &lt; 2 hrs
        </span>
      </div>
    </div>
  );
}
