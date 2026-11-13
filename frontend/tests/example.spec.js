import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), "../backend/.env"),
});
// -----------------------------------------------------------------

 

// ----------------------------For admin page test--------------------------


import { test, expect } from "@playwright/test";

// Incorrect Email & Password
test("Admin Login - Incorrect Credentials", async ({ page }) => {
  await page.goto("http://localhost:3000/admin");

  await page.getByRole("textbox").nth(0).fill("wrong@example.com");
  await page.locator('input[type="password"]').fill("WrongPassword123!");

  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(
    page.getByText(/invalid|incorrect|failed/i)
  ).toBeVisible();
});

// Correct Email & Password
test("Admin Login - Correct Credentials", async ({ page }) => {
  await page.goto("http://localhost:3000/admin");

  await page.getByRole("textbox").nth(0).fill(process.env.ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(process.env.ADMIN_PASSWORD);

  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/employee/);
});


// Admin Login - Empty Fields
test("Admin Login - Empty Fields", async ({ page }) => {
  await page.goto("http://localhost:3000/admin");

  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/admin/);

  await expect(page.getByRole("textbox").nth(0)).toBeEmpty();
  await expect(page.locator('input[type="password"]')).toBeEmpty();
});


// ----------------------------For Employee page test--------------------------


// Incorrect Email & Password
test("Employee Login - Incorrect Credentials", async ({ page }) => {
  await page.goto("http://localhost:3000/login");

  await page.getByRole("textbox").nth(0).fill("employeelogin@example.com");
  await page.locator('input[type="password"]').fill("WrongPassword123!");

  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(
    page.getByText(/invalid|incorrect|failed/i)
  ).toBeVisible();
});

// Correct Email & Password
test("Employee Login - Correct Credentials", async ({ page }) => {
  await page.goto("http://localhost:3000/login");

  await page.getByRole("textbox").nth(0).fill(process.env.EMPLOYEE_EMAIL);
  await page.locator('input[type="password"]').fill(process.env.EMPLOYEE_PASSWORD);

  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/select/);

    // Check Attendance Record Button
  await page.getByRole("link", { name: /check attendance record/i }).click();

  // Record Page
  await expect(page).toHaveURL(/record/);

});



// Employee Login - Empty Fields
test("Employee Login - Empty Fields", async ({ page }) => {
  await page.goto("http://localhost:3000/login");

  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/login/);

  await expect(page.getByRole("textbox").nth(0)).toBeEmpty();
  await expect(page.locator('input[type="password"]')).toBeEmpty();
});
