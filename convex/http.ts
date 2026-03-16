import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Gmail Push Notification webhook endpoint
 *
 * Gmail sends POST requests here when there are changes to a user's mailbox.
 * The payload contains a base64-encoded message with the user's email and historyId.
 */
http.route({
  path: "/gmail/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const startTime = Date.now();
    console.log("=== Gmail Webhook Received ===");

    try {
      const body = await request.json();

      // Gmail Pub/Sub sends data in this format:
      // { message: { data: base64EncodedString, messageId: string }, subscription: string }
      const message = body.message;

      if (!message?.data) {
        console.log("No message data in webhook payload - might be a subscription confirmation");
        return new Response("OK", { status: 200 });
      }

      // Decode the base64 message
      const decodedData = atob(message.data);
      const notification = JSON.parse(decodedData);

      // notification contains: { emailAddress: string, historyId: string }
      const { emailAddress, historyId } = notification;

      if (!emailAddress) {
        console.log("No email address in notification");
        return new Response("OK", { status: 200 });
      }

      console.log(`Push notification: email=${emailAddress}, historyId=${historyId}, messageId=${message.messageId}`);

      // Trigger incremental sync for this user
      const result = await ctx.runAction(internal.sync.gmail.syncByEmail, {
        email: emailAddress,
        triggeredByPush: true,
      });

      const duration = Date.now() - startTime;
      console.log(`Webhook completed in ${duration}ms: ${JSON.stringify(result)}`);

      return new Response("OK", { status: 200 });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Webhook error after ${duration}ms:`, error);
      // Still return 200 to prevent Gmail from retrying
      return new Response("OK", { status: 200 });
    }
  }),
});

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("OK", { status: 200 });
  }),
});

export default http;
