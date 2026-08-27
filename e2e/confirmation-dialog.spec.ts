import { expect, test } from "@playwright/test";

test("전역 confirmDialog는 어느 화면에서든 열리고 boolean 결과를 반환한다", async ({
  page,
}) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("button", { name: "편집기 새 창으로 열기" }),
  ).toBeVisible();

  const canceled = page.evaluate(async () => {
    const { confirmDialog } =
      await import("/src/shared/ui/confirmation-dialog/index.ts");
    return confirmDialog({
      title: "그리기를 취소할까요?",
      description: "지금까지 찍은 점은 저장되지 않습니다.",
      confirmLabel: "그리기 취소",
      cancelLabel: "계속 그리기",
      tone: "danger",
    });
  });

  const cancelDialog = page.getByRole("alertdialog", {
    name: "그리기를 취소할까요?",
  });
  await expect(cancelDialog).toBeVisible();
  await expect(page.getByRole("button", { name: "계속 그리기" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(cancelDialog).toBeHidden();
  await expect(canceled).resolves.toBe(false);

  const confirmed = page.evaluate(async () => {
    const { confirmDialog } =
      await import("/src/shared/ui/confirmation-dialog/index.ts");
    return confirmDialog({
      title: "현재 도형을 완성할까요?",
      confirmLabel: "도형 완성",
      cancelLabel: "계속 그리기",
      tone: "success",
      initialFocus: "confirm",
    });
  });

  const confirmDialog = page.getByRole("alertdialog", {
    name: "현재 도형을 완성할까요?",
  });
  await expect(confirmDialog).toBeVisible();
  const confirmButton = page.getByRole("button", { name: "도형 완성" });
  await expect(confirmButton).toBeFocused();
  await expect(confirmButton).toHaveClass(/bg-emerald-700/);
  await confirmButton.click();
  await expect(confirmDialog).toBeHidden();
  await expect(confirmed).resolves.toBe(true);
});
