# CLAUDE.md

이 저장소의 작업 규칙·결정 사항은 `AGENTS.MD`에 정리되어 있습니다.
Claude는 `AGENTS.MD`를 기본으로 읽지 않으므로, 아래 import로 항상 읽어 들입니다.
모든 작업은 이 규칙(커밋 컨벤션, 라이브러리 결정, 디자인 토큰, 상태 관리 원칙 등)을 따릅니다.

특히 커밋 메시지는 Conventional Commit 타입을 쓰되, **타입 뒤 본문에 영문 알파벳을 넣지 않습니다**(Husky `commit-msg` 훅이 거부). 자세한 규칙은 아래 문서를 참고하세요.

하위 디렉터리의 도메인 규칙은 각 위치의 `CLAUDE.md`가 같은 위치의 `AGENTS.MD`를 참조합니다. 예: `src/pages/editor/CLAUDE.md`.

## 전역 규칙

@AGENTS.MD
