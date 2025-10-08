import { supabase } from "./supabase";

export type NotificationResult = {
  success: boolean;
  error?: string;
};

// ========== Notification Payloads ==========

interface ApplicationApprovedPayload {
  type: "application_approved";
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  eventDate?: string;
  organizationName?: string;
  organizationEmail?: string;
}

interface ApplicationRejectedPayload {
  type: "application_rejected";
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  organizationName?: string;
  organizationEmail?: string;
}

interface ApplicationSubmittedPayload {
  type: "application_submitted";
  organizationEmail: string;
  volunteerName: string;
  volunteerEmail: string;
  eventTitle: string;
  eventDate?: string;
  message?: string;
}

type NotificationPayload =
  | ApplicationApprovedPayload
  | ApplicationRejectedPayload
  | ApplicationSubmittedPayload;

// ========== Main Function ==========

export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-notification",
      {
        body: payload,
      }
    );

    if (error) {
      console.error("Edge function error:", error);
      return { success: false, error: error.message };
    }

    if (data && !data.success) {
      console.error("Notification failed:", data.error);
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ========== Helper Functions ==========

export async function notifyApplicationApproved(params: {
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  eventDate?: string;
  organizationName?: string;
  organizationEmail?: string;
}): Promise<NotificationResult> {
  const result = await sendNotification({
    type: "application_approved",
    ...params,
  });

  if (!result.success) {
    console.warn("Failed to send approval notification:", result.error);
  }

  return result;
}

export async function notifyApplicationRejected(params: {
  volunteerEmail: string;
  volunteerName?: string;
  eventTitle?: string;
  organizationName?: string;
  organizationEmail?: string;
}): Promise<NotificationResult> {
  const result = await sendNotification({
    type: "application_rejected",
    ...params,
  });

  if (!result.success) {
    console.warn("Failed to send rejection notification:", result.error);
  }

  return result;
}

export async function notifyApplicationSubmitted(params: {
  organizationEmail: string;
  volunteerName: string;
  volunteerEmail: string;
  eventTitle: string;
  eventDate?: string;
  message?: string;
}): Promise<NotificationResult> {
  const result = await sendNotification({
    type: "application_submitted",
    ...params,
  });

  if (!result.success) {
    console.warn("Failed to send application notification:", result.error);
  }

  return result;
}
