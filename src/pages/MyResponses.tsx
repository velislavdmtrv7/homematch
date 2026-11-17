import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MapPin, BedDouble, Ruler, Inbox, Building2,
  Clock, CheckCircle, XCircle, Phone, Send,
} from "lucide-react";
import { navState } from "@/hooks/useBackNavigation";

import { API_URL } from "@/lib/api";
import { Offer, RentalRequest } from "@/types/api";

const propertyLabel = (t: string) =>
  t === "apartment" ? "Апартамент" : t === "house" ? "Къща" : "Друго";
const rentalLabel = (t: string) =>
  t === "long_term" ? "Дългосрочен" : t === "short_term" ? "Краткосрочен" : "Гъвкав";
const furnishedLabel = (t: string) =>
  t === "yes" ? "Обзаведен" : t === "no" ? "Необзаведен" : "По договаряне";

// Структура за групиране по request_id
interface RequestGroup {
  request_id: string;
  request_city: string;
  offers: (Offer & { seeker_phone: string | null })[];
}

const MyResponses = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<RequestGroup[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        // 1. Вземаме всички оферти на брокера
        const offersRes = await fetch(`${API_URL}/offers/provider/${user.id}`, { headers });
        const offersData: Offer[] = await offersRes.json();

        if (!offersData || offersData.length === 0) {
          setGroups([]);
          setFetching(false);
          return;
        }

        // 2. Събираме уникалните ID-та на заявките и търсещите
        const requestIds = Array.from(new Set(offersData.map((o) => o.request_id)));
        
        // 3. Вземаме детайли за заявките (за да знаем града) и телефоните на търсещите (при одобрение)
        const requestsMap: Record<string, RentalRequest> = {};
        const seekersMap: Record<string, string> = {};

        await Promise.all([
          ...requestIds.map(async (rid: string) => {
            const rRes = await fetch(`${API_URL}/requests/${rid}`, { headers });
            if (rRes.ok) {
              const rData = await rRes.json();
              requestsMap[rid] = rData;
              
              // Ако има поне една одобрена оферта за тази заявка, вземаме телефона на търсещия
              const hasApproved = offersData.some((o) => o.request_id === rid && o.contact_status === "approved");
              if (hasApproved) {
                const sRes = await fetch(`${API_URL}/offers/request-summary/${rid}/${user.id}`, { headers });
                if (sRes.ok) {
                  const sData = await sRes.json();
                  if (sData.seekerPhone) seekersMap[rData.seeker_id] = sData.seekerPhone;
                }
              }
            }
          })
        ]);

        // 4. Групѝраме структурата точно както в оригинала
        const groupMap: Record<string, RequestGroup> = {};
        for (const off of offersData) {
          const req = requestsMap[off.request_id];
          const seekerPhone = req ? seekersMap[req.seeker_id] : null;

          const offerWithPhone = {
            ...off,
            seeker_phone: off.contact_status === "approved" ? seekerPhone : null,
          };

          if (!groupMap[off.request_id]) {
            groupMap[off.request_id] = {
              request_id: off.request_id,
              request_city: req?.city || "Неизвестен град",
              offers: [],
            };
          }
          groupMap[off.request_id].offers.push(offerWithPhone);
        }

        setGroups(Object.values(groupMap));
      } catch (err) {
        console.error("Грешка при зареждане:", err);
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [user]);

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted-foreground">Зареждане на оферти...</span>
      </div>
    );
  }

  const totalOffers = groups.reduce((sum, g) => sum + g.offers.length, 0);

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
        <h1 className="mb-6 text-xl font-bold">Моите оферти</h1>

        {totalOffers === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="mb-2 font-bold">Нямате изпратени оферти</h3>
              <p className="mb-4 text-sm text-muted-foreground">Разгледайте активните заявки и изпратете предложение.</p>
              <Button onClick={() => navigate("/browse")} className="gap-2">Разгледай заявки</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const approved = group.offers.filter((o) => o.contact_status === "approved").length;
              const rejected = group.offers.filter((o) => o.contact_status === "rejected").length;
              const pending = group.offers.filter((o) => o.contact_status === "pending").length;
              const firstOffer = group.offers[0];

              return (
                <Card
                  key={group.request_id}
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => navigate(`/requests/${group.request_id}`, navState("sent-offers"))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Заявка в {group.request_city}
                      </p>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Send className="h-3 w-3" /> {group.offers.length} {group.offers.length === 1 ? "оферта" : "оферти"}
                      </Badge>
                    </div>

                    <h3 className="mb-1 font-bold">
                      {firstOffer.price} €/мес — {firstOffer.approx_location}
                      {group.offers.length > 1 && <span className="text-muted-foreground font-normal text-sm"> (+{group.offers.length - 1})</span>}
                    </h3>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {firstOffer.bedrooms} стаи</span>
                      <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {firstOffer.size_sqm} м²</span>
                      <span>{furnishedLabel(firstOffer.furnished)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {pending > 0 && <Badge variant="outline" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> {pending} изчакв.</Badge>}
                      {approved > 0 && <Badge variant="outline" className="gap-1 text-[10px] border-green-500/30 text-green-600 bg-green-500/5"><CheckCircle className="h-3 w-3" /> {approved} одобр.</Badge>}
                      {rejected > 0 && <Badge variant="outline" className="gap-1 text-[10px] border-destructive/30 text-destructive bg-destructive/5"><XCircle className="h-3 w-3" /> {rejected} отхвърл.</Badge>}
                    </div>

                    {group.offers.some((o) => o.contact_status === "approved" && o.seeker_phone) && (
                      <div className="mt-2 flex items-center gap-1.5 rounded-md bg-green-500/5 border border-green-500/20 px-3 py-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-medium">
                          {group.offers.find((o) => o.contact_status === "approved" && o.seeker_phone)?.seeker_phone}
                        </span>
                      </div>
                    )}
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

export default MyResponses;

