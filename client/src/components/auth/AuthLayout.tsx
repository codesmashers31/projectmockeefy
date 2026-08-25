/**
 * Shared layout for Sign In and Sign Up.
 * Centered single form layout on a clean background.
 */

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: "Sign in" | "Sign up" | "Complete profile" | "Forgot password";
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 font-sans">
      <div className="w-full max-w-[440px]">
        {children}
      </div>
    </div>
  );
}
