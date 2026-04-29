import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Home, ArrowLeft, Plus, MapPin, BedDouble, Clock, MessageSquare, Ruler, Trash2 } from "lucide-react";
import { navState } from "@/hooks/useBackNavigation";

const API_URL = "http://localhost:5000/api";

const MyRequests = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [fetching, setFetching] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        // 1. Взимаме заявките
        const reqRes = await fetch(`${API_URL}/requests/user/${user.id}`, { headers });
        const requestsData = await reqRes.json();
        setRequests(requestsData || []);

        // 2. Взимаме всички получени оферти, за да сметнем бройките
        if (requestsData && requestsData.length > 0) {
          const offersRes = await fetch(`${API_URL}/offers/seeker/${user.id}`, { headers });
          const offersData = await offersRes.json();
          
          const counts: Record<string, number> = {};
          offersData.forEach((offer: any) => {
            counts[offer.request_id] = (counts[offer.request_id] || 0) + 1;
          });
          setResponseCounts(counts);
        }
      } catch (err) {
        console.error("Грешка при зареждане:", err);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/requests/${deleteTarget}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Грешка при изтриване");

      setRequests((prev) => prev.filter((r) => r._id !== deleteTarget));
      toast.success("Заявката е изтрита");
    } catch (e: any) {
      toast.error(e.message || "Грешка при изтриване");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const daysLeft = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const propertyLabel = (t: string) => t === "apartment" ? "Апартамент" : t === "house" ? "Къща" : "Всеки тип";
  const rentalLabel = (t: string) => t === "long_term" ? "Дългосрочен" : t === "short_term" ? "Краткосрочен" : "Гъвкав";

  if (loading || fetching) {
    return <div className="flex min-h-screen items-center justify-center"><div className="text-muted-foreground">Зареждане...</div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Табло</span>
          </button>
          <span className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            HomeMatch<span className="text-primary">.bg</span>
          </span>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">Моите заявки</h1>
          <Button size="sm" className="gap-2" onClick={() => navigate("/requests/new")}>
            <Plus className="h-4 w-4" /> Нова
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Home className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 font-bold">Нямате заявки</h3>
              <p className="mb-4 text-sm text-muted-foreground">Създайте първата си заявка и започнете да получавате оферти.</p>
              <Button onClick={() => navigate("/requests/new")} className="gap-2"><Plus className="h-4 w-4" /> Създай заявка</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const days = daysLeft(req.expires_at);
              const count = responseCounts[req._id] || 0;
              const isActive = req.status === "active" && days > 0;

              return (
                <Card key={req._id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => navigate(`/requests/${req._id}`, navState("my-requests"))}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Активна" : "Затворена"}</Badge>
                        {isActive && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {days} дни
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {count > 0 && (
                          <Badge variant="outline" className="gap-1">
                            <MessageSquare className="h-3 w-3" /> {count}
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(req._id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="mb-1 font-bold">{propertyLabel(req.property_type)} в {req.city}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {req.city}</span>
                      <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {req.specs?.bedrooms} стаи</span>
                      {req.specs?.min_area_sqm > 0 && (
                        <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {req.specs.min_area_sqm} м²</span>
                      )}
                      <span className="font-medium text-foreground">{req.budget?.min} – {req.budget?.max} €/мес</span>
                      <span>{rentalLabel(req.rental_type)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{req.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтриване на заявка</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете тази заявка? Всички получени предложения също ще бъдат премахнати. Това действие е необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отказ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Изтриване..." : "Изтрий"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyRequests;