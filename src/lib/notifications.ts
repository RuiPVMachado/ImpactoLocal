import { supabase } from "./supabase";

interface NotificationPayload {
  type:
    | "application_submitted"
    | "application_approved"
    | "application_rejected"
    | "event_created"
    | "event_updated";
  title: string;
  message: string;
  recipients: string[]; // array of email addresses
  metadata?: Record<string, unknown>;
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<void> {
  try {
    await supabase.functions.invoke("send-notification", {
      body: payload,
    });
  } catch (error) {
    // Notifications are non-blocking; log and continue
    console.warn("Notification dispatch failed", error);
  }
}
