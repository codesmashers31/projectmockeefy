import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCtaSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="rounded-2xl bg-blue-600 text-white p-8 md:p-12 text-center shadow-md shadow-blue-600/15 relative overflow-hidden [&_h1]:!text-white [&_h2]:!text-white [&_p]:!text-white">
        <div className="relative z-10">
          <h2 className="!text-white text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug mb-2.5">Ready to ace your next interview?</h2>
          <p className="!text-blue-100 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-7 font-normal">
            Join Mockeefy, book an expert, and get the practice and feedback you need—without the pressure of the real thing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-blue-600 text-sm font-bold tracking-tight rounded-xl hover:bg-blue-50 shadow-sm transition-all active:scale-95"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/signin"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 bg-white/15 border border-white/30 text-white text-sm font-semibold tracking-tight rounded-xl hover:bg-white/25 transition-all"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
