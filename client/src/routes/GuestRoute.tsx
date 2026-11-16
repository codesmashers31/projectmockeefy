import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const GuestRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Prevent flickering by showing nothing or a spinner while checking auth
        return null;
    }

    if (user) {
        const fromState = (location.state as any)?.from;
        const targetPath = fromState?.pathname
            ? (fromState.pathname + (fromState.search || ""))
            : typeof fromState === "string"
                ? fromState
                : null;

        if (targetPath) {
            return <Navigate to={targetPath} replace />;
        }

        // If user is already logged in, redirect to dashboard or appropriate page
        if (user.userType === "expert") {
            return <Navigate to="/dashboard" replace />;
        } else if (user.userType === "admin") {
            return <Navigate to="/admin" replace />;
        } else {
            return <Navigate to="/" replace />; // Default fallback for candidate
        }
    }

    return <>{children}</>;
};
