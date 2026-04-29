import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Origin keys used in router location state to enable context-aware back navigation.
 * Pass { from: OriginKey } in navigate state when linking to detail/nested pages.
 */
export type OriginKey =
  | "dashboard-seeker"
  | "dashboard-provider"
  | "my-requests"
  | "received-offers"
  | "sent-offers"
  | "saved-properties"
  | "notifications"
  | "browse"
  | "request-detail";

const ORIGIN_LABELS: Record<OriginKey, string> = {
  "dashboard-seeker": "Табло",
  "dashboard-provider": "Табло",
  "my-requests": "Моите заявки",
  "received-offers": "Получени оферти",
  "sent-offers": "Моите оферти",
  "saved-properties": "Моите имоти",
  "notifications": "Известия",
  "browse": "Заявки",
  "request-detail": "Към заявката",
};

const ORIGIN_PATHS: Record<OriginKey, string> = {
  "dashboard-seeker": "/dashboard",
  "dashboard-provider": "/dashboard",
  "my-requests": "/my-requests",
  "received-offers": "/my-received-offers",
  "sent-offers": "/my-responses",
  "saved-properties": "/properties",
  "notifications": "/notifications",
  "browse": "/browse",
  "request-detail": "/dashboard", // fallback, typically overridden
};

interface BackNavigation {
  label: string;
  goBack: () => void;
}

/**
 * Hook that reads `state.from` from router location and returns the correct
 * back label + handler. Falls back to the provided defaults.
 */
export function useBackNavigation(defaults: {
  fallbackLabel: string;
  fallbackPath: string;
}): BackNavigation {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeMode } = useAuth();

  const state = location.state as { from?: OriginKey; fromPath?: string } | null;
  const origin = state?.from;
  const customPath = state?.fromPath;

  if (origin && ORIGIN_LABELS[origin]) {
    const targetPath = customPath || ORIGIN_PATHS[origin];
    return {
      label: ORIGIN_LABELS[origin],
      goBack: () => navigate(targetPath, { state: { restoreScroll: true, from: origin } }),
    };
  }

  // No origin in state — use fallback
  return {
    label: defaults.fallbackLabel,
    goBack: () => navigate(defaults.fallbackPath),
  };
}

/**
 * Helper to build navigation state object for passing origin context.
 */
export function navState(from: OriginKey, fromPath?: string) {
  return { state: { from, fromPath } };
}
