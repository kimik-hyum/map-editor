# 데모 경계 샘플

`/ko/demo`와 `/en/demo`는 실제 지역의 위치를 유지한 8개 경계를 초기 편집 데이터로 제공합니다. 도형의 이름·색상·잠금은 편집 가능한 권역과 참고 영역의 차이를 보여주는 데모 설정입니다. `properties.regionName`과 `regionCode`에는 원래 지역 정보를 보존합니다.

| 데모 도형       | 서울 행정동 | 뉴욕 2020 NTA                  |
| --------------- | ----------- | ------------------------------ |
| 권역 A / Area A | 사직동      | West Village                   |
| 권역 B / Area B | 이화동      | Gramercy                       |
| 권역 C / Area C | 필동        | Greenpoint                     |
| 마스크 예시     | 아현동      | Tribeca-Civic Center           |
| 스냅 예시       | 청파동      | East Midtown-Turtle Bay        |
| 오류 예시       | 신당동      | South Williamsburg             |
| 참고 1          | 홍제3동     | Hell's Kitchen                 |
| 추가 편집 도형  | 가회동      | Long Island City-Hunters Point |

## 출처와 가공

- 서울: [vuski/admdongkor, 2026-10-01](https://github.com/vuski/admdongkor/tree/master/ver20261001)의 공개 GeoJSON 중 위 8개 행정동을 추출했습니다. 통계청 SGIS 원자료의 공공누리 제1유형 출처표시와 가공물의 CC BY 4.0 조건을 유지합니다. [데이터 라이선스](https://github.com/vuski/admdongkor/blob/master/LICENSE-DATA).
- 뉴욕: [NYC Department of City Planning, 2020 Neighborhood Tabulation Areas](https://data.cityofnewyork.us/d/9nt8-h7nd), 2026-11-12 조회. NTA는 통계 집계용 구역이며 법정 행정동이나 동네의 유일한 공식 경계를 뜻하지 않습니다.
- 두 데이터 모두 EPSG:3857에서 OpenLayers의 15m 허용 오차 단순화를 적용하고, EPSG:4326 소수점 6자리로 저장했습니다. 단일 구성 요소의 MultiPolygon만 Polygon으로 표현했습니다. 여러 구성 요소·내부 링은 유지합니다. 도형을 이동·축소하거나 임의로 다른 위치에 배치하지 않았습니다.
- 가공한 샘플은 `src/pages/demo/fixtures/*DemoBoundaries.ts`에 보관합니다. 경계 API나 로그인 없이 데모가 열리며, 기존 Supabase·R2의 경계 조회 정책과 원본 데이터는 바꾸지 않습니다. 편집·저장으로 바뀐 결과는 데모 세션의 데이터입니다.

서울 데이터 출처표시: 본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서 공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor, https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다. Termia 데모는 이 중 일부를 추가 단순화했습니다.
