# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication & Edge Cases >> 30. Multi-tab session synchronization
- Location: e2e/auth.spec.ts:237:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - img [ref=e8]
  - heading "Welcome back" [level=1] [ref=e10]
  - paragraph [ref=e11]: Sign in to manage your tickets
  - generic [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]: Email address
      - generic [ref=e15]:
        - generic:
          - img
        - textbox "admin@example.com" [ref=e16]
    - generic [ref=e17]:
      - generic [ref=e18]: Password
      - generic [ref=e19]:
        - generic:
          - img
        - textbox "••••••••" [ref=e20]
    - button "Sign In" [ref=e21]:
      - text: Sign In
      - img
```

# Test source

```ts
  145 |     await page.goto('/users');
  146 |     await expect(page).toHaveURL(/.*\/login/);
  147 |   });
  148 | 
  149 |   test('20. Unauthenticated access to non-existent route', async ({ page }) => {
  150 |     await page.goto('/404-test');
  151 |   });
  152 | 
  153 |   test('21. Agent role accessing /users directly', async ({ page }) => {
  154 |     await page.fill('input[name="email"]', 'agent@example.com');
  155 |     await page.fill('input[name="password"]', 'password123');
  156 |     await page.click('button[type="submit"]');
  157 |     await page.waitForURL('/');
  158 |     await page.goto('/users');
  159 |     await expect(page).toHaveURL('/'); 
  160 |   });
  161 | 
  162 |   test('22. Admin role accessing /users directly', async ({ page }) => {
  163 |     await page.fill('input[name="email"]', 'admin@example.com');
  164 |     await page.fill('input[name="password"]', 'password123');
  165 |     await page.click('button[type="submit"]');
  166 |     await page.waitForURL('/');
  167 |     await page.goto('/users');
  168 |     await expect(page).toHaveURL('/users'); 
  169 |   });
  170 | 
  171 |   // --- UI & Visibility Edge Cases ---
  172 |   test('23. Verify loading spinner on login submit', async ({ page }) => {
  173 |     await page.fill('input[name="email"]', 'admin@example.com');
  174 |     await page.fill('input[name="password"]', 'password123');
  175 |     await page.click('button[type="submit"]');
  176 |   });
  177 | 
  178 |   test('24. Users link hidden for agent role', async ({ page }) => {
  179 |     await page.fill('input[name="email"]', 'agent@example.com');
  180 |     await page.fill('input[name="password"]', 'password123');
  181 |     await page.click('button[type="submit"]');
  182 |     await page.waitForURL('/');
  183 |     await expect(page.locator('text=Users')).toHaveCount(0);
  184 |   });
  185 | 
  186 |   test('25. Users link visible for admin role', async ({ page }) => {
  187 |     await page.fill('input[name="email"]', 'admin@example.com');
  188 |     await page.fill('input[name="password"]', 'password123');
  189 |     await page.click('button[type="submit"]');
  190 |     await page.waitForURL('/');
  191 |     await expect(page.locator('text=Users').first()).toBeVisible();
  192 |   });
  193 | 
  194 |   test('26. Header UI renders correctly on mobile', async ({ page }) => {
  195 |     await page.setViewportSize({ width: 375, height: 667 });
  196 |     await page.fill('input[name="email"]', 'admin@example.com');
  197 |     await page.fill('input[name="password"]', 'password123');
  198 |     await page.click('button[type="submit"]');
  199 |     await page.waitForURL('/');
  200 |   });
  201 | 
  202 |   // --- Session & Logout Edge Cases ---
  203 |   test('27. Logout clears session', async ({ page }) => {
  204 |     await page.fill('input[name="email"]', 'agent@example.com');
  205 |     await page.fill('input[name="password"]', 'password123');
  206 |     await page.click('button[type="submit"]');
  207 |     await page.waitForURL('/');
  208 | 
  209 |     await page.click('text=Sign Out');
  210 |     await expect(page).toHaveURL(/.*\/login/);
  211 | 
  212 |     await page.goto('/');
  213 |     await expect(page).toHaveURL(/.*\/login/);
  214 |   });
  215 | 
  216 |   test('28. Access protected route after sign out via history', async ({ page }) => {
  217 |     await page.fill('input[name="email"]', 'admin@example.com');
  218 |     await page.fill('input[name="password"]', 'password123');
  219 |     await page.click('button[type="submit"]');
  220 |     await page.waitForURL('/');
  221 |     await page.click('text=Sign Out');
  222 |     await page.waitForURL(/.*\/login/);
  223 |     await page.goBack();
  224 |     await expect(page).toHaveURL(/.*\/login/);
  225 |   });
  226 | 
  227 |   test('29. Clear cookies manually and try to access dashboard', async ({ context, page }) => {
  228 |     await page.fill('input[name="email"]', 'admin@example.com');
  229 |     await page.fill('input[name="password"]', 'password123');
  230 |     await page.click('button[type="submit"]');
  231 |     await page.waitForURL('/');
  232 |     await context.clearCookies();
  233 |     await page.reload();
  234 |     await expect(page).toHaveURL(/.*\/login/);
  235 |   });
  236 | 
  237 |   test('30. Multi-tab session synchronization', async ({ context }) => {
  238 |     const page1 = await context.newPage();
  239 |     const page2 = await context.newPage();
  240 |     
  241 |     await page1.goto('/login');
  242 |     await page1.fill('input[name="email"]', 'admin@example.com');
  243 |     await page1.fill('input[name="password"]', 'password123');
  244 |     await page1.click('button[type="submit"]');
> 245 |     await page1.waitForURL('/');
      |                 ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  246 | 
  247 |     await page2.goto('/');
  248 |     await expect(page2).toHaveURL('/');
  249 |   });
  250 | 
  251 |   test('31. Multi-tab logout synchronization', async ({ context }) => {
  252 |     const page1 = await context.newPage();
  253 |     const page2 = await context.newPage();
  254 |     
  255 |     await page1.goto('/login');
  256 |     await page1.fill('input[name="email"]', 'admin@example.com');
  257 |     await page1.fill('input[name="password"]', 'password123');
  258 |     await page1.click('button[type="submit"]');
  259 |     await page1.waitForURL('/');
  260 | 
  261 |     await page2.goto('/');
  262 |     await page1.click('text=Sign Out');
  263 |     await page1.waitForURL(/.*\/login/);
  264 |     
  265 |     await page2.reload();
  266 |     await expect(page2).toHaveURL(/.*\/login/);
  267 |   });
  268 | 
  269 | });
  270 | 
```