import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

import { API_URL } from "@/lib/api";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/notifications/unread-count/${user.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setUnread(data.count || 0);
    } catch (err) {
      console.error("Грешка при зареждане на брой известия:", err);
    }
  }, [user]);

  // Обновяваме при зареждане и при всяка смяна на страницата
  useEffect(() => {
    fetchCount();
    // Опционално: проверка на всеки 30 секунди за "живи" известия
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user, location.pathname, fetchCount]);

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/notifications")}>
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Button>
  );
};

export default NotificationBell;
