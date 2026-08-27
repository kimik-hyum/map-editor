import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

// 라우트(pathname) 전환 시 페이지를 즉시 맨 위로 되돌립니다.
// 같은 페이지 안 #앵커 이동(해시만 변경)에는 개입하지 않고,
// 첫 로드는 건너뛰어 #해시로 진입했을 때의 브라우저 기본 스크롤을 살립니다.
export function ScrollToTop() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
