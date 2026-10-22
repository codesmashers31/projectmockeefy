import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    // If navigation state specifically indicates not to scroll to top (e.g. returning to expert card)
    const state = location.state as any;
    if (state?.scrollToExpertId || state?.preventScrollTop || state?.preserveScroll) {
      return;
    }

    if (navigationType === "PUSH" || navigationType === "REPLACE") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
    } else if (navigationType === "POP") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    }
  }, [location, navigationType]);

  return null;
};

export default ScrollToTop;