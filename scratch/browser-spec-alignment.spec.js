const { test, expect, request } = require('@playwright/test');

const WEB_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001/api/';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let draftTournament;

test.use({
  baseURL: WEB_URL,
  launchOptions: {
    executablePath: CHROME_PATH,
  },
});

test.describe('Role-aware UX alignment', () => {
  test.beforeAll(async () => {
    const api = await request.newContext({ baseURL: API_URL });

    const loginRes = await api.post('auth/login', {
      data: { email: 'admin@golab.vn', password: 'admin123' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();

    const createRes = await api.post('tournaments', {
      headers: {
        Authorization: `Bearer ${loginJson.accessToken}`,
      },
      data: {
        name: 'Browser Spec Alignment',
        slug: `browser-spec-${Date.now()}`,
        venueName: 'GOLAB Court',
        openingTime: new Date().toISOString(),
      },
    });
    expect(createRes.ok()).toBeTruthy();
    draftTournament = await createRes.json();

    await api.dispose();
  });

  test('guest hitting draft admin route is redirected to login', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${WEB_URL}/admin/${draftTournament.id}`);
    await page.waitForURL('**/login', { timeout: 15000 });

    await expect(page.getByRole('heading', { name: 'Đăng nhập Hệ thống' })).toBeVisible();
    await page.screenshot({ path: 'scratch/browser-guest-admin-redirect.png', fullPage: true });

    await context.close();
  });

  test('guest hitting draft public route sees not-found state', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${WEB_URL}/t/${draftTournament.slug}`);
    await expect(page.getByRole('heading', { name: 'Không tìm thấy giải đấu' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Mã: 404/)).toBeVisible();
    await page.screenshot({ path: 'scratch/browser-guest-public-draft.png', fullPage: true });

    await context.close();
  });

  test('admin sees draft tournament blocked from publish on dashboard', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${WEB_URL}/login`);
    await page.getByRole('button', { name: 'Đăng nhập hệ thống' }).click();
    await page.waitForURL('**/admin', { timeout: 15000 });

    await page.goto(`${WEB_URL}/admin/${draftTournament.id}`);
    await expect(page.getByText('Checklist công khai')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Chưa thể công khai')).toBeVisible();
    await expect(page.getByText('trạng thái hoàn tất')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Công khai ngay' })).toHaveCount(0);
    await page.screenshot({ path: 'scratch/browser-admin-draft-dashboard.png', fullPage: true });

    await context.close();
  });
});
