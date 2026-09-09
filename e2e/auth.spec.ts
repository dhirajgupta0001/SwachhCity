import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1').filter({ hasText: 'SwachhCity' })).toBeVisible();
    await expect(page.locator('text=Sign in')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should display registration page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('text=Create an account')).toBeVisible();
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
  });

  test('should reject invalid credentials gracefully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword123');
    await page.click('button[type="submit"]');

    // Wait for the server action / Supabase to return an error
    await expect(page.locator('text=Invalid login credentials').or(page.locator('text=Email or password is incorrect').or(page.locator('text=An unexpected error')))).toBeVisible();
  });

  test('should redirect unauthenticated users away from protected routes', async ({ page }) => {
    await page.goto('/dashboard');
    // Should be redirected to /login
    await expect(page).toHaveURL(/.*\/login/);
    
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
