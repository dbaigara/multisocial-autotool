import { publisherWorker } from "./publisher.worker";
import { commentWorker } from "./comment.worker";
import { startFolderWatcher, stopFolderWatcher } from "../lib/watcher";
import { initStarterContentStudio } from "../lib/local-pipeline";
import { startEmbeddedScheduleTicker } from "../lib/redis";

console.log("====================================================");
console.log("🚀 MultiSocial AutoTool Background Workers & Studio");
console.log("   - Embedded Queue & Scheduler: ACTIVE");
console.log("   - Local Folder Studio Watcher: INITIALIZING");
console.log("====================================================");

// Ensure starter content studio folder exists
initStarterContentStudio();

// Start local schedule ticker for due posts
startEmbeddedScheduleTicker();

// Start watching local content folder
startFolderWatcher().then(() => {
  console.log("   - Local Folder Studio Watcher: ACTIVE (Monitoring ./content_studio)");
  console.log("====================================================");
});

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down workers and watcher gracefully...`);
  stopFolderWatcher();
  const promises: Promise<any>[] = [];
  if (publisherWorker) promises.push(publisherWorker.close());
  if (commentWorker) promises.push(commentWorker.close());
  await Promise.all(promises);
  console.log("All services closed. Process exiting.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
