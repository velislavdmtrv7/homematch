import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, ImagePlus, X, Star, ChevronLeft, ChevronRight, MapPin, Loader2, MousePointerClick } from "lucide-react";

// --- Leaflet Imports ---
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Фикс за иконките на Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import { API_URL } from "@/lib/api";
const MAX_PHOTOS = 8;
const DEFAULT_CENTER: [number, number] = [42.6977, 23.3219]; // София център

type PropertyType = "apartment" | "house" | "either";
type RentalType = "long_term" | "short_term" | "flexible";
type FurnishedType = "yes" | "no" | "flexible";

interface PhotoItem {
  file?: File;
  preview: string;
  isCover: boolean;
  data?: string; 
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

// Компонент за хващане на клик върху картата
const LocationMarker = ({ position, setPosition }: { position: L.LatLng | null, setPosition: (pos: L.LatLng) => void }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : <Marker position={position} />;
};

// Компонент за автоматично центриране
const ChangeView = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
};

const SavedPropertyForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { user, loading: authLoading, activeMode } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);

  // Форма - основни полета
  const [price, setPrice] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("apartment");
  const [rentalType, setRentalType] = useState<RentalType>("long_term");
  const [bedrooms, setBedrooms] = useState("1");
  const [sizeSqm, setSizeSqm] = useState("");
  const [furnished, setFurnished] = useState<FurnishedType>("yes");
  const [approxLocation, setApproxLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Geospatial State
  const [mapPosition, setMapPosition] = useState<L.LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || activeMode !== "provider")) navigate("/dashboard");
  }, [authLoading, user, activeMode, navigate]);

  useEffect(() => {
    if (!isEdit || !user) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/properties/saved/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Имотът не е намерен");
        const prop = await res.json();

        setPrice(String(prop.price));
        setPropertyType(prop.property_type);
        setRentalType(prop.rental_type);
        setBedrooms(String(prop.bedrooms));
        setSizeSqm(String(prop.size_sqm));
        setFurnished(prop.furnished);
        setApproxLocation(prop.approx_location);
        setDescription(prop.description);

        // Зареждане на координатите върху картата
        if (prop.location && prop.location.coordinates) {
          const latLng = new L.LatLng(prop.location.coordinates[1], prop.location.coordinates[0]);
          setMapPosition(latLng);
          setMapCenter([latLng.lat, latLng.lng]);
        }

        if (prop.photos && prop.photos.length > 0) {
          const mapped: PhotoItem[] = prop.photos.map((ph: any) => ({
            preview: ph.data,
            isCover: ph.is_cover,
            data: ph.data
          }));
          setPhotos(mapped);
        }
      } catch (err) {
        toast.error("Имотът не е намерен");
        navigate("/properties");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [isEdit, id, user, navigate]);

  useEffect(() => {
    if (!isEdit) setLoadingData(false);
  }, [isEdit]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Браузърът ви не поддържа геолокация");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
        setMapPosition(newPos);
        setMapCenter([newPos.lat, newPos.lng]);
        setIsLocating(false);
        toast.success("Локацията е фиксирана успешно!");
      },
      (err) => {
        setIsLocating(false);
        toast.error("Неуспешно взимане на локация. Моля, маркирайте ръчно на картата.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const available = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, available).map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      isCover: photos.length === 0 && i === 0,
    }));
    setPhotos((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (prev[index].isCover && updated.length > 0) updated[0] = { ...updated[0], isCover: true };
      return updated;
    });
  };

  const setCover = (index: number) => {
    setPhotos((prev) => prev.map((p, i) => ({ ...p, isCover: i === index })));
  };

  const movePhoto = (index: number, direction: "left" | "right") => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPhotos.length) return prev;
      [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
      return newPhotos;
    });
  };

  const validate = (): string | null => {
    if (!price || Number(price) <= 0) return "Въведете валидна цена";
    if (!sizeSqm || Number(sizeSqm) <= 0) return "Въведете валидна площ";
    if (!approxLocation.trim()) return "Въведете приблизителна локация";
    if (!mapPosition) return "Моля, кликнете върху картата, за да маркирате локацията на имота";
    if (!description.trim() || description.trim().length < 10) return "Описанието трябва да е поне 10 символа";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);

    try {
      const base64Photos = await Promise.all(photos.map(async (p) => {
        const base64 = p.file ? await toBase64(p.file) : p.data;
        return { data: base64, is_cover: p.isCover };
      }));

      const payload = {
        provider_id: user!.id,
        price: Number(price),
        property_type: propertyType,
        rental_type: rentalType,
        bedrooms: Number(bedrooms),
        size_sqm: Number(sizeSqm),
        furnished,
        approx_location: approxLocation.trim(),
        description: description.trim(),
        status: "active",
        photos: base64Photos,
        location: {
          type: "Point",
          coordinates: [Number(mapPosition!.lng.toFixed(6)), Number(mapPosition!.lat.toFixed(6))]
        }
      };

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

      let propertyId = id;

      if (isEdit) {
        const res = await fetch(`${API_URL}/properties/saved/${id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Грешка при обновяване");
      } else {
        const res = await fetch(`${API_URL}/properties/saved`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Грешка при създаване на имот.");
        const data = await res.json();
        propertyId = data._id;
      }

      toast.success(isEdit ? "Имотът е обновен!" : "Имотът е запазен успешно!");
      if (returnTo && propertyId) {
        navigate(`${returnTo}?selectProperty=${propertyId}`);
      } else {
        navigate("/properties");
      }
    } catch (error: any) {
      toast.error(error.message || "Грешка при запазване");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingData) return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Зареждане...</span></div>;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button onClick={() => returnTo ? navigate(returnTo) : navigate("/properties")} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{returnTo ? "Към изпращане" : "Моите имоти"}</span>
          </button>
          <span className="text-sm font-bold">HomeMatch<span className="text-primary">.bg</span></span>
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-4">
        <h1 className="text-xl font-bold">{isEdit ? "Редактирай имот" : "Нов имот"}</h1>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Цена (€/мес) *</Label>
                <Input type="number" placeholder="напр. 600" value={price} onChange={(e) => setPrice(e.target.value)} min={1} />
              </div>
              <div className="space-y-1">
                <Label>Площ (м²) *</Label>
                <Input type="number" placeholder="напр. 65" value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value)} min={1} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Тип имот *</Label>
              <RadioGroup value={propertyType} onValueChange={(v) => setPropertyType(v as PropertyType)} className="grid grid-cols-3 gap-2">
                {[{ value: "apartment", label: "Апартамент" }, { value: "house", label: "Къща" }, { value: "either", label: "Друго" }].map((opt) => (
                  <label key={opt.value} className={`flex cursor-pointer items-center justify-center rounded-lg border p-2.5 text-center text-sm font-medium transition-colors ${propertyType === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value={opt.value} className="sr-only" />{opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1">
              <Label>Вид наем *</Label>
              <RadioGroup value={rentalType} onValueChange={(v) => setRentalType(v as RentalType)} className="grid grid-cols-3 gap-2">
                {[{ value: "long_term", label: "Дългосрочен" }, { value: "short_term", label: "Краткосрочен" }, { value: "flexible", label: "Гъвкав" }].map((opt) => (
                  <label key={opt.value} className={`flex cursor-pointer items-center justify-center rounded-lg border p-2.5 text-center text-sm font-medium transition-colors ${rentalType === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}>
                    <RadioGroupItem value={opt.value} className="sr-only" />{opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Стаи *</Label>
                <Select value={bedrooms} onValueChange={setBedrooms}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["1", "2", "3", "4", "5"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Обзавеждане *</Label>
                <Select value={furnished} onValueChange={(v) => setFurnished(v as FurnishedType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Обзаведен</SelectItem>
                    <SelectItem value="no">Необзаведен</SelectItem>
                    <SelectItem value="flexible">По договаряне</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ========================================== */}
            {/* ИНТЕРАКТИВНА КАРТА ЗА БРОКЕРА              */}
            {/* ========================================== */}
            <div className="space-y-3 pt-4 pb-2 border-t border-border mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" /> Точна локация
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGetCurrentLocation} disabled={isLocating} className="h-8 text-xs gap-1.5">
                  {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <MousePointerClick className="h-3 w-3" />}
                  Намери ме
                </Button>
              </div>
              
              <div className="rounded-lg bg-primary/5 p-3 border border-primary/20">
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                  <strong className="text-foreground">Кликнете върху картата</strong>, за да сложите карфица на адреса на имота. Клиентите ще виждат само <strong className="text-foreground">размит кръг (500м)</strong> докато не одобрят офертата.
                </p>

                <div className="h-[250px] w-full rounded-md overflow-hidden border border-border/50 relative z-0">
                  <MapContainer center={mapCenter} zoom={13} className="h-full w-full" scrollWheelZoom={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <ChangeView center={mapCenter} />
                    <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                  </MapContainer>
                </div>
              </div>
            </div>

            <div className="space-y-1 mt-2">
              <Label>Приблизителна локация / район (Текст) *</Label>
              <Input placeholder="напр. кв. Лозенец, ул. Черни връх" value={approxLocation} onChange={(e) => setApproxLocation(e.target.value)} maxLength={200} />
            </div>

            <div className="space-y-1">
              <Label>Описание *</Label>
              <Textarea placeholder="Опишете имота..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
              <p className="text-[10px] text-muted-foreground">{description.length}/2000 (мин. 10)</p>
            </div>
          </CardContent>
        </Card>

        {/* СНИМКИ */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Снимки</Label>
              <span className="text-xs text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {photos.map((photo, i) => (
                  <div key={i} className={`relative overflow-hidden rounded-xl border-2 transition-all ${photo.isCover ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                    <div className="aspect-square">
                      <img src={photo.preview} alt={`Снимка ${i + 1}`} className="h-full w-full object-cover" />
                    </div>

                    {photo.isCover && (
                      <Badge className="absolute left-1.5 top-1.5 gap-0.5 text-[9px] px-1.5 py-0.5"><Star className="h-2.5 w-2.5" /> Cover</Badge>
                    )}

                    <div className="grid grid-cols-4 bg-background/90 backdrop-blur-sm border-t border-border/50">
                      <button type="button" onClick={() => movePhoto(i, "left")} disabled={i === 0} className="flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => movePhoto(i, "right")} disabled={i === photos.length - 1} className="flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setCover(i)} disabled={photo.isCover} className={`flex items-center justify-center p-1.5 ${photo.isCover ? "text-primary opacity-60 cursor-default" : "text-muted-foreground hover:text-primary"}`}><Star className={`h-3.5 w-3.5 ${photo.isCover ? "fill-primary" : ""}`} /></button>
                      <button type="button" onClick={() => removePhoto(i)} className="flex items-center justify-center p-1.5 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {photos.length < MAX_PHOTOS && (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
                <ImagePlus className="h-5 w-5" /> Добави снимки
              </button>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
          </CardContent>
        </Card>

        <Button className="w-full gap-2" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Запазване..." : isEdit ? "Обнови имот" : "Запази имот"}
          <Save className="h-4 w-4" />
        </Button>
      </main>
    </div>
  );
};

export default SavedPropertyForm;
