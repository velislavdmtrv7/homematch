import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Home, Pencil, ImageIcon, Trash2 } from "lucide-react";

import { API_URL } from "@/lib/api";
import { errorMessage, ApiPhoto } from "@/types/api";

interface SavedProperty {
  _id: string;
  price: number;
  property_type: string;
  rental_type: string;
  bedrooms: number;
  size_sqm: number;
  furnished: string;
  approx_location: string;
  description: string;
  status: string;
  createdAt: string;
  photos?: ApiPhoto[];
  cover_url?: string;
}

const MyProperties = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, activeMode } = useAuth();
  const [properties, setProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || activeMode !== "provider")) navigate("/dashboard");
  }, [authLoading, user, activeMode, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/properties/saved/user/${user.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Грешка при зареждане");
        const data = await res.json();

        // Изваждаме cover снимката от масива photos
        const formattedData = data.map((p: SavedProperty) => {
          const coverPhoto = p.photos?.find((photo: ApiPhoto) => photo.is_cover)?.data;
          return { ...p, cover_url: coverPhoto };
        });

        setProperties(formattedData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "active" ? "inactive" : "active";
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/properties/saved/${id}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error("Грешка при промяна на статуса");
      
      setProperties((prev) => prev.map((p) => p._id === id ? { ...p, status: newStatus } : p));
      toast.success(newStatus === "active" ? "Имотът е активен" : "Имотът е неактивен");
    } catch (err) {
      toast.error("Грешка при промяна на статуса");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/properties/saved/${deleteTarget}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Грешка при изтриване");

      setProperties((prev) => prev.filter((p) => p._id !== deleteTarget));
      toast.success("Имотът е изтрит");
    } catch (e) {
      toast.error(errorMessage(e, "Грешка при изтриване"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const propertyTypeLabel: Record<string, string> = {
    apartment: "Апартамент", house: "Къща", either: "Друго",
  };
  const furnishedLabel: Record<string, string> = {
    yes: "Обзаведен", no: "Необзаведен", flexible: "По договаряне",
  };

  if (authLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground">Зареждане...</span></div>;
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

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Моите имоти</h1>
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/properties/new")}>
            <Plus className="h-4 w-4" /> Добави имот
          </Button>
        </div>

        {properties.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Home className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Все още нямате запазени имоти.</p>
              <Button size="sm" variant="outline" onClick={() => navigate("/properties/new")}>
                <Plus className="h-4 w-4 mr-1" /> Добави първия имот
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {properties.map((p) => (
              <Card key={p._id} className={p.status === "inactive" ? "opacity-60" : ""}>
                <CardContent className="p-0">
                  <div className="flex gap-3 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                      {p.cover_url ? (
                        <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold">{p.price} €/мес</p>
                          <p className="text-xs text-muted-foreground truncate">{p.approx_location}</p>
                        </div>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {p.status === "active" ? "Активен" : "Неактивен"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        <span>{propertyTypeLabel[p.property_type] || p.property_type}</span>
                        <span>·</span>
                        <span>{p.bedrooms} стаи</span>
                        <span>·</span>
                        <span>{p.size_sqm} м²</span>
                        <span>·</span>
                        <span>{furnishedLabel[p.furnished] || p.furnished}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={p.status === "active"}
                        onCheckedChange={() => toggleStatus(p._id, p.status)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {p.status === "active" ? "Активен" : "Неактивен"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate(`/properties/${p._id}/edit`)}>
                        <Pencil className="h-3.5 w-3.5" /> Редактирай
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтриване на имот</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете този имот? Това действие е необратимо.
              {"\n\n"}Оферти в статус „изчакване" или „отхвърлена" ще бъдат премахнати заедно с имота. Одобрени оферти ще бъдат запазени като исторически данни.
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

export default MyProperties;

