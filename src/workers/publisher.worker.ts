import { Worker, Job } from "bullmq";
import { redisConnection, PUBLISH_QUEUE_NAME, PublishJobData } from "../lib/redis";
import { executePublishJob } from "../lib/publisher-service";

export let publisherWorker: Worker<PublishJobData> | null = null;

if (redisConnection) {
  try {
    publisherWorker = new Worker<PublishJobData>(
      PUBLISH_QUEUE_NAME,
      async (job: Job<PublishJobData>) => {
        await executePublishJob(job.data);
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );
    publisherWorker.on("error", () => {
      // suppress unhandled redis worker connection warnings
    });
  } catch {
    console.log("[PublisherWorker] Running in embedded mode (BullMQ worker inactive)");
  }
}
