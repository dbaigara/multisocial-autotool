export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🌟 [MultiSocial Core] Auto-initializing background services in unified process...");
    try {
      const { initStarterContentStudio } = await import("./lib/local-pipeline");
      const { startFolderWatcher } = await import("./lib/watcher");
      const { startEmbeddedScheduleTicker } = await import("./lib/redis");

      initStarterContentStudio();
      startEmbeddedScheduleTicker();
      await startFolderWatcher();
      console.log("🚀 [MultiSocial Core] All services active: Folder Watcher + Auto-Scheduler + In-Memory Queue (Zero extra terminals required!)");
    } catch (err) {
      console.error("[MultiSocial Core] Failed to initialize background services:", err);
    }
  }
}
