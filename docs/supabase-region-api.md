# 경계 데이터 API·인증

부모 서비스는 이 API를 직접 호출할 필요가 없습니다. 에디터가 Google 세션으로 경계를 조회하고, 사용자가 채택한 도형만 최종 scene으로 반환합니다. 서버 함수·마이그레이션은 별도 Supabase 프로젝트에서 관리합니다.

## 접근 흐름

1. 비로그인으로 일반 편집과 부모 메시지 왕복을 허용합니다.
2. 경계 선택 시 로그인 안내 → 별도 Google PKCE 팝업 → `/auth/callback` 복귀를 처리합니다.
3. 에디터가 세션 access token으로 `POST /functions/v1/regions`를 호출합니다.
4. 서버가 JWT·Google identity·에디터 origin·선택적 계정 허용 목록·호출량을 검사합니다.
5. 서버 내부 권한으로 카탈로그·지역 RPC를 읽습니다. 브라우저의 테이블 SELECT와 RPC 직접 호출은 금지합니다.

로그인 취소·실패에도 기존 편집은 유지합니다. 새 INIT이나 편집·도구 변경 중에는 이전 로그인 후 도구 전환을 취소합니다. 로그아웃 시 참고 경계만 숨기고 이미 채택한 scene 도형은 보존합니다.

## 요청 계약

헤더는 `Content-Type: application/json`, `apikey: <publishable key>`, `Authorization: Bearer <사용자 access token>`입니다. 실제 값은 소스에 넣지 않습니다.

| operation      | 본문 필드                                           | 응답                                                            |
| -------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `kinds`        | `country`                                           | 종류 목록: kind, label, level, min_zoom, sort_order, selectable |
| `byView`       | country, kind, minLng, minLat, maxLng, maxLat, zoom | FeatureCollection + country/kind/level/truncated                |
| `byId`         | `boundaryId`                                        | 표시된 행의 원본 Feature 또는 null                              |
| `byCode`       | country, kind, code                                 | 현재 버전의 원본 Feature 또는 null                              |
| `tileManifest` | country                                             | 활성 캐시 버전·표시 정책·데이터가 있는 고정 XYZ 좌표            |
| `byTile`       | country, kind, version, zoom, z, x, y               | 표시용 FeatureCollection + cache(version/profile/z/x/y/status)  |

```json
{
  "operation": "byView",
  "country": "KR",
  "kind": "adminDong",
  "minLng": 126.9,
  "minLat": 37.5,
  "maxLng": 127.1,
  "maxLat": 37.7,
  "zoom": 12
}
```

HTTP 상태: **401** 세션 누락·무효, **403** origin·계정 정책 거부, **409** 타일 버전 변경(메타데이터 재조회), **422** 불완전한 타일 응답(캐시하지 않음), **429** 호출량 초과. 오류 응답이나 데이터 없음은 공개 테이블 직접 조회로 우회하지 않습니다.

호출·응답 검증의 기준: [regionsApi.ts](../src/pages/editor/features/regions/api/regionsApi.ts). 세션 헤더 생성: [supabaseClient.ts](../src/features/auth/api/supabaseClient.ts).

## 표시와 편집을 구분합니다

- 응답·scene 좌표는 WGS84(4326), 지도 내부는 Web Mercator(3857)입니다.
- 서버 카탈로그가 종류와 최소 줌을 정합니다. 낮은 줌에서는 상위 시군구처럼 선택 불가능한 표시용 종류가 반환될 수 있습니다.
- `byView`·`byTile`은 표시용 단순화 geometry입니다. `truncated: true`면 범위를 줄이거나 확대하며, 타일 캐시에는 불완전한 응답을 저장하지 않습니다.
- 채택·union·difference는 표시된 `Feature.id`의 `byId` 원본을 다시 조회합니다.
- 원격 경계는 TanStack Query와 별도 지도 레이어에만 존재합니다. 사용자가 채택한 geometry만 Zustand scene으로 복사합니다.
- 캐시 키에 인증 사용자 ID를 포함합니다. 인증·세션·편집 맥락이 바뀐 뒤 늦게 도착한 연산을 적용하지 않습니다.

### 줌 10 이하의 영속 타일 캐시

