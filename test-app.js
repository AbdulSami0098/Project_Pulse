const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  console.log('=== Project Pulse App Test ===\n');

  // 1. Load the app
  console.log('1. Loading app at http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/pp-01-home.png' });
  console.log('   Title:', await page.title());

  // 2. Check what's on screen initially
  const pageText = await page.locator('body').innerText();
  console.log('   Page content preview:', pageText.slice(0, 300).replace(/\n+/g, ' '));

  // 3. Check for project selector / dashboard
  const hasProjectSelector = await page.locator('text=Select Project').count() > 0
    || await page.locator('text=Create Project').count() > 0
    || await page.locator('text=No projects').count() > 0;
  console.log('   Shows project selector:', hasProjectSelector);

  // 4. Try to find and list any existing projects
  const projectCards = await page.locator('[data-testid="project-card"], .project-card, button').count();
  console.log('   Clickable elements found:', projectCards);

  // 5. Check API health
  console.log('\n2. Checking backend API...');
  const apiResponse = await page.request.get('http://localhost:3001/api/projects');
  console.log('   GET /api/projects status:', apiResponse.status());
  const projects = await apiResponse.json().catch(() => null);
  if (projects) console.log('   Projects in DB:', JSON.stringify(projects).slice(0, 200));

  // 6. Screenshot the current state
  await page.screenshot({ path: '/tmp/pp-02-initial.png', fullPage: true });
  console.log('\n3. Screenshots saved to /tmp/pp-01-home.png and /tmp/pp-02-initial.png');

  // 7. Try creating a project if none exist
  if (Array.isArray(projects) && projects.length === 0) {
    console.log('\n4. No projects found — attempting to create one...');
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Project"), button:has-text("Add Project")').first();
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '/tmp/pp-03-create.png' });
      console.log('   Create button clicked, screenshot saved');
    } else {
      console.log('   No create button found on page');
    }
  } else if (Array.isArray(projects) && projects.length > 0) {
    console.log('\n4. Projects exist, trying to click first project...');
    const firstProject = page.locator(`text=${projects[0].name}`).first();
    if (await firstProject.count() > 0) {
      await firstProject.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/tmp/pp-03-dashboard.png', fullPage: true });
      console.log('   Clicked project, dashboard screenshot saved to /tmp/pp-03-dashboard.png');

      // Check dashboard elements
      const hasSidebar = await page.locator('nav, aside, [class*="sidebar"]').count() > 0;
      const hasAlerts = await page.locator('text=Alert, text=alert').count() > 0;
      console.log('   Has sidebar:', hasSidebar);
      console.log('   Has alerts section:', hasAlerts);
    }
  }

  // 8. Check for console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.waitForTimeout(1000);
  console.log('\n5. Console errors:', errors.length === 0 ? 'None' : errors.join('\n   '));

  console.log('\n=== Test complete ===');
  await browser.close();
})();
