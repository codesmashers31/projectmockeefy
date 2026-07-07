import React from "react";
import brandLogo from "../assets/logo/mockeefylogo.png";

type Props = {
  className?: string;
  title?: string;
  /** "brand" = blue/white high-quality mark, "mono" = uses currentColor */
  variant?: "brand" | "mono";
};

/**
 * Image-based brand logo component.
 * Loads the static brand asset E:/projectb/client/src/assets/logo/mockeefylogo.png
 */
export default function MockeefyLogo({ className, title = "Mockeefy", variant = "brand" }: Props) {
  return (
    <img
      src={brandLogo}
      className={`rounded-xl ${className} object-contain`}
      alt={title}
      title={title}
    />
  );
}
