import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, MapPin, BedDouble, Building2, Ruler, Armchair,
  CheckCircle, XCircle, Phone, ChevronLeft, ChevronRight, ShieldAlert, Star
} from "lucide-react";
import ProviderProfileDialog from "@/components/ProviderProfileDialog";
import ProviderMiniCard from "@/components/ProviderMiniCard";
import PhotoLightbox from "@/components/PhotoLightbox";
import ReviewDialog from "@/components/ReviewDialog";

// --- Leaflet Imports ---
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { API_URL } from "@/lib/api";
import { ApiPhoto, Offer, ResponderProfile } from "@/types/api";

type ProviderTarget = ResponderProfile & { id: string };

const label = {
  property: (t: string) => t === "apartment" ? "Апартамент" : t === "house" ? "Къща" : "Без значение",
  rental: (t: string) => t === "long_term" ? "Дългосрочен" : t === "short_term" ? "Краткосрочен" : "Гъвкав",
  furnished: (t: string) => t === "yes" ? "Обзаведен" : t === "no" ? "Необзаведен" : "По договаряне",
};

const SeekerOfferDetail = () => {
  const { responseId } = useParams<{ responseId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const backNav = useBackNavigation({ fallbackLabel: "Оферти", fallbackPath: "/my-received-offers" });

  const [resp, setResp] = useState<Offer | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Gallery state
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Dialogs
  const [profileTarget, setProfileTarget] = useState<ProviderTarget | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ProviderTarget | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false); // <--- НОВ СТЕЙТ

  // Проверка дали вече сме оставили ревю на този брокер
  useEffect(() => {
    if (!user || !resp?.responder_id) return;
    const checkReview = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/reviews/check/${resp.responder_id}/${user.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHasReviewed(data.hasReviewed);
        }
      } catch (err) { console.error(err); }
    };
    checkReview();
  }, [user, resp?.responder_id]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const loadData = useCallback(async () => {
    if (!user || !responseId) return;

    try {
      const token = localStorage.getItem("token");
      // Използваме маршрута за Privacy Circle
      const res = await fetch(`${API_URL}/offers/seeker-view/${responseId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Not found");
      const data = await res.json();

      setResp(data);
      
      if (data.photos && data.photos.length > 0) {
        setPhotos(data.photos.map((p: ApiPhoto) => p.data));
      }
    } catch (err) {
      setResp(null);
    } finally {
      setLoading(false);
    }
  }, [user, responseId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleContact = async (action: "approve" | "reject") => {
    if (!user || !resp) return;
    setActionLoading(true);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/offers/${responseId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setResp({ ...resp, contact_status: newStatus });
        // Презареждаме данните, за да получим реалния телефон от бекенда
        if (action === "approve") loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // Gallery handlers
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null || photos.length <= 1) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setActivePhoto((p) => (p > 0 ? p - 1 : photos.length - 1));
      else setActivePhoto((p) => (p < photos.length - 1 ? p + 1 : 0));
    }
    setTouchStart(null);
  };

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Зареждане...</span></div>;
  if (!resp) return <div className="flex min-h-screen flex-col items-center justify-center gap-4"><span className="text-muted-foreground">Офертата не е намерена.</span><Button variant="outline" onClick={backNav.goBack}>Назад</Button></div>;

  const isApproved = resp.contact_status === "approved";
  const isRejected = resp.contact_status === "rejected";
  const isPending = resp.contact_status === "pending";

  // Leaflet изисква координатите във формат [Latitude, Longitude]
  const mapCenter: [number, number] = resp.location?.coordinates 
    ? [resp.location.coordinates[1], resp.location.coordinates[0]] 
    : [42.6977, 23.3219];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={backNav.goBack} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{backNav.label}</span>
          </button>
          <span className="text-sm font-bold">HomeMatch<span className="text-primary">.bg</span></span>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {photos.length > 0 && (
          <div className="space-y-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted cursor-pointer" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onClick={() => { setLightboxIndex(activePhoto); setLightboxOpen(true); }}>
              <img src={photos[activePhoto]} alt="Снимка" className="h-full w-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => (p > 0 ? p - 1 : photos.length - 1)); }} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hidden sm:flex"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => (p < photos.length - 1 ? p + 1 : 0)); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hidden sm:flex"><ChevronRight className="h-4 w-4" /></button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{resp.price} €/мес</h1>
          <div className="flex items-center gap-1.5">
            {isApproved && <Badge className="bg-green-500/10 text-green-600">Одобрена</Badge>}
            {isRejected && <Badge variant="destructive">Отхвърлена</Badge>}
            {isPending && <Badge variant="secondary">Изчакване</Badge>}
          </div>
        </div>

        {resp.responder_profile && (
          <ProviderMiniCard 
            provider={resp.responder_profile} 
            providerId={resp.responder_id} 
            onClick={() => setProfileTarget({ ...resp.responder_profile, id: resp.responder_id })} 
          />
        )}

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-bold">Детайли за имота</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span>{label.property(resp.property_type)}</span></div>
              <div className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-muted-foreground" /><span>{resp.bedrooms} стаи</span></div>
              <div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-muted-foreground" /><span>{resp.size_sqm} м²</span></div>
              <div className="flex items-center gap-2"><Armchair className="h-4 w-4 text-muted-foreground" /><span>{label.furnished(resp.furnished)}</span></div>
            </div>
            <div className="flex items-center gap-2 text-sm pt-2 border-t"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{resp.approx_location}</span></div>
          </CardContent>
        </Card>

        {/* ========================================== */}
        {/* GEOSPATIAL MAP / ПЕРМАНЕНТЕН PRIVACY CIRCLE*/}
        {/* ========================================== */}
        <Card className="overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2 bg-amber-500/10 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-xs font-bold">
              Ориентировъчна локация (Радиус 500м)
            </span>
          </div>
          
          <div className="h-[250px] w-full bg-muted relative z-0">
            <MapContainer center={mapCenter} zoom={14} className="h-full w-full" scrollWheelZoom={false}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <Circle 
                center={mapCenter} 
                radius={500} 
                pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.3 }} 
              />
            </MapContainer>
          </div>
          <div className="p-3 bg-muted/30 text-xs text-muted-foreground text-center">
            Точният адрес се уточнява с брокера по телефона.
          </div>
        </Card>

        <Card><CardContent className="p-5"><h3 className="text-sm font-bold mb-2">Описание</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{resp.description}</p></CardContent></Card>

        {isApproved && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Контакт отключен</span>
                </div>
                {resp.responder_profile?.phone && (
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4" /> {resp.responder_profile.phone}
                  </p>
                )}
              </div>
              
              {/* БУТОН ИЛИ СЪОБЩЕНИЕ ЗА ОЦЕНКА */}
              <div className="pt-3 border-t border-green-500/20">
                {hasReviewed ? (
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-amber-700 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    Вече сте оценили този брокер
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 bg-white hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors"
                    onClick={() => setReviewTarget({ ...resp.responder_profile, id: resp.responder_id })}
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" /> 
                    Оцени брокера
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isPending && (
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={() => handleContact("approve")} disabled={actionLoading}><CheckCircle className="h-4 w-4" /> Одобри и виж телефон</Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => handleContact("reject")} disabled={actionLoading}><XCircle className="h-4 w-4" /> Отхвърли</Button>
          </div>
        )}
      </main>

      <PhotoLightbox photos={photos} initialIndex={lightboxIndex} open={lightboxOpen} onOpenChange={setLightboxOpen} />
      
      {profileTarget && (
        <ProviderProfileDialog 
          open={!!profileTarget} 
          onOpenChange={(open) => !open && setProfileTarget(null)} 
          provider={profileTarget} 
          providerId={profileTarget.id} 
        />
      )}
      
      {reviewTarget && (
        <ReviewDialog 
          open={!!reviewTarget} 
          onOpenChange={(open) => !open && setReviewTarget(null)} 
          providerId={reviewTarget.id}
          responseId={responseId}
        />
      )}
    </div>
  );
};

export default SeekerOfferDetail;

