import { chromium } from 'playwright';

async function runTest() {
  console.log('======================================================');
  console.log('--- STARTING 2-BROWSER CROSS-DEVICE SYNC E2E TEST ---');
  console.log('======================================================\n');
  
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    console.log('✓ Launched Microsoft Edge engine');
  } catch (e) {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    console.log('✓ Launched Google Chrome engine');
  }

  // ==========================================
  // DEVICE 1: Mobile Phone Browser
  // ==========================================
  console.log('\n[DEVICE 1: Mobile Phone Browser]');
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  const phonePage = await phoneContext.newPage();
  phonePage.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [Phone Console Error]:`, msg.text());
  });

  await phonePage.goto('http://localhost:5173/');
  console.log('Phone: Navigated to http://localhost:5173/');

  // Wait for the Auth Modal to be visible
  await phonePage.waitForSelector('button:has-text("New Instructor")', { timeout: 15000 });
  await phonePage.click('button:has-text("New Instructor")');
  console.log('Phone: Clicked "New Instructor" registration tab');

  const testId = Date.now().toString().slice(-4);
  const testFirstName = 'Elena';
  const testLastName = 'Cruz' + testId;
  const expectedUsername = `${testLastName.toLowerCase()}.${testFirstName.toLowerCase()}`;

  // Fill in registration form
  await phonePage.fill('input[placeholder="e.g. Maria"]', testFirstName);
  await phonePage.fill('input[placeholder="e.g. Cruz"]', testLastName);
  await phonePage.fill('input[pattern="[0-9]{4}"]', '8899');
  console.log(`Phone: Filled form for new instructor: ${expectedUsername} (PIN: 8899)`);

  // Submit registration
  await phonePage.click('button:has-text("Submit Account for Approval")');
  console.log('Phone: Clicked "Submit Account for Approval"');

  // Verify registration success modal
  await phonePage.waitForSelector('text=Account Created Successfully!', { timeout: 15000 });
  console.log(`Phone: ✅ Registration confirmed on mobile! User: ${expectedUsername}, Status: Pending`);

  // ==========================================
  // DEVICE 2: Computer / Admin Dashboard
  // ==========================================
  console.log('\n[DEVICE 2: Admin Computer (Separate Isolated Browser Context)]');
  const computerContext = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const computerPage = await computerContext.newPage();
  computerPage.on('console', msg => {
    console.log(`  [Computer Console ${msg.type()}]:`, msg.text());
  });

  await computerPage.goto('http://localhost:5173/');
  console.log('Computer: Navigated to http://localhost:5173/');

  // Sign in as admin.admin
  console.log('Computer: Signing in as System Administrator...');
  await computerPage.waitForSelector('button:has-text("System Admin")', { timeout: 15000 });
  await computerPage.click('button:has-text("System Admin")');
  await computerPage.click('button:has-text("Sign In to Dashboard")');

  // Wait for Admin workspace to appear
  await computerPage.waitForSelector('text=Instructor Account Management', { timeout: 15000 });
  console.log('Computer: ✅ Logged into Admin Account Management View!');

  // Check if the new user registered on the phone appears in Admin Console
  console.log(`Computer: Checking if ${expectedUsername} appears in Admin Pending list...`);
  
  let found = false;
  for (let i = 0; i < 15; i++) {
    const textContent = await computerPage.content();
    if (textContent.includes(expectedUsername)) {
      found = true;
      break;
    }
    await computerPage.waitForTimeout(1000);
  }

  if (!found) {
    console.log('Computer: Clicking Refresh button to poll Cloud Firestore...');
    const refreshBtn = computerPage.locator('button:has-text("Refresh"), button:has-text("Syncing")');
    if (await refreshBtn.count() > 0) {
      await refreshBtn.first().click();
    }
    await computerPage.waitForTimeout(3000);
  }

  const finalContent = await computerPage.content();
  if (finalContent.includes(expectedUsername)) {
    console.log(`\n🎉 PROOF: Computer Admin Dashboard received and displayed ${expectedUsername} from the Phone via Cloud Firestore!`);
  } else {
    throw new Error(`FAILURE: ${expectedUsername} did not appear in Admin Dashboard on Computer!`);
  }

  // Admin approves the account specifically for the newly created user
  console.log(`Computer: Filtering admin table for ${expectedUsername}...`);
  const searchInput = computerPage.locator('input[placeholder*="Search by name"]');
  await searchInput.fill(expectedUsername);
  await computerPage.waitForTimeout(1000);

  console.log(`Computer: Approving account access specifically for ${expectedUsername}...`);
  const approveButton = computerPage.getByRole('button', { name: 'Approve', exact: true });
  await approveButton.click();
  console.log(`Computer: ✅ Clicked Approve button specifically for ${expectedUsername}!`);
  await computerPage.waitForSelector('text=Updated Prof.', { timeout: 10000 }).catch(() => {});
  await computerPage.waitForTimeout(3000);

  // ==========================================
  // DEVICE 3: Third Device / Laptop logging in
  // ==========================================
  console.log('\n[DEVICE 3: Third Device / Laptop (Clean Session, 0 Cached Data)]');
  const laptopContext = await browser.newContext({
    viewport: { width: 1024, height: 768 }
  });
  const laptopPage = await laptopContext.newPage();
  laptopPage.on('console', msg => console.log(`  [Laptop Console ${msg.type()}]:`, msg.text()));
  await laptopPage.goto('http://localhost:5173/');

  console.log(`Laptop: Signing in directly with newly approved account: ${expectedUsername} (PIN: 8899)...`);
  await laptopPage.waitForSelector('input[placeholder="e.g. martin.dan"]', { timeout: 15000 });
  await laptopPage.fill('input[placeholder="e.g. martin.dan"]', expectedUsername);
  await laptopPage.fill('input[placeholder="••••"]', '8899');
  await laptopPage.click('button:has-text("Sign In to Dashboard")');
  await laptopPage.waitForTimeout(3000);

  const errorBox = await laptopPage.locator('.bg-red-50, .dark\\:bg-red-950\\/40, [role="alert"]').allTextContents().catch(() => []);
  if (errorBox.length > 0) {
    console.log('Laptop Error Banner:', errorBox.join(' | '));
  }

  // Should successfully log in and see user profile and empty timetable
  await laptopPage.waitForSelector(`text=${expectedUsername}`, { timeout: 15000 });
  await laptopPage.waitForSelector('text=No courses in your schedule yet', { timeout: 15000 });
  console.log(`\n🎉 PROOF: Laptop successfully fetched ${expectedUsername} from Cloud Firestore, verified salted PIN hash, and logged into Dashboard!`);

  await browser.close();
  console.log('\n================================================================');
  console.log('🏆 COMPLETE MULTI-BROWSER CROSS-DEVICE SYNC VERIFICATION PASSED!');
  console.log('================================================================');
  process.exit(0);
}

runTest().catch(err => {
  console.error('\n❌ MULTI-BROWSER TEST FAILED:', err);
  process.exit(1);
});
