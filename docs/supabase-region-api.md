# Supabase 지역 경계 API — DB 구조 및 응답 규격

현황 갱신: 2026-08-27

maps-editor의 경계(Boundary) 도구가 시군구·행정동·법정동·우편번호 경계를 Supabase에서 내려받기 위한 DB 구조와 응답 규격을 정의한다.

- **저장 좌표계:** EPSG:4326 (WGS84 경위도). 에디터 `EditorCoordinate = [lng, lat]`와 동일하므로 변환 없이 사용.
- **도형 타입:** 모든 경계를 **MultiPolygon으로 통일**(단일 폴리곤은 적재 시 `ST_Multi`로 감쌈) → Polygon/MultiPolygon 분기 제거. 컬럼 타입이 타입·SRID·2D를 강제하고, `ST_IsValid` CHECK로 깨진 폴리곤을 막는다.
- **확장:** PostGIS(`extensions` 스키마).
- **설계 원칙:** 나라별 특수성을 **스키마가 아니라 데이터(행)** 로 흡수한다. 새 국가 추가 = 행 삽입뿐, 마이그레이션/코드 변경 없음.

---

## 1. 테이블

### `region_kind` — 종류 카탈로그 (설정)

줌→계층 매핑, 에디터 kind 메뉴, 자동/사용자선택 구분의 **단일 출처**.

| 컬럼         | 타입     | 설명                                                        |
| ------------ | -------- | ----------------------------------------------------------- |
| `country`    | text     | ISO 3166-1 alpha-2 (`KR`, `US`, `JP`). `char_length=2` 제약 |
| `kind`       | text     | `sigungu`, `adminDong`, `legalDong`, `postalCode` …         |
| `level`      | smallint | 계층 깊이(작을수록 상위)                                    |
| `label`      | text     | UI 표시명(`행정동` 등)                                      |
| `selectable` | boolean  | `true`=사용자가 고름 / `false`=줌으로 자동 노출(시군구 등)  |
| `min_zoom`   | smallint | 이 줌 이상에서 노출 (`0~30` 제약)                           |
| `sort_order` | smallint | UI 정렬 순서 (`>=0` 제약)                                   |
| PK           |          | (`country`, `kind`)                                         |

#### 시드(KR)

| country | kind         | level | label    | selectable | min_zoom |
| ------- | ------------ | :---: | -------- | :--------: | :------: |
| KR      | `sigungu`    |   1   | 시군구   |   false    |    0     |
| KR      | `adminDong`  |   2   | 행정동   |    true    |    12    |
| KR      | `legalDong`  |   2   | 법정동   |    true    |    12    |
| KR      | `postalCode` |   3   | 우편번호 |    true    |    13    |

### `region_boundary` — 경계 도형

| 컬럼               | 타입                             | 설명                                                         |
| ------------------ | -------------------------------- | ------------------------------------------------------------ |
| `id`               | bigint (identity)                | PK                                                           |
| `country`          | text                             | ISO 3166-1 alpha-2 국가코드. `char_length=2` 제약            |
| `subdivision_code` | text                             | 1차 행정구역(adm1) 코드. KR 시도 `'11'` 등. 증분 적재 스코프 |
| `kind`             | text                             | `region_kind.kind` 참조 (복합 FK)                            |
| `code`             | text                             | 원본 코드(`SIG_CD`, `EMD_CD`, `BAS_ID` …)                    |
| `name`             | text                             | 현지 표기명                                                  |
| `name_en`          | text                             | 국제(영문) 표기                                              |
| `base_date`        | date                             | 데이터 기준일자(버전)                                        |
| `is_current`       | boolean                          | 현재 버전 여부. RPC는 `true`만 반환 (기본 true)              |
| `geom`             | geometry(**MultiPolygon**, 4326) | 경계 도형. `ST_IsValid` CHECK                                |
| `created_at`       | timestamptz                      | 적재 시각                                                    |

