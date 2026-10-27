import Swal from "sweetalert2";

interface BookingSuccessAlertOptions {
  title?: string;
  mentorName: string;
  dateStr: string;
  timeSlot: string;
  duration?: number | string;
  extraNote?: string;
  onConfirm: () => void;
}

/**
 * Standardized professional meeting confirmation modal for Mockeefy.
 * Pure professional layout without cartoonish icons or emojis, fully matched to Mockeefy's SaaS theme.
 */
export const showBookingSuccessAlert = ({
  title = "Meeting Scheduled",
  mentorName,
  dateStr,
  timeSlot,
  duration,
  extraNote,
  onConfirm,
}: BookingSuccessAlertOptions) => {
  // Strip any accidental emojis from title
  const cleanTitle = title.replace(/[🎉✨✓]/g, "").trim() || "Meeting Scheduled";

  return Swal.fire({
    html: `
      <div style="font-family: inherit; text-align: left; padding: 4px 2px 2px;">
        <!-- Clean Professional Header (No icons or emojis) -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-size: 21px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.025em; line-height: 1.25;">
            ${cleanTitle}
          </h3>
          <p style="font-size: 13px; color: #64748b; margin: 0; font-weight: 500;">
            Your 1:1 interview session has been successfully allocated.
          </p>
        </div>

        <!-- Structured Details Grid Card -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px 18px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 11px; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Interview Expert</span>
            <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${mentorName || "Expert Mentor"}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Date</span>
            <span style="font-size: 13.5px; font-weight: 600; color: #1e293b;">${dateStr}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Time Slot</span>
            <span style="font-size: 13.5px; font-weight: 700; color: #0755e8;">${timeSlot}</span>
          </div>

          ${
            duration
              ? `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Duration</span>
            <span style="font-size: 13px; font-weight: 600; color: #334155;">${duration} Minutes</span>
          </div>
          `
              : ""
          }

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 11px;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Status</span>
            <span style="display: inline-flex; align-items: center; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
              Confirmed &amp; Reserved
            </span>
          </div>
        </div>

        ${
          extraNote
            ? `
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 10px 14px; margin-bottom: 12px;">
          <p style="font-size: 12px; color: #1e40af; font-weight: 600; margin: 0; line-height: 1.4;">
            ${extraNote}
          </p>
        </div>
        `
            : ""
        }

        <!-- Professional Notice Box -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 11px 14px; margin-bottom: 2px;">
          <p style="font-size: 12px; color: #166534; font-weight: 600; margin: 0 0 2px 0;">
            Slot removed from available timings
          </p>
          <p style="font-size: 11.5px; color: #15803d; margin: 0; line-height: 1.45;">
            Your calendar schedule and video session access have been prepared. You can join directly from your sessions dashboard.
          </p>
        </div>
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: "View My Bookings",
    confirmButtonColor: "#0755E8",
    allowOutsideClick: false,
    allowEscapeKey: false,
    scrollbarPadding: true,
    customClass: {
      popup: "swal-professional-popup",
      container: "swal-top-container",
      confirmButton: "swal-professional-btn",
    },
    buttonsStyling: true,
    didOpen: (popup) => {
      // Strictly prevent background scroll events on both touch devices and desktop wheels
      const preventScroll = (e: Event) => {
        if (popup && popup.contains(e.target as Node)) {
          if (popup.scrollHeight > popup.clientHeight) {
            return;
          }
        }
        e.preventDefault();
      };

      window.addEventListener("wheel", preventScroll, { passive: false });
      window.addEventListener("touchmove", preventScroll, { passive: false });

      // Save listener reference on popup element for clean unbinding
      (popup as any).__swalScrollPreventer = preventScroll;
    },
    willClose: (popup) => {
      const preventScroll = (popup as any)?.__swalScrollPreventer;
      if (preventScroll) {
        window.removeEventListener("wheel", preventScroll);
        window.removeEventListener("touchmove", preventScroll);
      }
    },
    didDestroy: () => {
      // In case willClose didn't run, ensure body and html are restored
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    },
  }).then((result) => {
    onConfirm();
    return result;
  });
};
