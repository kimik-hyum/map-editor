# Supabase 지역 경계 API — DB 구조 및 응답 규격

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

| 컬럼         | 타입                             | 설명                                            |
| ------------ | -------------------------------- | ----------------------------------------------- |
| `id`         | bigint (identity)                | PK                                              |
| `country`    | text                             | ISO 국가코드. `char_length=2` 제약              |
| `kind`       | text                             | `region_kind.kind` 참조 (복합 FK)               |
| `code`       | text                             | 원본 코드(`SIG_CD`, `EMD_CD`, `BAS_ID` …)       |
| `name`       | text                             | 현지 표기명                                     |
| `name_en`    | text                             | 국제(영문) 표기                                 |
| `base_date`  | date                             | 데이터 기준일자(버전)                           |
| `is_current` | boolean                          | 현재 버전 여부. RPC는 `true`만 반환 (기본 true) |
| `geom`       | geometry(**MultiPolygon**, 4326) | 경계 도형. `ST_IsValid` CHECK                   |
| `created_at` | timestamptz                      | 적재 시각                                       |

> `level`은 카탈로그 사본 drift를 막기 위해 **저장하지 않는다.** 계층은 RPC가 `region_kind`에서 join해 채운다.

**인덱스:** `gist(geom)`, `(country, kind)`, `(country, kind, code)`, **부분 unique** `(country, kind, code) WHERE is_current`
**제약:** `(country, kind)` → `region_kind(country, kind)` 복합 FK, `char_length(country)=2`, `ST_IsValid(geom)`

#### 버전 관리

새 `base_date` 데이터를 적재할 때 **이전 행을 지우지 않고** `is_current=false`로 내린 뒤 새 행을 `is_current=true`로 넣는다. 부분 unique 인덱스가 "현재 버전은 `(country,kind,code)`당 하나"임을 보장하고, RPC는 항상 `is_current` 행만 반환한다(이력 추적·롤백 가능).

---

## 2. 접근 모델 (RLS / 권한)

| 대상              | 직접 접근(PostgREST 테이블)     | RPC 경유 |
| ----------------- | ------------------------------- | -------- |
| `region_kind`     | `anon`/`authenticated` **읽기** | —        |
| `region_boundary` | **불가** (직접 read/write 회수) | 가능     |

- 두 테이블 모두 RLS 활성화. `region_kind`만 공개 읽기 정책을 둔다(메뉴 구성용).
- `region_boundary`는 **직접 SELECT를 회수**해 `/rest/v1/region_boundary` 직접 조회로 bbox/페이로드 제한을 우회하지 못하게 한다. 접근은 RPC로만.
- 두 테이블 모두 `anon`/`authenticated`의 쓰기 권한(INSERT/UPDATE/DELETE/TRUNCATE)을 **회수**. 쓰기·적재는 `service_role`(관리자)만.
- RPC 2종은 `SECURITY DEFINER` + `search_path` 고정으로, 잠긴 `region_boundary`를 대신 읽어 결과만 돌려준다. 실행 권한은 `anon`/`authenticated`에만 부여(`public` 회수).

---

## 3. RPC API

PostgREST 경유: `POST /rest/v1/rpc/<함수명>` (body는 JSON, 키 = 파라미터명).

### `regions_by_view` — 화면 기준 경계 조회 (주 사용)

현재 화면 bbox + 줌 + 선택 kind를 받아, 적절한 경계를 **GeoJSON FeatureCollection**으로 반환.

**파라미터**

| 이름                                       | 타입    | 설명                                                                              |
| ------------------------------------------ | ------- | --------------------------------------------------------------------------------- |
| `min_lng`, `min_lat`, `max_lng`, `max_lat` | double  | 화면 bbox (4326). OpenLayers extent(3857)는 **클라이언트가 4326으로 변환**해 전달 |
| `zoom`                                     | numeric | 현재 줌. 소수 가능 — 서버가 `floor` 처리                                          |
| `country`                                  | text    | 기본 `'KR'`                                                                       |
| `kind`                                     | text    | 사용자가 고른 종류(detail tier에서만 사용). 기본 `null`                           |
| `max_features`                             | integer | 안전 상한. 기본 `3000` (초과분은 잘림 → 단순화/축소 신호)                         |

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
        "base_date": "2025-05-01"
      }
    }
  ]
}
```

- 데이터가 없거나 화면에 걸치는 경계가 없으면 `features: []`로 정상 응답한다. 응답의 `kind`/`level`로 "지금 무엇을 보여주는지"를 UI가 판별·표시한다.
- 공간 필터는 **bbox 겹침(`&&`)** 이다(정확 교차 아님). 화면 조회엔 충분하며 빠르다. 좌표는 `ST_AsGeoJSON` **소수 6자리(≈0.1m)** 로 잘라 페이로드를 줄인다.

### `region_by_code` — 단건 원본 조회 (편집 채택용)

표시는 가볍게 받되, 사용자가 특정 경계를 **편집 대상으로 채택**할 때 그 폴리곤만 다시 받는다.

**파라미터:** `country`, `kind`, `code`
**반환:** `is_current` 행 중 `base_date` 최신 1개를 GeoJSON **Feature**로(구조는 위 feature와 동일). 없으면 `null`.

---

## 4. 클라이언트 사용 메모

- 좌표계: 응답은 4326 GeoJSON → OpenLayers에서 `3857`로 표시할 때만 reprojection. 저장/편집은 4326 그대로.
- 호출: `@supabase/supabase-js`의 `.rpc('regions_by_view', { … })` 또는 anon 키를 헤더에 실은 raw `fetch`. 비동기 상태는 기존 TanStack Query로 래핑. **`region_boundary` 테이블은 직접 조회 불가** — 반드시 RPC 사용. `region_kind`는 직접 읽기 가능.
- 줌: 소수 줌을 그대로 보내도 된다(서버 `floor`).
- 종류 메뉴: `region_kind`에서 `selectable=true`행을 `sort_order` 순으로 받아 경계 도구 팝업을 구성하면, 국가별 kind가 데이터로 정의된다. 저줌에서 RPC가 돌려주는 **비선택 kind(`sigungu` 등)는 "표시 전용"** 으로 다뤄야 한다(사용자가 고르는 종류가 아님).
- 단순화: 현재는 (정밀도 6자리) 원본 해상도 제공. "시군구 전국 뷰"처럼 무거운 coarse tier가 느리거나 `max_features`에 걸릴 경우에만 `ST_SimplifyPreserveTopology`를 추가한다(성급한 최적화 회피).

---

## 5. 현재 상태 / 다음 단계

- [x] PostGIS 활성화, `region_kind`/`region_boundary` 테이블·인덱스·RLS 생성
- [x] KR 종류 카탈로그 시드
- [x] `regions_by_view`, `region_by_code` RPC + tier 로직 검증(빈 데이터 기준)
- [x] 스키마 하드닝: `is_current` 버전 모델·부분 unique, 유효성/형식 CHECK, `level` 제거, **RPC 전용 접근(SECURITY DEFINER)**, numeric 줌+floor, coarse tie-break, `max_features` 상한, 좌표 정밀도 6
- [ ] 서울(11000) 경계 데이터 적재: 시군구/행정동/법정동/우편번호 (5179 → 4326 변환, `ST_MakeValid`·`ST_Multi` 통일)
- [ ] maps-editor 측 Supabase 클라이언트 연동 및 경계 도구 결선(비선택 `sigungu` 표시 처리 포함)
- [ ] (필요 시) 전국 확대 및 coarse tier 단순화
