import dotenv from "dotenv";
import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";

// Configure dotenv
dotenv.config();
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";

export async function login({ page }: { page: Page }) {
  await page.goto("https://admin.dencar.sancsoft.net/customerlogin/login");

  await page.act({
    action: "Type %email% into the email field",
    variables: {
      email: "info@alssuperwash.com",
    },
  });
  await page.act({
    action: "Type %pass% into the password field",
    variables: {
      pass: "FYwVvhjFywwsxXR9SykrHVkU",
    },
  });

  await page.act("Click 'Remember me'");
  await page.act("Click sign in");

  return page;
}

async function main({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  await exportConsumerPasses({
    page,
    context,
    stagehand,
  });
}

export async function exportConsumerPasses({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  // Configure browser download behavior
  const client = await context.newCDPSession(page);
  await client.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "downloads",
    eventsEnabled: true,
  });

  const loggedInPage = await login({ page });

  await loggedInPage.goto("https://admin.dencar.sancsoft.net/consumer/");
  await loggedInPage.act("Click 'export selection' to download consumers");

  // Log session ID for download retrieval
  if (stagehand.browserbaseSessionID) {
    console.log(`Session ID for downloads: ${stagehand.browserbaseSessionID}`);
  }

  stagehand.log({
    category: "dencar",
    message: `Metrics`,
    auxiliary: {
      metrics: {
        value: JSON.stringify(stagehand.metrics),
        type: "object",
      },
    },
  });
}

async function run() {
  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();

  if (StagehandConfig.env === "BROWSERBASE" && stagehand.browserbaseSessionID) {
    console.log(
      boxen(
        `View this session live in your browser: \n${chalk.blue(
          `https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`,
        )}`,
        {
          title: "Browserbase",
          padding: 1,
          margin: 3,
        },
      ),
    );
  }

  const page = stagehand.page;
  const context = stagehand.context;
  await main({
    page,
    context,
    stagehand,
  });
  const res = await fetch("https://n8n.nautilusapp.ai/webhook/dencar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId: stagehand.browserbaseSessionID }),
  });
  const data = await res.json();
  console.log("Response:", data);
  await stagehand.close();
}

run();
