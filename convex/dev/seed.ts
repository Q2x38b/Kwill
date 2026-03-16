import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Sample data for development
const SAMPLE_SENDERS = [
  { email: "sarah.chen@acme.co", name: "Sarah Chen" },
  { email: "mike.johnson@startup.io", name: "Mike Johnson" },
  { email: "notifications@github.com", name: "GitHub" },
  { email: "support@stripe.com", name: "Stripe" },
  { email: "team@figma.com", name: "Figma" },
  { email: "hello@linear.app", name: "Linear" },
  { email: "updates@notion.so", name: "Notion" },
  { email: "alex.rivera@company.com", name: "Alex Rivera" },
  { email: "marketing@producthunt.com", name: "Product Hunt" },
  { email: "noreply@vercel.com", name: "Vercel" },
];

const SAMPLE_SUBJECTS = [
  "Quick sync on Q4 planning",
  "Re: Design review feedback",
  "Your invoice is ready",
  "New comment on your pull request",
  "Weekly digest: Top stories",
  "Invitation: Team standup",
  "Project milestone completed",
  "Important: Security update required",
  "Feedback requested on proposal",
  "Welcome to the team!",
  "Re: Budget approval needed",
  "Meeting notes from yesterday",
  "New feature announcement",
  "Your subscription is expiring",
  "Re: Hiring update",
];

const SAMPLE_SNIPPETS = [
  "Hey! Just wanted to follow up on our conversation from last week about the new project timeline...",
  "Thanks for sending this over. I've reviewed the documents and have a few suggestions...",
  "Your payment of $49.99 has been processed successfully. View your receipt...",
  "You have been mentioned in a comment on issue #234. Click here to view...",
  "Here are the top trending projects and discussions from the past week...",
  "Looking forward to connecting with you tomorrow. Here's the agenda for our meeting...",
  "Great news! The team has completed phase 2 ahead of schedule. Next steps...",
  "We've detected some unusual activity on your account. Please verify...",
  "Could you take a look at the attached proposal and let me know your thoughts?",
  "We're excited to have you join us! Here's everything you need to get started...",
];

const SAMPLE_BODIES = [
  `Hi there,

Just wanted to touch base regarding the Q4 planning session we discussed last week. I've put together a preliminary timeline that I think addresses most of our concerns.

Key milestones:
- October 15: Initial planning complete
- November 1: Development kickoff
- December 15: Beta release

Let me know if you'd like to discuss any of these dates.

Best,
Sarah`,
  `Thanks for sharing the design mockups! I've gone through them and here are my thoughts:

1. The navigation feels intuitive and clean
2. Love the color palette choices
3. One suggestion: could we make the CTA buttons slightly larger on mobile?

Overall, great work! Let's sync up tomorrow to finalize.`,
  `Hey team,

Quick reminder about tomorrow's standup at 10am. Please come prepared with:
- What you accomplished yesterday
- What you're working on today
- Any blockers

See you all there!`,
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): number {
  const now = Date.now();
  const msBack = Math.random() * daysBack * 24 * 60 * 60 * 1000;
  return now - msBack;
}

export const seedSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if we already have sample data
    const existingThreads = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingThreads) {
      return { created: 0, message: "Sample data already exists" };
    }

    const categories: (
      | "primary"
      | "social"
      | "promotions"
      | "updates"
      | undefined
    )[] = ["primary", "primary", "primary", "social", "promotions", "updates", undefined];

    let created = 0;

    // Create 15 sample threads
    for (let i = 0; i < 15; i++) {
      const sender = randomItem(SAMPLE_SENDERS);
      const subject = randomItem(SAMPLE_SUBJECTS);
      const snippet = randomItem(SAMPLE_SNIPPETS);
      const body = randomItem(SAMPLE_BODIES);
      const lastMessageAt = randomDate(14);
      const messageCount = Math.floor(Math.random() * 5) + 1;

      // Create thread
      const threadId = await ctx.db.insert("threads", {
        userId: user._id,
        gmailThreadId: `sample-thread-${i}-${Date.now()}`,
        subject,
        snippet,
        participants: [sender],
        messageCount,
        lastMessageAt,
        isRead: Math.random() > 0.3,
        isStarred: Math.random() > 0.8,
        isArchived: false,
        isTrashed: false,
        hasAttachments: Math.random() > 0.7,
        labels: ["INBOX"],
        category: randomItem(categories),
      });

      // Create messages for the thread
      for (let j = 0; j < messageCount; j++) {
        const messageTime = lastMessageAt - (messageCount - j - 1) * 3600000;
        const isIncoming = j % 2 === 0;

        const messageId = await ctx.db.insert("messages", {
          userId: user._id,
          threadId,
          gmailMessageId: `sample-msg-${i}-${j}-${Date.now()}`,
          from: isIncoming ? sender : { email: user.email, name: user.name },
          to: isIncoming
            ? [{ email: user.email, name: user.name }]
            : [sender],
          subject: j === 0 ? subject : `Re: ${subject}`,
          bodyPlain: body,
          bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
          snippet: snippet.slice(0, 100),
          sentAt: messageTime,
          receivedAt: messageTime,
          attachments:
            j === 0 && Math.random() > 0.7
              ? [
                  {
                    id: `attachment-${i}-${j}`,
                    filename: randomItem([
                      "document.pdf",
                      "image.png",
                      "report.xlsx",
                      "presentation.pptx",
                    ]),
                    mimeType: "application/octet-stream",
                    size: Math.floor(Math.random() * 5000000) + 100000,
                  },
                ]
              : [],
          isIncoming,
        });

        // Add to search index
        await ctx.db.insert("searchIndex", {
          userId: user._id,
          threadId,
          messageId,
          searchableText: `${subject} ${sender.name} ${sender.email} ${body}`,
        });
      }

      created++;
    }

    // Update user's Gmail connected status
    await ctx.db.patch(user._id, { gmailConnected: true });

    return { created, message: `Created ${created} sample threads` };
  },
});

export const clearSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Delete all threads
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const thread of threads) {
      // Delete messages
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }

      // Delete search index entries
      const searchEntries = await ctx.db
        .query("searchIndex")
        .filter((q) => q.eq(q.field("threadId"), thread._id))
        .collect();

      for (const entry of searchEntries) {
        await ctx.db.delete(entry._id);
      }

      await ctx.db.delete(thread._id);
    }

    // Update user's Gmail connected status
    await ctx.db.patch(user._id, { gmailConnected: false });

    return { message: `Cleared ${threads.length} threads` };
  },
});