> `level`은 카탈로그 사본 drift를 막기 위해 **저장하지 않는다.** 계층은 RPC가 `region_kind`에서 join해 채운다.

**글로벌 식별:** 한 행의 위치 소속은 `(country, subdivision_code)` 쌍으로 표현한다 — ISO 3166 구조(`country` = 3166-1, `subdivision_code` = 1차 행정구역/adm1)와 동일하다. "시도"는 이 글로벌 모델의 한국 사례(`KR` + `'11'`)이며, 미국 주·일본 도도부현 등도 같은 컬럼에 들어간다.

**인덱스:** `gist(geom)`, `(country, kind)`, `(country, kind, code)`, `(country, subdivision_code, kind)`, 현재행 최적화용 **부분 인덱스** `gist(geom) WHERE is_current`, `(country, kind) WHERE is_current`, **부분 unique** `(country, subdivision_code, kind, code) WHERE is_current`
**제약:** `(country, kind)` → `region_kind(country, kind)` 복합 FK, `char_length(country)=2`, `ST_IsValid(geom)`

#### 버전 관리 · 시도별(adm1) 증분 적재

데이터는 **1차 행정구역 단위(시도/주/도도부현)로 따로 받아 증분 적재**한다. 매달 새 데이터를 받으면 **지우지 않고 버전 스왑**한다 — 한 트랜잭션 안에서 해당 스코프의 현재행을 내리고 새 행을 올린다:

```sql
begin;
-- 해당 1차구역의 현재행만 과거로 내림 (다른 지역은 건드리지 않음)
update region_boundary set is_current = false
 where country = 'KR' and subdivision_code = '11' and is_current;
-- 이번 달 데이터를 현재행으로 삽입 (base_date = 이번 기준일)
insert into region_boundary
  (country, subdivision_code, kind, code, name, name_en, base_date, is_current, geom)
 select 'KR', '11', kind, code, name, name_en, '2025-06-01', true,
        ST_Multi(ST_MakeValid(ST_Transform(geom_5179, 4326)))
 from <staging>;
commit;
```

- 트랜잭션이라 RPC 소비자는 중간 상태를 보지 않는다(MVCC). 갱신 중에도 서비스 정상.
- 스왑 스코프가 `subdivision_code`라, **서울만 갱신해도 다른 시도의 현재행은 그대로** 유지된다. 우편번호처럼 코드가 시도를 안 담는 종류도 안전하게 교체된다.
- 사라진 코드는 현재행에서 자동 제외, 새 코드는 자동 편입 → **개편 자동 반영**. 과거 행(`is_current=false`)은 이력으로 남아 롤백 가능.
- 부분 unique 인덱스가 "현재 버전은 `(country, subdivision_code, kind, code)`당 하나"임을 보장한다.
- 운영 시 staging에 먼저 적재 → `ST_IsValid`·건수 검증 후 스왑(불량 월분이 라이브로 가는 것 방지). 다운로드는 행안부 수동(공개 API 없음), DB 스왑만 함수/스크립트화 가능.

---

## 2. 접근 모델 (RLS / 권한)

브라우저는 지역 테이블이나 RPC에 직접 접근하지 않고 `POST /functions/v1/regions`만 호출한다.

1. `/editor`는 비로그인으로 진입한다. 경계 메뉴 선택 시 확인 모달을 띄우고, 동의한 경우에만 별도 팝업에서 Supabase Auth의 Google OAuth(PKCE)로 로그인한다. 취소 시 기존 도구와 편집 상태를 유지한다.
2. 브라우저는 Edge Function에 로그인 사용자의 access token을 `Authorization: Bearer ...`로 보낸다.
3. Edge Function은 정확한 Origin, JWT, Google identity, 선택적 이메일/도메인 허용 목록과 사용자별 호출량을 검사한다.
4. 통과한 요청만 함수 내부의 secret key로 `region_kind` 및 지역 RPC를 호출한다.

