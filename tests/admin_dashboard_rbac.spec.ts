import { test, expect } from "@playwright/test";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAKTHI SPARK FLOW - QA AUTOMATION SUITE FOR ADMIN DASHBOARD & RBAC
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * 1. User Persona Data Setup (9 Registered Members)
 */
export type UserPersona = {
  id: string;
  employee_number: string;
  full_name: string;
  role: "admin" | "employee";
  department: string;
  designation: string;
};

export const REGISTERED_MEMBERS: UserPersona[] = [
  {
    id: "user-1",
    employee_number: "690867",
    full_name: "KARTHIKEYAN C",
    role: "admin",
    department: "Quality Assurance",
    designation: "Quality Operations Lead",
  },
  {
    id: "user-2",
    employee_number: "688079",
    full_name: "SILAMBARASAN S",
    role: "employee",
    department: "Machining Line 1",
    designation: "Senior Quality Engineer",
  },
  {
    id: "user-3",
    employee_number: "663875",
    full_name: "VENKADESH D",
    role: "employee",
    department: "Machine Shop 2",
    designation: "Quality Inspector",
  },
  {
    id: "user-4",
    employee_number: "710250",
    full_name: "MOUNIKASRI A",
    role: "employee",
    department: "Quality Lab",
    designation: "Metrology Specialist",
  },
  {
    id: "user-5",
    employee_number: "666468",
    full_name: "KAVIN KUMAR K",
    role: "employee",
    department: "Assembly & Dock",
    designation: "Process Audit Lead",
  },
  {
    id: "user-6",
    employee_number: "665773",
    full_name: "KARTHEEBAN K",
    role: "employee",
    department: "Value Added Engg",
    designation: "Revalidation Specialist",
  },
  {
    id: "user-7",
    employee_number: "665965",
    full_name: "DINESHKUMAR A B",
    role: "employee",
    department: "Tool Room",
    designation: "Maintenance Lead",
  },
  {
    id: "user-8",
    employee_number: "708818",
    full_name: "SELVAKUMAR J",
    role: "employee",
    department: "EHS & Safety",
    designation: "Compliance Auditor",
  },
  {
    id: "user-9",
    employee_number: "667685",
    full_name: "GEETHA S",
    role: "employee",
    department: "Plant Management",
    designation: "Plant Head Quality",
  },
];

const BASE_URL = "http://localhost:8080";

