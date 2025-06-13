import dotenv from "dotenv";
import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";

// Configure dotenv
dotenv.config();
import StagehandConfig from "./stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";
import { setTimeout } from "timers";

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

async function setupDownloadBehavior(context: BrowserContext, page: Page) {
  const client = await context.newCDPSession(page);
  await client.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "downloads",
    eventsEnabled: true,
  });
}

async function sendWebhookNotification(
  stagehand: Stagehand,
  webhookUrl: string,
  category: string,
) {
  if (stagehand.browserbaseSessionID) {
    console.log(`Session ID for downloads: ${stagehand.browserbaseSessionID}`);
  }

  stagehand.log({
    category,
    message: `Metrics`,
    auxiliary: {
      metrics: {
        value: JSON.stringify(stagehand.metrics),
        type: "object",
      },
    },
  });

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId: stagehand.browserbaseSessionID }),
  });
  const data = await res.json();
  console.log("Response:", data);
}

async function genericExport({
  page,
  context,
  stagehand,
  url,
  action,
  webhookUrl,
  category,
}: {
  page: Page;
  context: BrowserContext;
  stagehand: Stagehand;
  url: string;
  action: string;
  webhookUrl: string;
  category: string;
}) {
  await page.goto(url);
  await page.act(action);
  await sendWebhookNotification(stagehand, webhookUrl, category);
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
  await setupDownloadBehavior(context, page);
  const loggedInPage = await login({ page });

  await new Promise((resolve) => setTimeout(resolve, 5_000));

  await genericExport({
    page: loggedInPage,
    context,
    stagehand,
    url: "https://admin.dencar.sancsoft.net/consumer/",
    action: "Click 'export selection' to download consumers",
    webhookUrl: "https://n8n.nautilusapp.ai/webhook/dencar-consumers",
    category: "Dencar - Consumers",
  });

  await new Promise((resolve) => setTimeout(resolve, 5_000));

  await genericExport({
    page: loggedInPage,
    context,
    stagehand,
    url: "https://admin.dencar.sancsoft.net/consumerpass/?currentPage=1&itemsPerPage=2000&CustomerPassId=&ConsumerFirstName=&ConsumerLastName=&MobileNumber=&ConsumerCode=&StartDate=&EndDate=&Active=true&Canceled=true&Suspended=true&Expired=true&Suspending=true&Pending=true&Unregistered=true&CreditCardStatus=&TouchMode=",
    action: "Click 'export passes' to download consumer passes",
    webhookUrl: "https://n8n.nautilusapp.ai/webhook/dencar-consumer-passes",
    category: "Dencar - Consumer Passes",
  });

  await new Promise((resolve) => setTimeout(resolve, 5_000));

  await genericExport({
    page: loggedInPage,
    context,
    stagehand,
    url: "https://admin.dencar.sancsoft.net/payment/?currentPage=1&itemsPerPage=10&PaymentType=&SiteId=&DeviceId=&PassState=&StartDate=2023-06-06&EndDate=&LicensePlateNum=&Code=&ConsumerFirstName=&ConsumerLastName=&ConsumerId=",
    action: "Click 'Export Selection'",
    webhookUrl: "https://n8n.nautilusapp.ai/webhook/dencar-transactions",
    category: "Dencar - Payments",
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
  await stagehand.close();
}

run();