로그인 팝업의 복귀 주소는 앱의 `/auth/callback`이다. 원래 에디터 창은 이동하거나 다시 마운트하지 않으므로 부모의 INIT 데이터, `window.opener` 연결, 편집 이력과 지도 상태가 유지된다. 로그인 중 새 INIT 또는 편집/도구 변경이 발생하면 이전 경계 메뉴 전환 의도를 취소한다. 팝업의 완료 알림에는 성공 여부만 포함하며, 인증 토큰과 scene은 호스트에 전달하지 않는다.

카탈로그·화면 경계·단건 원본 캐시는 인증 사용자별로 분리한다. 비로그인 상태에서는 경계 조회를 비활성화하고, 로그아웃 시 참고 경계와 진행 중 경계 연산을 해제한다. 편집 scene에 이미 복사한 도형은 일반 편집 데이터이므로 삭제하지 않는다. 서버 JWT/Origin/권한 설정은 그대로 유지한다.

`anon`과 `authenticated`에는 `region_kind` SELECT 및 지역 RPC EXECUTE 권한이 없다. 따라서 publishable key나 사용자 JWT를 얻더라도 Data API를 직접 호출해 Edge Function 검사를 우회할 수 없다. 쓰기·적재 역시 관리자 역할만 가능하다.

Origin/CORS 검사는 브라우저 오용을 줄이는 보조 장치다. `curl`은 Origin 헤더를 위조할 수 있으므로 실제 접근 통제는 검증된 Google 사용자 JWT와 서버 측 허용 목록이 담당한다. `MAPS_EDITOR_ALLOWED_EMAILS` 또는 `MAPS_EDITOR_ALLOWED_EMAIL_DOMAINS`를 설정하지 않으면 모든 Google 계정을 허용한다.

---

## 3. RPC API

RPC는 Edge Function 내부에서만 호출한다. 브라우저 공개 엔드포인트는 `POST /functions/v1/regions`이며, 본문의 `operation`으로 아래 RPC를 선택한다.

### `regions_by_view` — 화면 기준 경계 조회 (주 사용)

현재 화면 bbox + 줌 + 선택 kind를 받아, 적절한 경계를 **GeoJSON FeatureCollection**으로 반환.

**파라미터**

| 이름                                       | 타입    | 설명                                                                              |
| ------------------------------------------ | ------- | --------------------------------------------------------------------------------- |
| `min_lng`, `min_lat`, `max_lng`, `max_lat` | double  | 화면 bbox (4326). OpenLayers extent(3857)는 **클라이언트가 4326으로 변환**해 전달 |
| `zoom`                                     | numeric | 현재 줌. 소수 가능 — 서버가 `floor` 처리                                          |
| `country`                                  | text    | 기본 `'KR'`                                                                       |
| `kind`                                     | text    | 사용자가 고른 종류(detail tier에서만 사용). 기본 `null`                           |
| `max_features`                             | integer | 안전 상한. 기본 `3000` (초과분은 잘리고 `truncated=true`)                         |
| `tolerance`                                | numeric | 단순화 허용오차(도). `null`(기본)=줌 티어 자동, `0`=원본 강제, `>0`=수동          |

**tier 결정 로직**

```
floor(zoom) ≥ (선택 kind의 min_zoom)  →  선택한 kind 반환 (detail)
그 외(너무 멀면)                       →  selectable=false인 상위 계층 자동 반환 (coarse, 예: 시군구)
                                          동률 min_zoom은 level 큰 쪽으로 결정(결정적)
```

| 요청               | 반환 kind             |
| ------------------ | --------------------- |
| z13 + `adminDong`  | `adminDong`           |
| z13 + `legalDong`  | `legalDong`           |
| z13 + `postalCode` | `postalCode`          |
| z8 + `adminDong`   | `sigungu` (자동 대체) |
| z11 + `postalCode` | `sigungu` (z11 < 13)  |