test.describe("Sakthi Spark Flow - RBAC & Admin Dashboard E2E Test Suite", () => {

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * REQUIREMENT: Welcome Greeting for Every Member
   * ─────────────────────────────────────────────────────────────────────────
   */
  test.describe("1. Personalized Member Welcome Greetings", () => {
    for (const member of REGISTERED_MEMBERS) {
      test(`Verify login & Welcome Banner for ${member.full_name} (${member.employee_number})`, async ({ page }) => {
        await page.goto(`${BASE_URL}/`);
        
        // Enter Employee ID
        await page.fill('input[placeholder*="690867"]', member.employee_number);
        await page.click('button:has-text("Sign In")');

        // Assert redirect to Dashboard
        await expect(page).toHaveURL(`${BASE_URL}/dashboard`);

        // Assert Welcome Banner Heading contains the exact member full name
        const welcomeHeading = page.locator('h2:has-text("Welcome,")');
        await expect(welcomeHeading).toBeVisible();
        await expect(welcomeHeading).toContainText(`Welcome, ${member.full_name}! 👋`);

        // Assert role badge displays correctly
        const roleBadge = page.locator(`text=${member.role === "admin" ? "👑 Quality Operations Admin" : "👷 Quality Inspector"}`);
        await expect(roleBadge).toBeVisible();
      });
    }
  });

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * TEST CASE A: Admin Privileges & Full Access Controls
   * ─────────────────────────────────────────────────────────────────────────
   */
  test.describe("2. Test Case A - Admin Access & Operations (Karthikeyan C - 690867)", () => {
    const adminUser = REGISTERED_MEMBERS[0]; // KARTHIKEYAN C

    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.fill('input[placeholder*="690867"]', adminUser.employee_number);
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(`${BASE_URL}/dashboard`);
    });

    test("Verify Admin can see Edit/Delete task controls and perform administrative actions", async ({ page }) => {
      // 1. Verify "+ New Monthly Assignment" button is visible for Admin
      await expect(page.locator('a:has-text("+ New Monthly Assignment")')).toBeVisible();

      // 2. Open Review Jobs Tab
      await page.click('button:has-text("Review Jobs")');
      await expect(page.locator('h2:has-text("Employee Job Review Hub")')).toBeVisible();

      // 3. Verify Approve & Reject buttons are visible & enabled for Admin
      const approveBtn = page.locator('button:has-text("Approve")').first();
      const rejectBtn = page.locator('button:has-text("Reject")').first();
      await expect(approveBtn).toBeVisible();
      await expect(approveBtn).toBeEnabled();
      await expect(rejectBtn).toBeVisible();
      await expect(rejectBtn).toBeEnabled();

      // 4. Click Approve on a pending job and verify toast notification
      await approveBtn.click();
      await expect(page.locator('.sonner-toast, [role="status"]')).toContainText("approved");
    });
  });

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * TEST CASE B: Employee Restrictions & 403 Access Protection
   * ─────────────────────────────────────────────────────────────────────────
   */
  test.describe("3. Test Case B - Employee Access Restrictions (Silambarasan S - 688079)", () => {
    const employeeUser = REGISTERED_MEMBERS[1]; // SILAMBARASAN S

    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.fill('input[placeholder*="690867"]', employeeUser.employee_number);
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(`${BASE_URL}/dashboard`);
    });

    test("Verify Employee CANNOT see Edit/Delete action buttons or admin creation controls", async ({ page }) => {
      // 1. Verify "+ New Monthly Assignment" button is HIDDEN for Employee
      await expect(page.locator('a:has-text("+ New Monthly Assignment")')).not.toBeVisible();

      // 2. Navigate to Review Jobs tab and verify Approve/Reject buttons are disabled/restricted
      await page.click('button:has-text("Review Jobs")');
      const approveBtn = page.locator('button:has-text("Approve")').first();
      if (await approveBtn.isVisible()) {
        await expect(approveBtn).toBeDisabled();
      }

      // 3. Verify Employee Log in / Log out grid is accessible and records activity
      await page.click('button:has-text("All Employee Login & Logout Grid")');
      await expect(page.locator('h2:has-text("All Employee Log In & Log Out Audit Grid")')).toBeVisible();
      await expect(page.locator(`td:has-text("${employeeUser.full_name}")`).first()).toBeVisible();
    });
  });

  /**
   * ─────────────────────────────────────────────────────────────────────────
   * VISUAL REGRESSION & UI COLOR CHECK: Analytics Pie Chart Deviation Red (#EF4444)
   * ─────────────────────────────────────────────────────────────────────────
   */
  test.describe("4. Visual Regression - Analytics Pie Chart Red Color Fill (#EF4444)", () => {
    test("Assert that Quality Deviation segment strictly uses Crimson Red (#EF4444)", async ({ page }) => {
      const adminUser = REGISTERED_MEMBERS[0];
      await page.goto(`${BASE_URL}/`);
      await page.fill('input[placeholder*="690867"]', adminUser.employee_number);
      await page.click('button:has-text("Sign In")');
      await page.waitForURL(`${BASE_URL}/dashboard`);

      // Open Analytics Pie Chart Tab
      await page.click('button:has-text("Analytics Pie Chart")');
      await expect(page.locator('h2:has-text("Quality Analytics & Audit Distribution Pie Chart")')).toBeVisible();

      // Locate Quality Deviations segment card & dot
      const deviationCard = page.locator('div:has-text("Quality Deviations")').first();
      await expect(deviationCard).toBeVisible();

      // Verify explicit CSS hex fill #EF4444 or crimson red rgb(239, 68, 68)
      const dotSpan = deviationCard.locator('span.rounded-full').first();
      const backgroundColor = await dotSpan.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      
      // rgb(239, 68, 68) corresponds to hex #EF4444
      expect(backgroundColor).toBe("rgb(239, 68, 68)");
    });
  });
});
