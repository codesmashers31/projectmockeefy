import { ReactNode, useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    LogOut,
    Users,
    FileCheck,
    ListCheck,
    Layers,
    Award,
    CreditCard,
    DollarSign,
    Briefcase,
    PieChart,
    Hexagon,
    UserPlus,
    Ban,
    FileText
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import MockeefyLogo from "./MockeefyLogo";
import axios from "../lib/axios";
import { useDataSync } from "../context/SocketContext";

export type NavItem = {
    id: string;
    label: string;
    to: string;
    icon: ReactNode;
    end?: boolean;
    badge?: number;
    badgeVariant?: "pending" | "verified" | "rejected" | "default";
};

export default function AdminSidebar() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [counts, setCounts] = useState<{ pending?: number; verified?: number; rejected?: number }>({});

    const fetchCounts = useCallback(async () => {
        try {
            const res = await axios.get('/api/admin/experts/counts');
            if (res.data?.success && res.data?.data) {
                setCounts(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch expert counts for sidebar:", err);
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    // Real-time synchronization when any expert status updates
    useDataSync(["STATUS_UPDATED", "EXPERT_STATUS_UPDATED", "VERIFICATION_UPDATED", "PROFILE_UPDATED", "RECONNECTED"], () => {
        fetchCounts();
    });

    const handleSignOut = () => {
        logout();
        navigate("/signin", { replace: true });
    };

    const items: NavItem[] = [
        { id: "dashboard", label: "Dashboard", to: "/admin", icon: <LayoutDashboard size={20} />, end: true },
        { id: "sessions", label: "Session Management", to: "/admin/sessions", icon: <ListCheck size={20} /> },
        {
            id: "pending-experts",
            label: "Pending Experts",
            to: "/admin/experts/pending",
            icon: <UserPlus size={20} />,
            badge: counts.pending,
            badgeVariant: "pending"
        },
        {
            id: "verified-experts",
            label: "Verified Experts",
            to: "/admin/experts/verified",
            icon: <FileCheck size={20} />,
            badge: counts.verified,
            badgeVariant: "verified"
        },
        {
            id: "rejected-experts",
            label: "Rejected Experts",
            to: "/admin/experts/rejected",
            icon: <Ban size={20} />,
            badge: counts.rejected,
            badgeVariant: "rejected"
        },
        { id: "expert-agreements", label: "Expert Agreements", to: "/admin/agreements", icon: <FileText size={20} /> },

        { id: "job-board", label: "Job Board", to: "/admin/jobs", icon: <Briefcase size={20} /> },

        { id: "users", label: "User Management", to: "/admin/users", icon: <Users size={20} /> },
        { id: "skills", label: "Skill Management", to: "/admin/skills", icon: <Hexagon size={20} /> },
        { id: "certifications", label: "Certification Rules", to: "/admin/certifications", icon: <Award size={20} /> },
        { id: "pricing", label: "Pricing Rules", to: "/admin/pricing", icon: <CreditCard size={20} /> },
        { id: "payouts", label: "Payout Management", to: "/admin/payouts", icon: <DollarSign size={20} /> },
        { id: "hr-contacts", label: "HR Contacts", to: "/admin/hr-contacts", icon: <Briefcase size={20} /> },
        { id: "reports", label: "Reports & Certs", to: "/admin/reports", icon: <PieChart size={20} /> },
        { id: "categories", label: "Categories", to: "/admin/categories", icon: <Layers size={20} /> },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-full">
            <div className="h-[80px] flex items-center px-6 border-b border-blue-100/50 overflow-hidden">
                <div className="flex items-center gap-3">
                    <MockeefyLogo className="h-10 w-10" variant="brand" />
                    <span className="text-2xl font-logo tracking-tight text-[#004fcb]">Mockeefy</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Main Menu
                </div>

                {items.map(item => (
                    <NavLink
                        key={item.id}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive
                                ? 'bg-[#004fcb] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className={isActive ? "text-white" : "text-gray-400"}>
                                    {item.icon}
                                </span>
                                <span className="flex-1 text-left truncate">{item.label}</span>
                                {typeof item.badge === "number" && (
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : item.badge === 0
                                                ? 'bg-gray-100 text-gray-500'
                                                : item.badgeVariant === 'pending'
                                                ? 'bg-amber-100 text-amber-800'
                                                : item.badgeVariant === 'verified'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : item.badgeVariant === 'rejected'
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <button onClick={handleSignOut} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={20} />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
