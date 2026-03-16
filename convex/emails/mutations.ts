import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const markAsRead = mutation({
  args: {
    threadId: v.id("threads"),
    isRead: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.threadId, { isRead: args.isRead });
  },
});

export const toggleStar = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.threadId, { isStarred: !thread.isStarred });
  },
});

export const archive = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.threadId, { isArchived: true });
  },
});

export const unarchive = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.threadId, { isArchived: false });
  },
});

export const moveToTrash = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.threadId, { isTrashed: true });
  },
});

export const restoreFromTrash = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.threadId, { isTrashed: false });
  },
});

export const permanentDelete = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || thread.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Delete all messages in the thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete search index entries
    const searchEntries = await ctx.db
      .query("searchIndex")
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .collect();

    for (const entry of searchEntries) {
      await ctx.db.delete(entry._id);
    }

    // Delete the thread
    await ctx.db.delete(args.threadId);
  },
});

export const saveDraft = mutation({
  args: {
    draftId: v.optional(v.id("drafts")),
    to: v.array(v.string()),
    cc: v.optional(v.array(v.string())),
    bcc: v.optional(v.array(v.string())),
    subject: v.string(),
    body: v.string(),
    replyToThreadId: v.optional(v.id("threads")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const now = Date.now();

    if (args.draftId) {
      // Update existing draft
      await ctx.db.patch(args.draftId, {
        to: args.to,
        cc: args.cc,
        bcc: args.bcc,
        subject: args.subject,
        body: args.body,
        updatedAt: now,
      });
      return args.draftId;
    }

    // Create new draft
    const draftId = await ctx.db.insert("drafts", {
      userId: user._id,
      to: args.to,
      cc: args.cc,
      bcc: args.bcc,
      subject: args.subject,
      body: args.body,
      replyToThreadId: args.replyToThreadId,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });

    return draftId;
  },
});

export const deleteDraft = mutation({
  args: {
    draftId: v.id("drafts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const draft = await ctx.db.get(args.draftId);
    if (!draft) {
      throw new Error("Draft not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user || draft.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.draftId);
  },
});
