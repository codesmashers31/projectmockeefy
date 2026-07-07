import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
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
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;