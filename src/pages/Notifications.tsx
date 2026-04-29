import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Inbox, MessageSquare, UserCheck, XCircle, Star } from "lucide-react";
import { navState } from "@/hooks/useBackNavigation";

const API_URL = "http://localhost:5000/api";

const iconMap: Record<string, React.ReactNode> = {
  new_response: <MessageSquare className="h-4 w-4 text-primary" />,
  contact_approved: <UserCheck className="h-4 w-4 text-green-600" />,
  offer_rejected: <XCircle className="h-4 w-4 text-destructive" />,
  new_review: <Star className="h-4 w-4 text-yellow-500" />,
  review_updated: <Star className="h-4 w-4 text-yellow-500" />,
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Току-що";
  if (mins < 60) return `Преди ${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Преди ${hours} ч`;
  const days = Math.floor(hours / 24);
  return `Преди ${days} дни`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { "Authorization": `Bearer ${token}` };

      // 1. Вземаме известията
      const res = await fetch(`${API_URL}/notifications/${user.id}`, { headers });
      const data = await res.json();
      setNotifications(data || []);
      setFetching(false);

      // 2. Маркираме ги като прочетени
      if (data && data.some((n: any) => !n.read)) {
        await fetch(`${API_URL}/notifications/read-all/${user.id}`, {
          method: "PUT",
          headers
        });
      }
    } catch (err) {
      console.error("Грешка при зареждане на известия:", err);
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground">Зареждане...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Табло</span>
          </button>
          <span className="text-sm font-bold">HomeMatch<span className="text-primary">.bg</span></span>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 text-xl font-bold flex items-center gap-2">
          < Bell className="h-5 w-5" /> Известия
        </h1>

        {notifications.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 font-bold">Няма известия</h3>
              <p className="text-sm text-muted-foreground">Ще ви уведомим при нови предложения или промени в статуса.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const handleClick = () => {
                const ns = navState("notifications");
                if (n.metadata?.response_id) {
                  // Търсещият отива към детайли на оферта
                  if (n.type === "new_response") {
                    navigate(`/offer/${n.metadata.response_id}`, ns);
                  } 
                  // Брокерът отива към резюме на офертите си за дадена заявка
                  else if (n.metadata.request_id) {
                    navigate(`/offers/${n.metadata.request_id}`, ns);
                  }
                }
              };

              return (
                <Card
                  key={n._id}
                  className={`cursor-pointer transition-colors hover:bg-muted/30 ${!n.read ? "border-primary/30 bg-primary/5" : ""}`}
                  onClick={handleClick}
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="mt-0.5">{iconMap[n.type] || <Bell className="h-4 w-4 text-muted-foreground" />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold">{n.title}</h3>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;