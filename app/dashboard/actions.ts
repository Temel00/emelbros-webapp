"use server";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export async function triggerLaundry(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const stage = String(formData.get("stage") || "").trim();

  if (!stage) {
    return { ok: false, error: "Please select a laundry stage" };
  }

  const webhookUrl = process.env.LAUNDRY_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, error: "Webhook URL not configured" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flow: "laundry",
        stage,
        triggered_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      console.log(res.bodyUsed);
      return { ok: false, error: `Webhook failed (${res.status})` };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Webhook request failed",
    };
  }

  return { ok: true };
}

export async function triggerWebhook(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const flow = String(formData.get("flow") || "").trim();

  if (!flow) {
    return { ok: false, error: "Flow is required" };
  }

  const envKey = String(formData.get("envKey") || "").trim();
  if (!envKey) {
    return { ok: false, error: "Webhook env key is required" };
  }

  const webhookUrl = process.env[envKey];
  if (!webhookUrl) {
    return { ok: false, error: "Webhook URL not configured" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flow,
        triggered_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Webhook failed (${res.status})` };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Webhook request failed",
    };
  }

  return { ok: true };
}
