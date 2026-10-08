import React, { useState, useEffect } from 'react';
import { useLocation } from "react-router-dom";
import Navigation from "./Navigation";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { ArrowUp } from "lucide-react";

interface DashboardLayoutProps {
    children: React.ReactNode;
    hideSidebars?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, hideSidebars = false }) => {
    const showLeftSidebar = !hideSidebars;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/70 to-white flex flex-col font-sans text-gray-900">
            {/* Top Navigation - Sticky */}
            <div className="sticky top-0 z-50">
                <Navigation />
            </div>

            {/* Unified Container: Left Sidebar | Main */}
            <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 pb-12 sm:pb-20 transition-all duration-300">
                <div className="flex flex-col lg:flex-row gap-5 items-start justify-center w-full mx-auto">

                    {/* Left Sidebar - Interview Command Center */}
                    {showLeftSidebar && (
                        <aside className="hidden lg:block w-[240px] shrink-0 sticky top-[80px] pb-8">
                            <div className="space-y-4">
                                <Sidebar />
                            </div>
                        </aside>
                    )}

                    {/* Main Content Area */}
                    <section className="min-w-0 max-w-[860px] w-full animate-in fade-in duration-500">
                        {children}
                    </section>
                </div>
            </main>

            <Footer />
            <BackToTopButton />
        </div>
    );
};

const BackToTopButton = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };
        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    return (
        <button
            onClick={scrollToTop}
            className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl hover:shadow-2xl border border-blue-500/20 active:scale-95 hover:-translate-y-1 transition-all duration-300 ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-75 pointer-events-none"
                }`}
            aria-label="Back to top"
        >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
    );
};

export default DashboardLayout;
