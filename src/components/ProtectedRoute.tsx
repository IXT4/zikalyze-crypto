import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ZikalyzeSplash from "@/components/ZikalyzeSplash";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <ZikalyzeSplash message="Loading your dashboard..." />;
  }

  if (!user) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
