import { t } from "@/shared/i18n/i18n";
import { useContext } from "react";
import { authContext } from "../model/authContext";

export function useAuth() {
  const value = useContext(authContext);
  if (!value) {
    throw new Error(t("useAuth는 AuthProvider 안에서만 사용할 수 있습니다."));
  }
  return value;
}
