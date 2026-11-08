import { Queue } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Redis client with lazy connect and auto-reconnect
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

// Queues for background tasks
export const PUBLISH_QUEUE_NAME = "publish-queue";
export const COMMENT_QUEUE_NAME = "comment-queue";

export interface PublishJobData {
  postId: string;
  workspaceId: string;
}

export interface CommentJobData {
  platform: "INSTAGRAM" | "YOUTUBE";
  workspaceId: string;
  socialAccountId?: string;
  postId?: string;
  commentId: string;
  commentText: string;
  authorUsername: string;
  authorId?: string;
}

export const publishQueue = new Queue<PublishJobData>(PUBLISH_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const commentQueue = new Queue<CommentJobData>(COMMENT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: 200,
    removeOnFail: 1000,
  },
});

export async function schedulePostPublishing(postId: string, workspaceId: string, scheduledFor?: Date | null) {
  const delay = scheduledFor ? Math.max(0, new Date(scheduledFor).getTime() - Date.now()) : 0;
  return publishQueue.add(
    `publish-${postId}`,
    { postId, workspaceId },
    {
      delay,
      jobId: `post-${postId}`,
    }
  );
}

export async function enqueueCommentTrigger(data: CommentJobData) {
  return commentQueue.add(
    `comment-${data.commentId}`,
    data,
    {
      jobId: `comment-${data.commentId}`,
    }
  );
}