**응답**

```json
{
  "type": "FeatureCollection",
  "country": "KR",
  "kind": "adminDong",
  "level": 2,
  "tolerance": 0.00017,
  "truncated": false,
  "features": [
    {
      "type": "Feature",
      "id": 1234,
      "geometry": { "type": "MultiPolygon", "coordinates": [[[[126.97, 37.58], "…"]]] },
      "properties": {
        "code": "1111051500",
        "name": "청운효자동",
        "name_en": "Cheongunhyoja-dong",
        "kind": "adminDong",
        "level": 2,
        "subdivision": "11",
        "base_date": "2025-05-01"
      }
    }
  ]
}
```

- 데이터가 없거나 화면에 걸치는 경계가 없으면 `features: []`로 정상 응답한다. 응답의 `kind`/`level`/`tolerance`로 "지금 무엇을 어떤 해상도로 보여주는지"를 UI가 판별한다.
- `max_features`보다 후보가 많으면 `features`는 상한까지만 내려가고 `truncated: true`가 된다. 클라이언트는 줌인/범위 축소 신호로 쓴다.
- 공간 필터는 **bbox 겹침(`&&`)** 이다(정확 교차 아님). 화면 조회엔 충분하며 빠르다.

**표시용 즉석 단순화 (티어 양자화)**

응답 좌표는 서버가 `ST_SimplifyPreserveTopology`로 **조회 시점에 단순화**해 내려준다(별도 단순화본 저장 없음 — 원본 단일 저장). 허용오차는 줌 밴드당 고정값(티어)이라 캐시 친화적이고, 해당 줌의 반픽셀 수준이라 시각 손실이 없다:

| 줌     | tolerance(도) | 좌표 자릿수 |
| ------ | ------------- | ----------- |
| z ≤ 11 | 0.00034       | 5           |
| z 12   | 0.00017       | 5           |
| z 13   | 0.000086      | 5           |
| z 14   | 0.000043      | 5           |
| z ≥ 15 | 0.00002       | 5           |

자동 모드는 항상 표시용 단순화본을 내려준다. 원본 표시가 정말 필요한 진단/수동 호출만 `tolerance=0`을 쓴다. 편집 정밀도는 아래 `region_by_id`(항상 원본)로 보장한다.

### `region_by_id` — 표시 row 기준 원본 조회 (편집 채택용)

표시는 단순화본으로 받되, **+(병합/추가)·−(빼기) 같은 편집 연산 시** 사용자가 보고 클릭한 `Feature.id`를 이 RPC로 다시 받아 **항상 원본 해상도**로 수행한다(단순화는 표시 전용 — 편집 정밀도 무손실).

**파라미터:** `boundary_id`
**반환:** 해당 `region_boundary.id` 행을 GeoJSON **Feature**로(구조는 위 feature와 동일, 항상 원본·6자리). 없으면 `null`.

`id` 기반이라 다국가/다지역 코드 충돌을 피하고, 월별 스왑 중에도 사용자가 화면에서 본 row와 편집 연산 대상이 일치한다. 이 RPC는 `is_current`로 필터링하지 않는다.

### `region_by_code` — code 기반 원본 조회 (외부/편의용)

**파라미터:** `country`, `kind`, `code`
**반환:** `is_current` 행 중 `base_date` 최신 1개를 GeoJSON **Feature**로(구조는 위 feature와 동일, 항상 원본·6자리). 없으면 `null`.

편집 채택 경로는 `region_by_id`를 사용한다. `region_by_code`는 외부 조회·운영 확인용으로 유지하며, 다국가 확장 시 `subdivision_code` 파라미터를 추가할 수 있다.

---

## 4. 클라이언트 사용 메모

