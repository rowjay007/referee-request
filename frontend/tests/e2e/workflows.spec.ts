import AxeBuilder from "@axe-core/playwright";
import { expect, Page, test } from "@playwright/test";

const now = new Date("2026-08-27T12:00:00.000Z");
const request = {
  id: "request-1",
  activeInvitationId: null,
  refereeName: "Dr. Maya Chen",
  refereeEmail: "maya@example.com",
  refereeRelationship: "Professor",
  institutionName: "Northbridge University",
  programmeName: "MSc Computer Science",
  opportunityType: "academic",
  deadlineAt: "2027-01-30T12:00:00.000Z",
  instructions: "Focus on research and collaboration.",
  confidentialityMode: "confidential",
  organization: "Northbridge University",
  role: "MSc Computer Science",
  countryCode: "GB",
  applicationType: "academic",
  submissionMethod: "portal",
  preferredCompletionAt: "2027-01-25T12:00:00.000Z",
  timezone: "Europe/London",
  candidateContext: "Focus on research and collaboration.",
  whyApplying: "To deepen distributed systems research.",
  relationshipContext: "Research supervisor for two years.",
  traits: "Reliable, analytical, collaborative",
  achievements: "Published a systems paper.",
  outcome: null,
  outcomeNote: null,
  outcomeAt: null,
  status: "draft",
  sentAt: null,
  openedAt: null,
  submittedAt: null,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
};

const contacts = [
  {
    id: "contact-1",
    name: "Dr. Maya Chen",
    email: "maya@example.com",
    relationship: "Professor",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
];

async function mockAPI(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("rr_token", "test-token"),
  );
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/api/v1", "");

    if (path === "/referee-contacts") {
      await route.fulfill({ json: { data: { contacts } } });
      return;
    }
    if (path === "/requests/request-1") {
      await route.fulfill({ json: { data: { request } } });
      return;
    }
    if (path === "/requests/request-1/documents") {
      await route.fulfill({ json: { data: { documents: [] } } });
      return;
    }
    if (path === "/requests/request-1/events") {
      await route.fulfill({ json: { data: { events: [] } } });
      return;
    }
    if (path === "/requests/request-1/readiness") {
      await route.fulfill({
        json: {
          data: {
            requestId: request.id,
            readiness: {
              ready: false,
              missingFields: ["supportingInformation"],
              checklist: {
                refereeInformation: true,
                applicationPurpose: true,
                deadline: true,
                candidateContext: true,
                supportingInformation: false,
              },
            },
          },
        },
      });
      return;
    }
    if (path === "/requests/request-1/invitations") {
      await route.fulfill({ json: { data: { invitations: [] } } });
      return;
    }
    if (path === "/referee/referee-token") {
      await route.fulfill({
        json: {
          data: {
            request: {
              ...request,
              candidateName: "Alex Morgan",
              candidateEmail: "alex@example.com",
              decision: "accepted",
              decidedAt: now.toISOString(),
              documents: [],
              status: "accepted",
            },
          },
        },
      });
      return;
    }
    if (path === "/referee/referee-token/in-progress") {
      await route.fulfill({ json: { data: { status: "in_progress" } } });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { error: { message: "Unmocked API route" } },
    });
  });
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    expect.soft(error.message).not.toContain("Hydration failed");
  });
  await mockAPI(page);
});

test("candidate creates a globally scoped confidential request", async ({
  page,
}) => {
  await page.goto("/dashboard/requests/new");
  await expect(
    page.getByRole("heading", { name: "Create request" }),
  ).toBeVisible();
  await page
    .getByLabel(/Organisation or institution/i)
    .fill("Northbridge University");
  await page.getByLabel(/Programme or role/i).fill("MSc Computer Science");
  await page.getByLabel(/What is this reference for/i).selectOption("academic");
  await page.getByLabel(/ISO country code/i).fill("GB");
  await page.getByLabel(/Submission method/i).selectOption("portal");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Use a saved contact/i).selectOption("contact-1");
  await page
    .getByLabel("Relationship context")
    .fill("Research supervisor for two years.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByRole("group", { name: /reference confidentiality/i }),
  ).toBeVisible();
  await expectAccessible(page);
});

test("candidate edits a draft and sees the complete packet", async ({
  page,
}, testInfo) => {
  await page.goto("/dashboard/requests/request-1");
  await expect(page.getByRole("heading", { name: "Edit draft" })).toBeVisible();
  await expect(page.getByLabel("IANA timezone")).toHaveValue("Europe/London");
  await expect(page.getByText("Confidential", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Repeat request" }),
  ).toBeVisible();
  await expectAccessible(page);
  await page.screenshot({
    path: `test-results/request-detail-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("candidate manages reusable referee contacts", async ({ page }) => {
  await page.goto("/dashboard/settings");
  await expect(
    page.getByRole("heading", { name: "Referee contacts" }),
  ).toBeVisible();
  await expect(page.getByText("Dr. Maya Chen", { exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Add contact" })).toBeVisible();
  await expectAccessible(page);
});

test("referee sees confidentiality and starts the reference", async ({
  page,
}, testInfo) => {
  await page.goto("/referee/referee-token");
  await expect(
    page.getByRole("heading", {
      name: /Alex Morgan is requesting your reference/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/candidate cannot download your submission/i),
  ).toBeVisible();
  await page.getByRole("button", { name: /start reference/i }).click();
  await expect(page.getByText(/Reference started/i)).toBeVisible();
  await expectAccessible(page);
  await page.screenshot({
    path: `test-results/referee-workflow-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("dashboard navigation remains usable at mobile width", async ({
  page,
}) => {
  await page.goto("/dashboard/settings");
  const navigation = page.getByRole("navigation");
  await expect(
    navigation.getByRole("link", { name: "Create request" }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Sign out" }),
  ).toBeVisible();
  await expectAccessible(page);
});
