import dotenv from "dotenv";
import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";

// Configure dotenv
dotenv.config();
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";

/**
 * 🤘 Welcome to Stagehand! Thanks so much for trying us out!
 * 🛠️ CONFIGURATION: stagehand.config.ts will help you configure Stagehand
 *
 * 📝 Check out our docs for more fun use cases, like building agents
 * https://docs.stagehand.dev/
 *
 * 💬 If you have any feedback, reach out to us on Slack!
 * https://stagehand.dev/slack
 *
 * 📚 You might also benefit from the docs for Zod, Browserbase, and Playwright:
 * - https://zod.dev/
 * - https://docs.browserbase.com/
 * - https://playwright.dev/docs/intro
 */
async function main({
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

  // Navigate to a URL
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

  await page.goto("https://admin.dencar.sancsoft.net/consumer/");
  await page.act("Click 'export selection' to download consumers");

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

/**
 * This is the main function that runs when you do npm run start
 *
 * YOU PROBABLY DON'T NEED TO MODIFY ANYTHING BELOW THIS POINT!
 *
 */
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
  await stagehand.close();
}

run();
