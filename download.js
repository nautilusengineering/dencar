import dotenv from "dotenv";
import { writeFileSync } from "node:fs";
import { Browserbase } from "@browserbasehq/sdk";

dotenv.config();

async function saveDownloadsOnDisk(sessionId, retryForSeconds = 20000) {
  return new Promise((resolve, reject) => {
    let pooler;
    const timeout = setTimeout(() => {
      if (pooler) {
        clearInterval(pooler);
      }
      reject(new Error("Timeout: No downloads found within the retry period"));
    }, retryForSeconds);

    async function fetchDownloads() {
      try {
        const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
        const response = await bb.sessions.downloads.list(sessionId);
        const downloadBuffer = await response.arrayBuffer();
        
        console.log(`Checking downloads... Buffer size: ${downloadBuffer.byteLength}`);
        
        if (downloadBuffer.byteLength > 0) {
          writeFileSync("downloads.zip", Buffer.from(downloadBuffer));
          clearInterval(pooler);
          clearTimeout(timeout);
          console.log("Downloaded files are in downloads.zip");
          resolve();
        }
      } catch (e) {
        clearInterval(pooler);
        clearTimeout(timeout);
        reject(e);
      }
    }
    
    // Start checking immediately, then every 2 seconds
    fetchDownloads();
    pooler = setInterval(fetchDownloads, 2000);
  });
}

// Get session ID from command line argument
const sessionId = process.argv[2];

if (!sessionId) {
  console.error("Usage: node download.js <session-id>");
  console.error("Get the session ID from running the main script");
  process.exit(1);
}

try {
  await saveDownloadsOnDisk(sessionId);
} catch (error) {
  console.error('Download failed:', error.message);
  process.exit(1);
}
