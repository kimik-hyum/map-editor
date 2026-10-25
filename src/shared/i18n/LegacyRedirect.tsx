import { Navigate, useLocation } from "react-router";
import { localizePath } from "./locale";

export function LegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const path = pathname.replace(/\/$/, "") === "/screen" ? "/editing" : pathname;
  return (
    <Navigate
      to={`${localizePath(path, "ko")}${search}${pathname === "/screen" && !hash ? "#screen" : hash}`}
      replace
    />
  );
}
