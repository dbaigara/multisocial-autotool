import { Queue } from "bullmq";
import Redis from "ioredis";
import { executePublishJob, PublishJobPayload } from "./publisher-service";
import { executeCommentJob, CommentJobPayload } from "./comment-service";
import { prisma } from "./prisma";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const PUBLISH_QUEUE_NAME = "publish-queue";
export const COMMENT_QUEUE_NAME = "comment-queue";

export type PublishJobData = PublishJobPayload;
export type CommentJobData = CommentJobPayload;

let isRedisAvailable = false;
let redisClient: Redis | null = null;
let bullPublishQueue: Queue<PublishJobData> | null = null;
let bullCommentQueue: Queue<CommentJobData> | null = null;

// Initialize Redis with a fast timeout check
try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    retryStrategy(times) {
      if (times > 2) return null; // stop retrying after 2 attempts
      return 1000;
    },
    lazyConnect: true,
  });

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    console.log("[Queue] Connected to Redis. BullMQ active.");
  });

  redisClient.on("error", () => {
    isRedisAvailable = false;
  });

  // Attempt initial connect silently
  redisClient.connect().then(() => {
    isRedisAvailable = true;
    bullPublishQueue = new Queue<PublishJobData>(PUBLISH_QUEUE_NAME, {
      connection: redisClient!,
    });
    bullCommentQueue = new Queue<CommentJobData>(COMMENT_QUEUE_NAME, {
      connection: redisClient!,
    });
  }).catch(() => {
    isRedisAvailable = false;
    console.log("ℹ️  [Queue] Redis not detected. Running with embedded in-memory queue & local scheduler (Zero-Docker mode active).");
  });
} catch {
  isRedisAvailable = false;
}

export const redisConnection = redisClient;
export const publishQueue = bullPublishQueue;
export const commentQueue = bullCommentQueue;

/**
 * Schedule a post for publishing. Works with Redis (BullMQ) or Embedded In-Memory Runner.
 */
export async function schedulePostPublishing(
  postId: string,
  workspaceId: string,
  scheduledFor?: Date | null
) {
  const targetTime = scheduledFor ? new Date(scheduledFor).getTime() : Date.now();
  const delay = Math.max(0, targetTime - Date.now());

  if (isRedisAvailable && bullPublishQueue) {
    return bullPublishQueue.add(
      `publish-${postId}`,
      { postId, workspaceId },
      { delay, jobId: `post-${postId}` }
    );
  }

  // Embedded runner
  if (delay <= 0) {
    // Publish immediately in background
    setTimeout(() => {
      executePublishJob({ postId, workspaceId }).catch((e) =>
        console.error(`[EmbeddedQueue] Error executing publish job ${postId}:`, e)
      );
    }, 100);
  } else {
    // Schedule via in-memory timer
    console.log(`[EmbeddedQueue] Scheduled post ${postId} for execution in ${Math.round(delay / 1000)}s`);
    setTimeout(() => {
      executePublishJob({ postId, workspaceId }).catch((e) =>
        console.error(`[EmbeddedQueue] Error executing scheduled publish job ${postId}:`, e)
      );
    }, delay);
  }

  return { id: `embedded-${postId}` };
}

/**
 * Enqueue a comment trigger for processing. Works with Redis (BullMQ) or Embedded In-Memory Runner.
 */
export async function enqueueCommentTrigger(data: CommentJobData) {
  if (isRedisAvailable && bullCommentQueue) {
    return bullCommentQueue.add(`comment-${data.commentId}`, data, {
      jobId: `comment-${data.commentId}`,
    });
  }

  // Embedded runner execution
  setTimeout(() => {
    executeCommentJob(data).catch((e) =>
      console.error(`[EmbeddedQueue] Error executing comment job for ${data.commentId}:`, e)
    );
  }, 50);

  return { id: `embedded-comment-${data.commentId}` };
}

// Global embedded cron ticker to process missed or scheduled posts from SQLite
let tickerStarted = false;
export function startEmbeddedScheduleTicker() {
  if (tickerStarted) return;
  tickerStarted = true;

  console.log("⏱️  [EmbeddedScheduler] Started local schedule poller (every 10s)");
  setInterval(async () => {
    try {
      const now = new Date();
      const duePosts = await prisma.post.findMany({
        where: {
          status: "SCHEDULED",
          scheduledFor: {
            lte: now,
          },
        },
        take: 10,
      });

      for (const post of duePosts) {
        console.log(`⏱️  [EmbeddedScheduler] Triggering due post: ${post.id}`);
        // Temporarily mark as processing to avoid duplicate runs
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "PROCESSING" as any },
        });

        executePublishJob({ postId: post.id, workspaceId: post.workspaceId }).catch((err) => {
          console.error(`⏱️  [EmbeddedScheduler] Error publishing due post ${post.id}:`, err);
        });
      }
    } catch {
      // ignore transient db errors
    }
  }, 10000);
}
