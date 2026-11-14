import { useEffect, useState } from "react";

import { API_URL } from "@/lib/api";

interface ProviderRating {
  avg: number;
  count: number;
}

export const useProviderRating = (providerId: string | undefined) => {
  const [rating, setRating] = useState<ProviderRating | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!providerId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reviews/stats/${providerId}`);
      const data = await res.json();
      setRating({ 
        avg: Math.round(data.avgRating * 10) / 10 || 0, 
        count: data.count || 0 
      });
    } catch (err) {
      console.error("Грешка при рейтинг:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [providerId]);

  return { rating, loading, refresh };
};
