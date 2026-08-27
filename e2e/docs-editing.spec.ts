import { expect, test } from "@playwright/test";

test("도형 편집 문서가 선택부터 완료까지 현재 기능을 안내한다", async ({ page }) => {
  await page.goto("/editing");

  await expect(
    page.getByRole("heading", { name: "도형 편집 방법", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "도형 선택과 전체 이동" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "정점 추가·이동·삭제" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "새 도형 그리기" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "마커에서 반경 폴리곤 만들기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "폴리곤 병합·차집합·교집합" }),
  ).toBeVisible();
  await expect(page.getByText("0.01–1,000km")).toBeVisible();
  await expect(
    page.getByText("부모창이 전달한 원본에는 삭제 버튼이 없습니다."),
  ).toBeVisible();
});

test("시작 문서와 화면 구성에서 도형 편집 문서로 이동한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /도형 편집 방법/ }).click();
  await expect(page).toHaveURL(/\/editing$/);

  await page.goto("/screen");
  await page.getByRole("link", { name: "편집 동작 자세히 보기" }).click();
  await expect(page).toHaveURL(/\/editing$/);
});
