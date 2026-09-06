import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// 라우트(pathname) 전환 시 지정된 섹션 또는 페이지 맨 위로 이동합니다.
// 같은 페이지 안 #앵커 이동(해시만 변경)에는 개입하지 않고,
// 첫 로드는 건너뛰어 #해시로 진입했을 때의 브라우저 기본 스크롤을 살립니다.
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const previousPathname = useRef(pathname);

  useIsomorphicLayoutEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;
    const section = hash ? document.getElementById(hash.slice(1)) : null;
    if (section) {
      section.scrollIntoView({ block: "start", behavior: "instant" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
