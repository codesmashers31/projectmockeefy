import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    const isDiscoveryPage =
      location.pathname === "/" ||
      location.pathname === "/find-mentor" ||
      location.pathname === "/mentors";

    // ONLY suppress scroll-to-top when on discovery page returning to an expert card!
    if (isDiscoveryPage) {
      const state = location.state as any;
      let hasExpertTarget = Boolean(
        state?.scrollToExpertId ||
        state?.preventScrollTop ||
        state?.preserveScroll
      );

      try {
        if (!hasExpertTarget && typeof window !== "undefined") {
          hasExpertTarget = Boolean(sessionStorage.getItem("lastViewedExpertId"));
        }
      } catch {
        // ignore storage access errors
      }

      if (hasExpertTarget) {
        return;
      }
    }

    // For ALL other pages (specifically /expert-profile/:id, /dashboard, etc.):
    // ALWAYS reset scroll to the top (0, 0) immediately!
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, [location, navigationType]);

  return null;
};

export default ScrollToTop;