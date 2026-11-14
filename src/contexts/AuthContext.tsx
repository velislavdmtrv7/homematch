import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";

import { API_URL } from "@/lib/api";

export type ActiveMode = "seeker" | "provider";

export interface User {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: "seeker" | "broker" | "owner";
  phone?: string | null;
  provider_type?: "agency" | "freelance" | "broker" | "owner" | null;
}

interface AuthContextType {
  session: any | null; // Оставяме го за обратна съвместимост, въпреки че ползваме JWT
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  activeMode: ActiveMode;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, meta: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setActiveMode: (mode: ActiveMode) => Promise<void>;
  addProviderRole: (providerType: "broker" | "owner") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveModeState] = useState<ActiveMode>("seeker");

  // Проверка при първоначално зареждане
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    const savedMode = localStorage.getItem("activeMode") as ActiveMode;

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser({ id: parsedUser._id, email: parsedUser.email });
        setProfile({
          id: parsedUser._id,
          full_name: parsedUser.full_name,
          role: parsedUser.role,
          phone: parsedUser.phone,
          provider_type: parsedUser.provider_type,
        });
        
        if (savedMode) {
          setActiveModeState(savedMode);
        } else if (parsedUser.role === "broker" || parsedUser.role === "owner") {
          setActiveModeState("provider");
        }
      } catch (err) {
        console.error("Грешка при четене на сесията:", err);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, pass: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Грешка при вход");

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    setUser({ id: data.user._id, email: data.user.email });
    setProfile({ ...data.user, id: data.user._id });
    
    if (data.user.role === "broker" || data.user.role === "owner") {
      setActiveModeState("provider");
      localStorage.setItem("activeMode", "provider");
    } else {
      setActiveModeState("seeker");
      localStorage.setItem("activeMode", "seeker");
    }
  };

  const signUp = async (email: string, pass: string, meta: any) => {
    const payload = {
      email,
      password: pass,
      full_name: meta.full_name,
      role: meta.role,
      provider_type: meta.provider_type || null
    };

    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Грешка при регистрация");

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    setUser({ id: data.user._id, email: data.user.email });
    setProfile({ ...data.user, id: data.user._id });

    if (data.user.role === "broker" || data.user.role === "owner") {
      setActiveModeState("provider");
      localStorage.setItem("activeMode", "provider");
    } else {
      setActiveModeState("seeker");
      localStorage.setItem("activeMode", "seeker");
    }
  };

  const signOut = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeMode");
    setUser(null);
    setProfile(null);
    setActiveModeState("seeker");
  };

  const refreshProfile = async () => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setProfile({ ...parsedUser, id: parsedUser._id });
      } catch (err) {}
    }
  };

  const setActiveMode = async (mode: ActiveMode) => {
    setActiveModeState(mode);
    localStorage.setItem("activeMode", mode);
  };

  const addProviderRole = async (providerType: "broker" | "owner") => {
    if (profile) {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/auth/profile/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: profile.full_name,
          phone: profile.phone,
          role: providerType,
          provider_type: providerType
        })
      });

      const updatedData = await res.json();
      if (!res.ok) throw new Error(updatedData.error || "Грешка при обновяване на ролята");

      const updated = { ...updatedData, id: updatedData._id };
      setProfile(updated as Profile);
      localStorage.setItem("user", JSON.stringify(updatedData));
      setActiveModeState("provider");
      localStorage.setItem("activeMode", "provider");
      toast.success("Ролята е обновена!");
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        session: user ? { access_token: localStorage.getItem("token") } : null, 
        user, 
        profile, 
        loading, 
        activeMode, 
        signIn, 
        signUp, 
        signOut, 
        refreshProfile, 
        setActiveMode, 
        addProviderRole 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

