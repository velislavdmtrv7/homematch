import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MapPin, BedDouble, Building2, Clock, Ruler,
  CheckCircle, XCircle, Inbox, ChevronRight,
} from "lucide-react";
import { navState } from "@/hooks/useBackNavigation";

import { API_URL } from "@/lib/api";
import { ApiPhoto, Offer } from "@/types/api";

const label = {
  property: (t: string) => t === "apartment" ? "Апартамент" : t === "house" ? "Къща" : "Без значение",
};

interface RequestGroup {
  _id: string;
  city: string;
  property_type: string;
  budget: { min: number; max: number };
  specs: { bedrooms: number; min_area_sqm: number };
  status: string;
  offers: (Offer & { cover_url?: string })[];
}

const MyReceivedOffers = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<RequestGroup[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { "Authorization": `Bearer ${token}` };

      // 1. Вземаме всички заявки на потребителя
      const reqRes = await fetch(`${API_URL}/requests/user/${user.id}`, { headers });
      const requests = await reqRes.json();

      if (!requests || requests.length === 0) {
        setGroups([]);
        setFetching(false);
        return;
      }

      // 2. Вземаме всички получени оферти
      const offersRes = await fetch(`${API_URL}/offers/seeker/${user.id}`, { headers });
      const allOffers = await offersRes.json();

      // Групѝраме офертите към съответните заявки (точно както в оригинала)
      const groupList: RequestGroup[] = [];
      
      for (const req of requests) {
        const reqOffers = allOffers.filter((o: Offer) => o.request_id === req._id);
        if (reqOffers.length === 0) continue;

        groupList.push({
          ...req,
          offers: reqOffers.map((o: Offer) => {
            // Намираме cover снимката от масива photos в MongoDB документа
            const coverPhoto = o.photos?.find((p: ApiPhoto) => p.is_cover)?.data;
            return { ...o, cover_url: coverPhoto };
          })
        });
      }

      setGroups(groupList);
      setFetching(false);

      if (highlightId) {
        setTimeout(() => {
          document.getElementById(`response-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 400);
      }
    } catch (err) {
      console.error("Грешка при зареждане:", err);
      setFetching(false);
    }
  }, [user, highlightId]);

  useEffect(() => { loadData(); }, [loadData]);

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
          <button onClick={() => navigate("/")} className="text-sm font-bold transition-opacity hover:opacity-70">
            HomeMatch<span className="text-primary">.bg</span>
          </button>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-8">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Получени оферти
        </h1>

        {groups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 font-bold">Няма получени оферти</h3>
              <p className="text-sm text-muted-foreground">Когато получите предложения по вашите заявки, те ще се появят тук.</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => {
            const pending = group.offers.filter((o) => o.contact_status === "pending").length;
            const approved = group.offers.filter((o) => o.contact_status === "approved").length;
            const rejected = group.offers.filter((o) => o.contact_status === "rejected").length;

            return (
              <Card key={group._id} className="overflow-hidden">
                {/* Заглавие на заявката */}
                <div className="bg-muted/40 border-b border-border/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-bold text-base">
                      {label.property(group.property_type)} в {group.city}
                    </h2>
                    <Badge variant={group.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {group.status === "active" ? "Активна" : "Затворена"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">{group.budget?.min} – {group.budget?.max} €/мес</span>
                    <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {group.specs?.bedrooms} стаи</span>
                    {group.specs?.min_area_sqm > 0 && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> ≥{group.specs.min_area_sqm} м²</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      {group.offers.length} {group.offers.length === 1 ? "оферта" : "оферти"}
                    </Badge>
                    {pending > 0 && <Badge variant="outline" className="text-[10px] gap-1"><Clock className="h-3 w-3" /> {pending} изчакв.</Badge>}
                    {approved > 0 && <Badge variant="outline" className="text-[10px] gap-1 border-green-500/30 text-green-600 bg-green-500/5"><CheckCircle className="h-3 w-3" /> {approved} одобрени</Badge>}
                    {rejected > 0 && <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive bg-destructive/5"><XCircle className="h-3 w-3" /> {rejected} отхвърлени</Badge>}
                  </div>
                </div>

                {/* Списък с оферти към тази заявка */}
                <div className="divide-y divide-border/40">
                  {group.offers.map((resp) => {
                    const status = resp.contact_status || "pending";
                    return (
                      <button
                        key={resp._id}
                        id={`response-${resp._id}`}
                        onClick={() => navigate(`/offer/${resp._id}`, navState("received-offers"))}
                        className={`w-full transition-all text-left hover:bg-muted/30 ${highlightId === resp._id ? "bg-primary/5 ring-2 ring-inset ring-primary/20" : ""}`}
                      >
                        <div className="flex items-stretch">
                          {resp.cover_url && (
                            <div className="w-24 sm:w-32 shrink-0 bg-muted">
                              <img src={resp.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            </div>
                          )}
                          <div className="flex-1 p-3 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-sm">{resp.price} €/мес</span>
                              <div className="flex items-center gap-1.5">
                                {status === "approved" && <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">Одобрена</Badge>}
                                {status === "rejected" && <Badge variant="destructive" className="text-[10px]">Отхвърлена</Badge>}
                                {status === "pending" && <Badge variant="secondary" className="text-[10px]">Изчакване</Badge>}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {label.property(resp.property_type)}</span>
                              <span>{resp.bedrooms} стаи</span>
                              <span>{resp.size_sqm} м²</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              Локация: {resp.approx_location}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
};

export default MyReceivedOffers;
