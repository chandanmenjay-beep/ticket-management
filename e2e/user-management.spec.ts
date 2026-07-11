import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Assuming login helper exists or performing manual login
    // Based on codebase: Admin route protection in client requires login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123'); // Updated password
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.goto('/users');
  });

  test('should create, list, update, and delete a user', async ({ page }) => {
    const uniqueEmail = `agent-${Date.now()}@example.com`;
    // 1. Create
    await page.click('[data-testid="create-user-btn"]');
    await page.fill('input[name="name"]', 'New Agent');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'password123456');
    await page.selectOption('select[name="role"]', 'agent');
    await page.locator('form').getByRole('button', { name: /create user/i }).click();

    // Verify list
    await expect(page.locator('tr').filter({ hasText: uniqueEmail })).toBeVisible({ timeout: 10000 });

    // 2. Update
    // Find the edit button for our new user.
    const row = page.locator('tr').filter({ hasText: uniqueEmail });
    await row.locator('[data-testid^="edit-btn-"]').click();

    await page.fill('input[name="name"]', 'Updated Agent');
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('tr').filter({ hasText: uniqueEmail })).toContainText('Updated Agent');

    // 3. Delete
    const updatedRow = page.locator('tr').filter({ hasText: uniqueEmail });
    await updatedRow.locator('[data-testid^="delete-btn-"]').click();
    await page.click('button:has-text("Delete")'); // Modal confirm
    await expect(page.locator('tr').filter({ hasText: uniqueEmail })).not.toBeVisible();
  });
});
