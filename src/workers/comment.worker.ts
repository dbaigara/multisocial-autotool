import { Worker, Job } from "bullmq";
import { redisConnection, COMMENT_QUEUE_NAME, CommentJobData } from "../lib/redis";
import { executeCommentJob } from "../lib/comment-service";

export let commentWorker: Worker<CommentJobData> | null = null;

if (redisConnection) {
  try {
    commentWorker = new Worker<CommentJobData>(
      COMMENT_QUEUE_NAME,
      async (job: Job<CommentJobData>) => {
        await executeCommentJob(job.data);
      },
      {
        connection: redisConnection,
        concurrency: 10,
      }
    );
    commentWorker.on("error", () => {
      // suppress unhandled redis worker connection warnings
    });
  } catch {
    console.log("[CommentWorker] Running in embedded mode (BullMQ worker inactive)");
  }
}
