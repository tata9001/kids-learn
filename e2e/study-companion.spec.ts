import { expect, test } from "@playwright/test";

test("tablet parent-child study workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /今天和伙伴一起开始吧/ })).toBeVisible();

  await page.getByRole("button", { name: "家长模式" }).click();
  await page.getByLabel("任务名称").fill("语文练习");
  await page.getByRole("button", { name: "添加任务" }).click();
  await expect(page.getByText("语文练习")).toBeVisible();

  await page.getByRole("button", { name: "回到首页" }).click();
  await page.getByRole("button", { name: "孩子模式" }).click();
  await page.getByRole("button", { name: "开始 语文练习" }).click();
  await expect(page.getByText("专注中")).toBeVisible();
  await expect(page.getByLabel("剩余时间")).toBeVisible();
  await page.getByRole("button", { name: "完成本轮专注" }).click();
  await expect(page.getByText("今日任务")).toBeVisible();
});
