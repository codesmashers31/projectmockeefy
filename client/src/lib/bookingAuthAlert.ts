import Swal from "sweetalert2";

export interface BookingAuthAlertOptions {
  mentorName: string;
  dateStr?: string;
  timeSlot?: string;
  duration?: number | string;
  onLogin: () => void;
  onSignUp: () => void;
  onCancel?: () => void;
}

/**
 * Standardized professional login/signup alert modal for Mockeefy.
 * Pure professional layout without cartoonish icons or emojis, fully matched
 * to Mockeefy's SaaS design system and the post-payment confirmation style.
 */
export const showBookingAuthAlert = ({
  mentorName,
  dateStr,
  timeSlot,
  duration = 30,
  onLogin,
  onSignUp,
  onCancel,
}: BookingAuthAlertOptions) => {
  const cleanMentorName = (mentorName || "Expert Mentor").trim();

  return Swal.fire({
    html: `
      <div style="font-family: inherit; text-align: left; padding: 4px 2px 2px;">
        <!-- Clean Professional Header (No icons or emojis) -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="font-size: 21px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.025em; line-height: 1.25;">
            Login or Sign Up Required
          </h3>
          <p style="font-size: 13px; color: #64748b; margin: 0; font-weight: 500;">
            Please sign in or create an account to confirm your interview session.
          </p>
        </div>

        <!-- Structured Details Grid Card -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 15px 18px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 11px; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Interview Expert</span>
            <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${cleanMentorName}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Date</span>
            <span style="font-size: 13.5px; font-weight: 600; color: #1e293b;">${dateStr || "Selected Session Date"}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Time Slot</span>
            <span style="font-size: 13.5px; font-weight: 700; color: #0755e8;">${timeSlot || "Selected Time Slot"}</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 11px 0; border-bottom: 1px solid #f1f5f9;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Duration</span>
            <span style="font-size: 13px; font-weight: 600; color: #334155;">${duration} Minutes</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 11px;">
            <span style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Status</span>
            <span style="display: inline-flex; align-items: center; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;">
              Saved &bull; Ready to Confirm
            </span>
          </div>
        </div>

        <!-- Professional Notice Box -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 11px 14px; margin-bottom: 2px;">
          <p style="font-size: 12px; color: #166534; font-weight: 700; margin: 0 0 2px 0;">
            Slot saved &amp; waiting for you
          </p>
          <p style="font-size: 11.5px; color: #15803d; margin: 0; line-height: 1.45;">
            Your booking choices are saved. This booking modal will automatically open right back up as soon as you log in or register!
          </p>
        </div>
      </div>
    `,
    showConfirmButton: true,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: "Log In",
    denyButtonText: "Sign Up (New User)",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#0755E8",
    denyButtonColor: "#0F172A",
    cancelButtonColor: "#94A3B8",
    allowOutsideClick: true,
    allowEscapeKey: true,
    scrollbarPadding: true,
    customClass: {
      popup: "swal-professional-popup",
      container: "swal-top-container",
      actions: "swal-auth-actions",
      confirmButton: "swal-auth-confirm-btn",
      denyButton: "swal-auth-deny-btn",
      cancelButton: "swal-auth-cancel-btn",
    },
    buttonsStyling: false,
    didOpen: (popup) => {
      // Prevent background scroll events while preserving modal scroll if needed
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
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    },
  }).then((res) => {
    if (res.isConfirmed) {
      onLogin();
    } else if (res.isDenied) {
      onSignUp();
    } else if (onCancel) {
      onCancel();
    }
    return res;
  });
};
