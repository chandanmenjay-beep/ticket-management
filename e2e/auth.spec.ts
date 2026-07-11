import { test, expect } from '@playwright/test';

test.describe('Authentication & Edge Cases', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // --- Core Functionality Tests ---
  test('1. Successful login and session persistence', async ({ page }) => {
    await page.fill('input[name="email"]', 'agent@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');

    // Test persistence
    await page.reload();
    await expect(page).toHaveURL('/');
  });

  test('2. Login failure with incorrect credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'agent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should stay on login page if failed
    await expect(page).toHaveURL('/login');
  });

  // --- Routing & Role Edge Cases ---
  test('3. Redirect to login when accessing protected routes', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('4. Agent role accessing /users directly', async ({ page }) => {
    await page.fill('input[name="email"]', 'agent@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/users');
    await expect(page).toHaveURL('/'); 
  });

  test('5. Admin role accessing /users directly', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/users');
    await expect(page).toHaveURL('/users'); 
  });

  // --- Session & Logout Edge Cases ---
  test('6. Logout clears session', async ({ page }) => {
    await page.fill('input[name="email"]', 'agent@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.click('text=Sign Out');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('7. Multi-tab session synchronization', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto('/login');
    await page1.fill('input[name="email"]', 'admin@example.com');
    await page1.fill('input[name="password"]', 'password123');
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/');

    await page2.goto('/');
    await expect(page2).toHaveURL('/');
  });

  test('8. Multi-tab logout synchronization', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto('/login');
    await page1.fill('input[name="email"]', 'admin@example.com');
    await page1.fill('input[name="password"]', 'password123');
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/');

    await page2.goto('/');
    await page1.click('text=Sign Out');
    await page1.waitForURL(/.*\/login/);
    
    await page2.reload();
    await expect(page2).toHaveURL(/.*\/login/);
  });
});