- **표시 줌 0~10:** `tileManifest`로 활성 버전/coverage를 읽고 고정 타일을 `byTile`로 요청합니다. 타일 줌은 `max(6, 표시 줌-1)`로, 줌7~10에서는 512 CSS px 상당입니다. 줌0~6도 XYZ6을 공유합니다. 데이터 없는 바다 타일은 요청하지 않습니다.
- **표시 줌 11 이상:** 기존 단일 `byView` 요청과 30분 브라우저 캐시를 그대로 사용합니다. 서버 영속 캐시에 저장하지 않습니다.
- 서버는 현재 버전의 전체 시군구 응답을 DB에 저장하고 다음 조회부터 geometry 계산 없이 반환합니다. 시간 TTL은 없으며 원본/카탈로그 변경 시 새 revision으로 전환하고 이전 캐시만 자동 삭제합니다. 같은 기준일의 정정도 구분합니다. 캐시 조회 전에도 Google 인증/권한/호출량 검사를 수행합니다.
- 브라우저 타일 캐시는 버전·출력 profile·z/x/y·인증 사용자별로 30분 유지합니다. 낮은 줌의 실제 반환 종류가 같은 메뉴는 타일을 공유합니다. 메타데이터는 활성 상태에서 1분 간격으로 갱신하고 409 발생 시 즉시 다시 읽습니다. 서로 다른 버전은 한 레이어에 합치지 않습니다.
- 편집기 탭 안의 표시 요청은 **최대 2개**만 동시에 실행합니다. 각 응답을 받은 즉시 ID 중복을 제거해 표시합니다. 지도 이동 시작, 종류 변경, 경계 숨김, 로그아웃 시 진행 중/대기 중 조회를 취소합니다. 같은 종류·줌·버전으로 이동할 때는 첫 새 응답이 올 때까지 기존 경계를 유지합니다.
- 부분 실패가 나도 받은 경계는 남깁니다. 네트워크 오류/서버 5xx는 해당 조각만 1회 자동 재시도하며, 401·403·429는 자동 재시도하지 않습니다. 완료 후 실패 조각만 다시 요청하는 버튼을 제공합니다. 각 실제 요청의 제한 시간은 15초입니다.
- 로딩 상태의 완료 개수는 타일 수이지, 국토 면적이나 경계선 표시 비율이 아닙니다.
- 서버가 아직 `tileManifest`를 지원하지 않아 400/404를 반환하면 기존 방식(줌7 이하 bbox 2×4 분할, 줌8 이상 단일 bbox)으로 복귀합니다. 인증/서버 오류나 잘못된 성공 응답을 이 fallback으로 숨기지 않습니다.

기존 `byView` 계약과 서버의 4배 경량화 정책, `byId` 원본 채택 방식은 변경하지 않습니다. 고정 타일은 화면 바깥까지 포함하고 경계 전체를 중복 전송할 수 있어 단일 bbox보다 전송량이 늘 수 있습니다. 첫 MISS의 계산 비용도 남습니다. 낮은 줌 전국 데이터는 현재 100타일이므로 새 버전 배포 후 사전 생성할 수 있습니다.

**배포 순서:** Supabase 캐시 마이그레이션 → `regions` Edge Function → 에디터 배포. 이 문서는 소스 구현 계약이며 실제 운영 반영 여부는 배포 이력으로 확인합니다. 캐시 버킷/테이블을 공개하거나 인증을 생략하는 설정은 필요하지 않습니다.

## 배포 설정

| 위치          | 설정                                                               | 목적                                |
| ------------- | ------------------------------------------------------------------ | ----------------------------------- |
| 에디터 빌드   | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`               | 접속할 프로젝트와 공개 키           |
| 에디터 빌드   | `VITE_EDITOR_PARENT_ORIGINS`                                       | INIT을 보낼 부모 서비스 origin 목록 |
| Google OAuth  | `https://<project-ref>.supabase.co/auth/v1/callback`               | Google → Supabase 복귀              |
| Supabase Auth | `https://<editor-domain>/auth/callback`                            | Supabase → 에디터 인증 팝업 복귀    |
| regions 함수  | 정확한 에디터 origin 목록                                          | 함수 호출자 origin 검사             |
| regions 함수  | `MAPS_EDITOR_ALLOWED_EMAILS` / `MAPS_EDITOR_ALLOWED_EMAIL_DOMAINS` | 필요할 때 Google 사용자 범위 제한   |

환경 변수는 빌드 시 적용됩니다. 로컬 `localhost:4174`와 `127.0.0.1:4174`는 다른 origin이므로 사용하는 주소를 각각 등록합니다. 프리뷰 도메인도 별도 설정 대상입니다.

**서버 비밀값을 프런트엔드에 넣지 않습니다.** Google Client Secret은 Supabase Provider 설정, 서버용 key는 함수 안에서만 사용합니다.

부모 origin 기본값은 모든 HTTPS 부모와 동일 origin의 로컬 개발을 허용합니다. 특정 서비스용 배포는 정확한 허용 목록을 설정합니다. 이 목록은 함수 origin 검사나 계정 제한을 대신하지 않습니다.

Origin/CORS는 curl 위조를 막는 자격 증명이 아닙니다. 유효한 Google 사용자는 자기 토큰으로 직접 호출할 수 있습니다. 계정 허용 목록이 없으면 모든 유효한 Google 사용자를 허용합니다.

## 데이터 버전과 운영 점검

DB는 `base_date`, `is_current`, `created_at`으로 버전을 구분합니다. 현재 버전 조회와 표시된 row ID의 원본 조회는 목적이 다릅니다. 이전 geometry를 새 행으로 임의 교체하지 않습니다.

2026-09-06 적재 점검 당시 전국 데이터의 `base_date`는 **2026-05-01**이었습니다. 이는 적재 프로필 기본값이며, 공식 원천 데이터의 기준일을 독립적으로 확인한 값은 아닙니다. 외부에 버전을 표시할 때 공급일·실제 기준일·적재일을 구분해야 합니다.

배포 또는 버전 갱신 시 확인할 항목:

- 비로그인 경계 요청이 401로 거부되는지
- 실제 Google 팝업 로그인 후 경계가 표시되는지
- 로그인 전 편집과 부모 반환 연결이 유지되는지
- 로그아웃 후 경계는 해제되고 채택한 도형은 유지되는지
- 신규 데이터의 원천 기준일·건수·geometry 유효성과 버전 스왑 기록이 남는지
