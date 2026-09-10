import type { User } from "@supabase/supabase-js";

export function isGoogleUser(user: User | null): boolean {
  if (!user) {
    return false;
  }

  const providers = Array.isArray(user.app_metadata.providers)
    ? user.app_metadata.providers
    : [];

  return user.app_metadata.provider === "google" || providers.includes("google");
}
