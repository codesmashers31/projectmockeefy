/**
 * Shared layout for Sign In and Sign Up.
 * Centered single form layout on a clean background.
 */

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: "Sign in" | "Sign up" | "Complete profile" | "Forgot password";
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  const isWide = title === "Complete profile";
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 sm:py-12 font-sans">
      <div className={`w-full ${isWide ? "max-w-[560px]" : "max-w-[440px]"} transition-all duration-200`}>
        {children}
      </div>
    </div>
  );
}
