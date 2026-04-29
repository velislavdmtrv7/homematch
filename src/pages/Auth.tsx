import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Home, Building2, User, ArrowLeft } from "lucide-react";

// Дефинираме ролите локално, вместо да ги дърпаме от Supabase
type UserRole = "seeker" | "broker" | "owner";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp } = useAuth();
  
  const initialMode = searchParams.get("mode") || "login";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(
    initialMode === "signup" ? "signup" : initialMode === "forgot" ? "forgot" : "login"
  );

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "signup") setMode("signup");
    else if (m === "forgot") setMode("forgot");
    else setMode("login");
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("seeker");
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "forgot") {
        toast.info("Функцията за забравена парола ще бъде добавена скоро.");
        setResetSent(true);
      } else if (mode === "login") {
        await signIn(email, password);
        toast.success("Успешен вход!");
        navigate("/dashboard");
      } else {
        if (!fullName.trim()) {
          toast.error("Моля, въведете вашето име");
          setLoading(false);
          return;
        }
        await signUp(email, password, { full_name: fullName, role });
        toast.success("Регистрацията е успешна!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Възникна грешка");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: { value: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: "seeker", label: "Търсещ жилище", icon: <Home className="h-5 w-5" />, desc: "Търся апартамент или къща под наем" },
    { value: "broker", label: "Брокер / Агенция", icon: <Building2 className="h-5 w-5" />, desc: "Представлявам агенция за недвижими имоти" },
    { value: "owner", label: "Частен собственик", icon: <User className="h-5 w-5" />, desc: "Отдавам собствен имот" },
  ];

  const title = mode === "forgot" ? "Забравена парола" : mode === "login" ? "Вход в HomeMatch" : "Регистрация в HomeMatch";
  const description = mode === "forgot"
    ? "Въведете имейла си и ще ви изпратим линк за нулиране на паролата"
    : mode === "login" ? "Влезте в акаунта си" : "Създайте акаунт, за да започнете";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Начало
        </Button>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "forgot" && resetSent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Ако съществува акаунт с имейл <span className="font-medium text-foreground">{email}</span>, ще получите линк за нулиране на паролата.
                </p>
                <Button variant="outline" onClick={() => { setResetSent(false); navigate("/auth?mode=login"); }}>
                  Обратно към вход
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Пълно име</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Иван Иванов"
                        required
                        maxLength={100}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Вие сте:</Label>
                      <RadioGroup value={role} onValueChange={(v) => setRole(v as UserRole)}>
                        {roleOptions.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                              role === opt.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/30"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} />
                            <div className="flex items-center gap-2 text-primary">
                              {opt.icon}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.desc}</div>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Имейл</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ivan@example.com"
                    required
                    maxLength={255}
                  />
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Парола</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Зареждане..." : mode === "forgot" ? "Изпрати линк" : mode === "login" ? "Вход" : "Регистрация"}
                </Button>
              </form>
            )}

            <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
              {mode === "login" && (
                <>
                  <div>
                    <button
                      type="button"
                      onClick={() => navigate("/auth?mode=forgot")}
                      className="text-primary hover:underline"
                    >
                      Забравена парола?
                    </button>
                  </div>
                  <div>
                    Нямате акаунт?{" "}
                    <button type="button" onClick={() => navigate("/auth?mode=signup")} className="font-medium text-primary hover:underline">
                      Регистрирайте се
                    </button>
                  </div>
                </>
              )}
              {mode === "signup" && (
                <div>
                  Вече имате акаунт?{" "}
                  <button type="button" onClick={() => navigate("/auth?mode=login")} className="font-medium text-primary hover:underline">
                    Влезте
                  </button>
                </div>
              )}
              {mode === "forgot" && !resetSent && (
                <div>
                  <button type="button" onClick={() => navigate("/auth?mode=login")} className="font-medium text-primary hover:underline">
                    Обратно към вход
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;