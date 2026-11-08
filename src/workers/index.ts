import { publisherWorker } from "./publisher.worker";
import { commentWorker } from "./comment.worker";
import { startFolderWatcher, stopFolderWatcher } from "../lib/watcher";
import { initStarterContentStudio } from "../lib/local-pipeline";

console.log("====================================================");
console.log("🚀 MultiSocial AutoTool Background Workers & Studio");
console.log("   - Publisher Queue Worker: ACTIVE");
console.log("   - Comment Automation Worker: ACTIVE");
console.log("   - Local Folder Studio Watcher: INITIALIZING");
console.log("====================================================");

// Ensure starter content studio folder exists
initStarterContentStudio();

// Start watching local content folder
startFolderWatcher().then(() => {
  console.log("   - Local Folder Studio Watcher: ACTIVE (Monitoring ./content_studio)");
  console.log("====================================================");
});

async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down workers and watcher gracefully...`);
  stopFolderWatcher();
  await Promise.all([publisherWorker.close(), commentWorker.close()]);
  console.log("All services closed. Process exiting.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