- 좌표계: 응답은 4326 GeoJSON → OpenLayers에서 `3857`로 표시할 때만 reprojection. 저장/편집은 4326 그대로.
- 호출: 로그인 세션의 access token과 publishable key를 헤더에 넣어 `/functions/v1/regions`를 호출한다. 비동기 상태는 기존 TanStack Query로 래핑한다. **테이블과 RPC는 브라우저에서 직접 조회할 수 없다.**
- 줌: 소수 줌을 그대로 보내도 된다(서버 `floor`). 클라이언트는 요청 bbox를 **해당 줌 타일 폭 격자로 스냅**해 보낸다 — 작은 팬으로는 재요청이 없고, 사용자 간 요청이 동일 키로 수렴해 이후 HTTP/서버 캐시 도입 시 그대로 캐시 키가 된다.
- 편집 연산: `regions_by_view`의 표시 geometry는 절대 연산에 쓰지 않는다. `Feature.id`로 `region_by_id`를 호출해 원본 geometry를 받은 뒤 union/subtract를 수행한다.
- 잘림: 응답의 `truncated=true`는 현재 bbox에서 상한까지만 받은 상태다. 우편번호처럼 밀도가 높은 kind에서 줌인/범위 축소 UI 신호로 사용한다.
- 종류 메뉴: `region_kind`에서 `selectable=true`행을 `sort_order` 순으로 받아 경계 도구 팝업을 구성하면, 국가별 kind가 데이터로 정의된다. 저줌에서 RPC가 돌려주는 **비선택 kind(`sigungu` 등)는 "표시 전용"** 으로 다뤄야 한다(사용자가 고르는 종류가 아님).
- 스케일 로드맵: 트래픽 증가 시 티어별 단순화 결과를 Materialized View로 사전계산(적재 후 `REFRESH` 1줄) → 필요하면 GET+`Cache-Control`(함수가 `STABLE`이라 GET 허용)로 HTTP 캐시 → 대규모는 벡터타일(`ST_AsMVT`). 티어 양자화·bbox 스냅이 이 단계들의 캐시 키 전제를 이미 충족한다.

---

## 5. 현재 상태 / 다음 단계

- [x] PostGIS 활성화, `region_kind`/`region_boundary` 테이블·인덱스·RLS 생성
- [x] KR 종류 카탈로그 시드
- [x] `regions_by_view`, `region_by_id`, `region_by_code` RPC + tier 로직 검증
- [x] 스키마 하드닝: `is_current` 버전 모델·부분 unique, current 부분 인덱스, 유효성/형식 CHECK, `level` 제거, **RPC 전용 접근(SECURITY DEFINER)**, numeric 줌+floor, coarse tie-break, `max_features` 상한+`truncated`, 좌표 정밀도 5/6
- [x] `subdivision_code`(adm1) 추가 — 시도별 증분 적재 스코프 + 글로벌 계층/필터
- [x] 서울(`subdivision_code='11'`) 경계 데이터 적재: 시군구/행정동/법정동/우편번호 (5179 → 4326, `ST_MakeValid`·`ST_Multi`)
- [x] maps-editor 측 RPC 연동 및 경계 도구 결선 — 서버 카탈로그 메뉴, bbox 스냅·TanStack Query 캐시, 비선택 `sigungu` 표시, `truncated` 줌인 안내, 원본 기반 복사 병합/제거
- [x] 경계 도구 선택 시에만 Google 로그인 안내, 별도 OAuth 팝업으로 부모 연결과 편집 상태 유지
- [x] 비로그인 경계 요청 차단 및 사용자별 조회 캐시 분리
- [x] 직접 Data API 권한 회수, Edge Function Origin/JWT/Google identity/호출량 검증
- [x] API 응답 Zod 검증, 카탈로그 실패 fallback, 원본 조회 중 session 교체 시 stale 결과 폐기 E2E
- [ ] 시도별 증분 적재 운영(다운로드 → staging 검증 → 버전 스왑) + (필요 시) coarse tier 단순화
