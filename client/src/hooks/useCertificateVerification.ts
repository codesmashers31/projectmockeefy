import { useState, useEffect, useCallback } from "react";
import axios from "../lib/axios";
import { useAuth } from "../context/AuthContext";

export type VerificationStatusData = {
  completedCount: number;
  currentCycle: number;
  isApproachingEligible: boolean;
  confirmationRequired: boolean;
  hasConfirmed: boolean;
  confirmedName: string | null;
  confirmedAt: string | null;
  confirmationReference: string | null;
  profileName: string;
};

export const useCertificateVerification = () => {
  const { user } = useAuth();
  const [data, setData] = useState<VerificationStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get("/api/certifications/verification-status");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch certificate verification status:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const confirmIdentity = async (confirmedName?: string) => {
    const res = await axios.post("/api/certifications/confirm-identity", {
      acknowledged: true,
      confirmedName: confirmedName || data?.profileName || user?.name
    });
    if (res.data.success) {
      await fetchStatus();
      return res.data;
    }
    throw new Error(res.data.message || "Failed to confirm identity");
  };

  return {
    data,
    loading,
    refreshVerification: fetchStatus,
    confirmIdentity
  };
};
