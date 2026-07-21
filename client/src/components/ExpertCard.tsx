import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MentorProfile } from "./MentorJobCard";

const ACCENT = "#2F5FFF";

interface ExpertCardProps {
    mentor: MentorProfile;
}

/**
 * Expert card — implements the Claude Design "ExpertCard.dc.html" handoff,
 * wired to live MentorProfile data (from /api/expert/verified).
 */
const ExpertCard: React.FC<ExpertCardProps> = ({ mentor }) => {
    const navigate = useNavigate();

    const [isSaved, setIsSaved] = useState(() => {
        try {
            const saved = localStorage.getItem("savedExperts");
            if (saved) {
                return (JSON.parse(saved) as MentorProfile[]).some(
                    (m) => m.expertID === mentor.expertID
                );
            }
        } catch { /* ignore */ }
        return false;
    });

    const toggleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const saved = localStorage.getItem("savedExperts");
            let parsed: MentorProfile[] = saved ? JSON.parse(saved) : [];
            if (isSaved) {
                parsed = parsed.filter((m) => m.expertID !== mentor.expertID);
            } else {
                parsed.push(mentor);
            }
            localStorage.setItem("savedExperts", JSON.stringify(parsed));
            setIsSaved(!isSaved);
        } catch { /* ignore */ }
    };

    const goToBooking = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        navigate(`/book-session`, {
            state: { expertId: mentor.expertID, profile: { ...mentor } },
        });
    };

    // ---- Derived display values ----
    const initials = (mentor.name || "")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const availableToday = (mentor.activeTime || "").toLowerCase().includes("today");
    const topRated = (mentor.rating || 0) >= 4.8 && (mentor.reviews || 0) > 0;
    const companyInitial = (mentor.company || "?")[0];

    const yearsExp = (() => {
        const m = (mentor.experience || "").match(/\d+/);
        return m ? `${m[0]}+` : mentor.experience || "—";
    })();

    const price = mentor.minPrice ?? (parseInt((mentor.price || "0").toString().replace(/[^\d]/g, ""), 10) || 0);
    const oldPrice = mentor.minOriginalPrice && mentor.minOriginalPrice > price ? mentor.minOriginalPrice : null;
    const offPct = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;

    const tags = mentor.skills || [];
    const shownTags = tags.slice(0, 5);
    const moreCount = Math.max(0, tags.length - 5);

    return (
        <div
            onClick={() => goToBooking()}
            className="h-full box-border flex flex-col rounded-[22px] border border-[#EDF1FB] bg-gradient-to-b from-[#F1F5FE] via-white to-white p-[18px] shadow-[0_10px_24px_-18px_rgba(20,26,51,.18)] cursor-pointer text-left"
        >
            {/* Availability + save */}
            <div className="flex items-center justify-between mb-3.5">
                {availableToday ? (
                    <span className="inline-flex items-center gap-[7px] bg-[#E7FBF1] text-[#0E9D5C] text-[11.5px] font-extrabold px-[11px] py-[5px] rounded-full whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                        Available Today
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-[7px] bg-[#F5F7FC] text-[#8B93B2] text-[11.5px] font-extrabold px-[11px] py-[5px] rounded-full whitespace-nowrap">
                        {mentor.activeTime || "Next slot soon"}
                    </span>
                )}
                <button
                    onClick={toggleSave}
                    className="cursor-pointer focus:outline-none"
                    aria-label={isSaved ? "Remove from saved experts" : "Save expert"}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? "#E13B57" : "none"} stroke={isSaved ? "#E13B57" : "#C7CDE0"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                    </svg>
                </button>
            </div>

            {/* Identity */}
            <div className="flex gap-3.5 flex-wrap mb-3.5">
                <div className="relative shrink-0 self-start">
                    <div className="w-[62px] h-[62px] rounded-full border-[2.5px] border-[#D9E4FF] p-[2.5px] box-border">
                        {mentor.avatar ? (
                            <img
                                src={mentor.avatar}
                                alt={mentor.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-[#EEF2FF] flex items-center justify-center font-bold text-[19px]" style={{ color: ACCENT }}>
                                {initials}
                            </div>
                        )}
                    </div>
                    {availableToday && (
                        <div className="absolute bottom-0.5 right-0.5 w-[13px] h-[13px] rounded-full bg-[#22C55E] border-[2.5px] border-white" />
                    )}
                </div>
                <div className="flex-1 min-w-[150px]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[17.5px] text-[#141A33] tracking-tight">{mentor.name}</span>
                        {mentor.isVerified && (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill={ACCENT}>
                                <path d="M12 1l2.4 2.1 3.1-.5 1.1 3 3 1.1-.5 3.1L23 12l-2.1 2.4.5 3.1-3 1.1-1.1 3-3.1-.5L12 23l-2.4-2.1-3.1.5-1.1-3-3-1.1.5-3.1L1 12l2.1-2.4-.5-3.1 3-1.1 1.1-3 3.1.5z" />
                                <path d="M9.5 12.2l1.8 1.8 3.6-3.8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                    <div className="text-[12.5px] text-[#5A6284] font-bold mt-0.5 mb-[7px]">{mentor.role}</div>
                    <div className="flex items-center gap-[9px] flex-wrap">
                        {mentor.company && (
                            <>
                                <div className="w-[22px] h-[22px] rounded-[7px] bg-[#F5F7FC] border border-[#EAEEF7] flex items-center justify-center font-extrabold text-[11.5px] text-[#141A33]">
                                    {companyInitial}
                                </div>
                                <span className="font-extrabold text-[13px] text-[#141A33]">{mentor.company}</span>
                            </>
                        )}
                        {mentor.level && (
                            <span className="bg-[#EEF2FF] text-[10.5px] font-extrabold px-2 py-[3px] rounded-[7px] whitespace-nowrap" style={{ color: ACCENT }}>
                                {mentor.level}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {topRated && (
                            <span className="inline-flex items-center gap-1.5 bg-[#FFF6E3] text-[#B57808] text-[9.5px] font-extrabold px-2 py-1 rounded-[7px] whitespace-nowrap">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="#F5A524"><path d="M12 2l2.9 6.9L22 9.3l-5.5 4.8L18 21l-6-3.9L6 21l1.5-6.9L2 9.3l7.1-.4z" /></svg>
                                Top Rated Expert
                            </span>
                        )}
                        {mentor.totalSessions > 0 && (
                            <span className="inline-flex items-center gap-1.5 bg-[#EEF2FF] text-[9.5px] font-extrabold px-2 py-1 rounded-[7px] whitespace-nowrap" style={{ color: ACCENT }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg>
                                {mentor.totalSessions}+ sessions booked
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-1.5 mb-3.5">
                <div className="flex items-center gap-[9px] border-r border-[#F0F2F8]">
                    <div className="w-7 h-7 rounded-[9px] bg-[#EEF2FF] flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    </div>
                    <div>
                        <div className="font-extrabold text-[12.5px] text-[#141A33]">{yearsExp}</div>
                        <div className="text-[10px] text-[#8B93B2] font-bold">Years Exp.</div>
                    </div>
                </div>
                <div className="flex items-center gap-[9px] border-r border-[#F0F2F8]">
                    <div className="w-7 h-7 rounded-[9px] bg-[#E7FBF1] flex items-center justify-center shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0E9D5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></svg>
                    </div>
                    <div>
                        <div className="font-extrabold text-[12.5px] text-[#141A33]">{mentor.totalSessions > 0 ? `${mentor.totalSessions}+` : "New"}</div>
                        <div className="text-[10px] text-[#8B93B2] font-bold">Sessions</div>
                    </div>
                </div>
                <div className="flex items-center gap-[9px]">
                    <div className="w-7 h-7 rounded-[9px] bg-[#FFF6E3] flex items-center justify-center shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#F5A524"><path d="M12 2l2.9 6.9L22 9.3l-5.5 4.8L18 21l-6-3.9L6 21l1.5-6.9L2 9.3l7.1-.4z" /></svg>
                    </div>
                    <div>
                        <div className="font-extrabold text-[12.5px] text-[#141A33]">{mentor.rating > 0 ? mentor.rating.toFixed(1) : "New"}</div>
                        <div className="text-[10px] text-[#8B93B2] font-bold">({mentor.reviews} Reviews)</div>
                    </div>
                </div>
            </div>

            {/* Skill tags */}
            {shownTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3.5">
                    {shownTags.map((tag) => (
                        <span key={tag} className="bg-[#F5F7FC] text-[#4A5170] text-[11px] font-bold px-[11px] py-[5px] rounded-full">
                            {tag}
                        </span>
                    ))}
                    {moreCount > 0 && (
                        <span className="bg-[#F5F7FC] text-[#8B93B2] text-[11px] font-extrabold px-[11px] py-[5px] rounded-full">
                            +{moreCount} more
                        </span>
                    )}
                </div>
            )}

            {/* Next available */}
            <div className="flex items-center gap-3 bg-[#F7F9FE] border border-[#EFF2FA] rounded-xl px-[13px] py-2.5 mb-3">
                <div className="w-[30px] h-[30px] rounded-[9px] bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                </div>
                <div className="flex-1">
                    <div className="text-[11px] text-[#8B93B2] font-bold">Next Available</div>
                    <div className="font-extrabold text-[12.5px] text-[#141A33]">{mentor.activeTime || "Check slots"}</div>
                </div>
                <button
                    onClick={goToBooking}
                    className="flex items-center gap-[5px] font-extrabold text-[12.5px] cursor-pointer whitespace-nowrap focus:outline-none"
                    style={{ color: ACCENT }}
                >
                    View Slots
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
            </div>

            {/* Price + CTAs */}
            <div className="mt-auto flex gap-2.5 flex-wrap">
                <div className="flex-1 min-w-[150px] bg-[#F7F9FE] border border-[#EFF2FA] rounded-xl px-[13px] py-[11px]">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#5A6284] font-bold mb-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        60 mins session
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[19px] text-[#141A33]">₹{price.toLocaleString("en-IN")}</span>
                        {oldPrice && (
                            <span className="text-[11.5px] text-[#B2B8D0] line-through">₹{oldPrice.toLocaleString("en-IN")}</span>
                        )}
                        {offPct !== null && offPct > 0 && (
                            <span className="bg-[#FFEAEC] text-[#E13B57] text-[10px] font-extrabold px-[7px] py-0.5 rounded-full">{offPct}% OFF</span>
                        )}
                    </div>
                </div>
                <div className="flex-[1.2] min-w-[160px] flex flex-col gap-[7px]">
                    <button
                        onClick={goToBooking}
                        className="flex items-center justify-center gap-2 text-white py-2.5 rounded-[11px] font-extrabold text-[13px] cursor-pointer transition-opacity hover:opacity-90 focus:outline-none"
                        style={{ background: ACCENT }}
                    >
                        Book Session
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                    </button>
                    <button
                        onClick={goToBooking}
                        className="flex items-center justify-center bg-white border-[1.5px] border-[#D9E4FF] py-[9px] rounded-[11px] font-extrabold text-[13px] cursor-pointer hover:bg-[#F7F9FE] transition-colors focus:outline-none"
                        style={{ color: ACCENT }}
                    >
                        View Profile
                    </button>
                </div>
            </div>

            {/* Footer trust line */}
            <div className="flex items-center gap-2 mt-[13px] pt-[11px] border-t border-[#F0F2F8] flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-[#0E9D5C]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    Verified Mockeefy Expert
                </span>
                <span className="text-[#D5DAE8]">•</span>
                <span className="text-[11.5px] font-bold text-[#8B93B2]">Mentored professionals at top companies</span>
            </div>
        </div>
    );
};

export default ExpertCard;
