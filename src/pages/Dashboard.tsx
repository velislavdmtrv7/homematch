import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { 
  Home, Plus, Search, LogOut, User, Building2, ArrowLeftRight, 
  Warehouse, Clock, CheckCircle, XCircle, Send, Inbox, MessageSquareText
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { navState } from "@/hooks/useBackNavigation";

import { API_URL } from "@/lib/api";

const Dashboard = () => {
  const { user, profile, loading, signOut, activeMode, setActiveMode, addProviderRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [providerChoice, setProviderChoice] = useState<"broker" | "owner">("owner");
  const [switching, setSwitching] = useState(false);
  
  const [offerStats, setOfferStats] = useState<{ total: number; pending: number; approved: number; rejected: number } | null>(null);
  const [seekerOfferStats, setSeekerOfferStats] = useState<{ total: number; pending: number; approved: number; rejected: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  // Зареждане на статистики за Брокер (Предлагащ)
  useEffect(() => {
    if (!user || activeMode !== "provider") {
      setOfferStats(null);
      return;
    }
    const fetchProviderStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };
        
        // 1. Базови статистики (съществуващи)
        const res = await fetch(`${API_URL}/stats/provider/${user.id}`, { headers });
        if (res.ok) {
          const data = await res.json();
          let total = 0, pending = 0, approved = 0, rejected = 0;
          data.forEach((item: any) => {
            total += item.count;
            if (item._id === "pending") pending = item.count;
            if (item._id === "approved") approved = item.count;
            if (item._id === "rejected") rejected = item.count;
          });
          setOfferStats({ total, pending, approved, rejected });
        }
      } catch (err) { console.error(err); }
    };
    fetchProviderStats();
  }, [user, activeMode]);

  // Зареждане на статистики за Търсещ
  useEffect(() => {
    if (!user || activeMode !== "seeker") {
      setSeekerOfferStats(null);
      return;
    }
    const fetchSeekerStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Authorization": `Bearer ${token}` };

        // 1. Базови статистики (съществуващи)
        const res = await fetch(`${API_URL}/offers/seeker/${user.id}`, { headers });
        if (res.ok) {
          const offers = await res.json();
          if (offers.length === 0) {
            setSeekerOfferStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
          } else {
            let pending = 0, approved = 0, rejected = 0;
            offers.forEach((offer: any) => {
              const s = offer.contact_status || "pending";
              if (s === "approved") approved++;
              else if (s === "rejected") rejected++;
              else pending++;
            });
            setSeekerOfferStats({ total: offers.length, pending, approved, rejected });
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchSeekerStats();
  }, [user, activeMode]);

  const hasProviderRole = profile?.role === "broker" || profile?.role === "owner" || !!(profile as any)?.provider_type;

  useEffect(() => {
    if (searchParams.get("addProvider") === "true" && profile && !hasProviderRole) {
      setShowAddProvider(true);
    }
  }, [searchParams, profile, hasProviderRole]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="text-muted-foreground">Зареждане...</div></div>;
  if (!profile) return null;

  const roleLabels: Record<string, string> = {
    seeker: "Търсещ жилище",
    broker: "Брокер / Агенция",
    owner: "Частен собственик",
  };

  const isSeeker = activeMode === "seeker";
  const isProvider = activeMode === "provider";

  const handleModeSwitch = async () => {
    if (switching) return;
    setSwitching(true);
    try {
      if (isSeeker) {
        if (hasProviderRole) await setActiveMode("provider");
        else setShowAddProvider(true);
      } else {
        await setActiveMode("seeker");
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleAddProvider = async () => {
    setSwitching(true);
    try {
      await addProviderRole(providerChoice);
      setShowAddProvider(false);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar (Без промяна) */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 transition-opacity hover:opacity-70 active:scale-95">
            <Home className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="text-sm sm:text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              HomeMatch<span className="text-primary">.bg</span>
            </span>
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1 text-xs sm:text-sm text-muted-foreground h-8 px-2 sm:px-3">
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Начална</span>
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="hidden sm:inline-flex gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Изход
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Welcome Section (Без промяна) */}
        <div>
          <h1 className="text-[1.35rem] font-bold leading-tight sm:text-2xl md:text-3xl">
            Здравейте, {profile.full_name || "потребител"}!
          </h1>
          <div className="mt-2 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <Badge variant={isSeeker ? "default" : "secondary"} className="text-[11px] sm:text-xs">
              {isSeeker ? "Режим: Търсещ" : `Режим: ${roleLabels[profile.role]}`}
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5 text-[11px] sm:text-xs h-7 sm:h-8" onClick={handleModeSwitch} disabled={switching}>
              <ArrowLeftRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {isSeeker ? (hasProviderRole ? "Към режим Предлагащ" : "Добави роля Предлагащ") : "Към режим Търсещ"}
            </Button>
          </div>
        </div>

        {/* Seeker Received Offers Summary (Без промяна) */}
        {isSeeker && seekerOfferStats && seekerOfferStats.total > 0 && (
          <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => navigate("/my-received-offers", navState("dashboard-seeker"))}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <Inbox className="h-4 w-4 text-primary" /> Получени оферти
                </h2>
                <span className="text-xs text-muted-foreground">{seekerOfferStats.total} общо</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2.5 sm:p-3">
                  <Clock className="h-4 w-4 mb-1 text-muted-foreground" />
                  <span className="text-lg sm:text-xl font-bold">{seekerOfferStats.pending}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Изчакващи</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-green-500/5 border border-green-500/20 p-2.5 sm:p-3">
                  <CheckCircle className="h-4 w-4 mb-1 text-green-600" />
                  <span className="text-lg sm:text-xl font-bold text-green-700">{seekerOfferStats.approved}</span>
                  <span className="text-[10px] sm:text-xs text-green-600/70">Одобрени</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-destructive/5 border border-destructive/20 p-2.5 sm:p-3">
                  <XCircle className="h-4 w-4 mb-1 text-destructive" />
                  <span className="text-lg sm:text-xl font-bold text-destructive">{seekerOfferStats.rejected}</span>
                  <span className="text-[10px] sm:text-xs text-destructive/70">Отхвърлени</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Broker Offer Summary (Без промяна) */}
        {isProvider && offerStats && offerStats.total > 0 && (
          <Card className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => navigate("/my-responses", navState("dashboard-provider"))}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  <Send className="h-4 w-4 text-primary" /> Преглед на оферти
                </h2>
                <span className="text-xs text-muted-foreground">{offerStats.total} общо</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="flex flex-col items-center rounded-lg bg-muted/50 p-2.5 sm:p-3">
                  <Clock className="h-4 w-4 mb-1 text-muted-foreground" />
                  <span className="text-lg sm:text-xl font-bold">{offerStats.pending}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Изчакващи</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-green-500/5 border border-green-500/20 p-2.5 sm:p-3">
                  <CheckCircle className="h-4 w-4 mb-1 text-green-600" />
                  <span className="text-lg sm:text-xl font-bold text-green-700">{offerStats.approved}</span>
                  <span className="text-[10px] sm:text-xs text-green-600/70">Одобрени</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-destructive/5 border border-destructive/20 p-2.5 sm:p-3">
                  <XCircle className="h-4 w-4 mb-1 text-destructive" />
                  <span className="text-lg sm:text-xl font-bold text-destructive">{offerStats.rejected}</span>
                  <span className="text-[10px] sm:text-xs text-destructive/70">Отхвърлени</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions (Без промяна) */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isSeeker && (
            <>
              <Card className="cursor-pointer border-primary/20 transition-colors hover:border-primary/40 hover:bg-primary/5" onClick={() => navigate("/requests/new", navState("dashboard-seeker"))}>
                <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-6">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Plus className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                  <div className="min-w-0"><h3 className="text-[0.9rem] sm:text-base font-bold">Нова заявка</h3><p className="text-[0.8rem] sm:text-sm text-muted-foreground">Опишете какво търсите</p></div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/my-requests", navState("dashboard-seeker"))}>
                <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-6">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Search className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                  <div className="min-w-0"><h3 className="text-[0.9rem] sm:text-base font-bold">Моите заявки</h3><p className="text-[0.8rem] sm:text-sm text-muted-foreground">Преглед на активни заявки</p></div>
                </CardContent>
              </Card>
            </>
          )}

          {isProvider && (
            <>
              <Card className="cursor-pointer border-primary/20 transition-colors hover:border-primary/40 hover:bg-primary/5" onClick={() => navigate("/browse", navState("dashboard-provider"))}>
                <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-6">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Search className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                  <div className="min-w-0"><h3 className="text-[0.9rem] sm:text-base font-bold">Разгледай заявки</h3><p className="text-[0.8rem] sm:text-sm text-muted-foreground">Намерете заявки и предложете имот</p></div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate("/properties", navState("dashboard-provider"))}>
                <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-6">
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Warehouse className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                  <div className="min-w-0"><h3 className="text-[0.9rem] sm:text-base font-bold">Моите имоти</h3><p className="text-[0.8rem] sm:text-sm text-muted-foreground">Запазени имоти за бързи оферти</p></div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

      </main>

      {/* Dialog за добавяне на роля (Без промяна) */}
      <Dialog open={showAddProvider} onOpenChange={setShowAddProvider}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавяне на роля Предлагащ</DialogTitle><DialogDescription>Изберете какъв тип предлагащ сте. Ще можете да превключвате между двата режима.</DialogDescription></DialogHeader>
          <RadioGroup value={providerChoice} onValueChange={(v) => setProviderChoice(v as "broker" | "owner")} className="space-y-2">
            <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${providerChoice === "owner" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}><RadioGroupItem value="owner" /><User className="h-5 w-5 text-primary" /><div><div className="font-medium text-sm">Частен собственик</div><div className="text-xs text-muted-foreground">Отдавам собствен имот</div></div></label>
            <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${providerChoice === "broker" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}><RadioGroupItem value="broker" /><Building2 className="h-5 w-5 text-primary" /><div><div className="font-medium text-sm">Брокер / Агенция</div><div className="text-xs text-muted-foreground">Представлявам агенция за недвижими имоти</div></div></label>
          </RadioGroup>
          <Button onClick={handleAddProvider} disabled={switching} className="w-full">{switching ? "Запазване..." : "Добави роля и превключи"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;