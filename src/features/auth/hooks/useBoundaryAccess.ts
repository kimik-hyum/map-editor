import { isE2eAuthBypassed } from "../api/supabaseClient";
import { isGoogleUser } from "../model/googleIdentity";
import { useAuth } from "./useAuth";

export function useBoundaryAccess() {
  const { isLoading, user } = useAuth();
  const bypassed = isE2eAuthBypassed();
  const allowed = bypassed || (!isLoading && isGoogleUser(user));
  return {
    allowed,
    subject: allowed ? (bypassed ? "e2e" : (user?.id ?? null)) : null,
  };
}
