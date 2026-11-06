// Internal notification delivery for Android FCM HTTP v1.
// Invoked by the notifications INSERT trigger through pg_net.
// Required Edge Function secret: FIREBASE_SERVICE_ACCOUNT_JSON.
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function encodeJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}
function equalSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function pemBytes(pem: string): Uint8Array {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(clean);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function firebaseAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = encodeJson({ alg: "RS256", typ: "JWT" }) + "." + encodeJson({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const assertion = unsigned + "." + base64Url(signature);
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) throw new Error("Firebase OAuth token exchange failed");
  const data = await response.json();
  if (!data.access_token) throw new Error("Firebase OAuth response did not include an access token");
  return data.access_token as string;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!base || !serviceKey) return json(503, { error: "Supabase server credentials are unavailable" });
  if (!serviceJson) return json(503, { error: "Android push sender is not configured" });

  const suppliedSecret = request.headers.get("x-push-secret") || "";
  if (!suppliedSecret) return json(401, { error: "Unauthorized" });
  const secretResponse = await fetch(base + "/rest/v1/rpc/get_push_delivery_secret", {
    method: "POST",
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!secretResponse.ok) return json(503, { error: "Push authorization could not be verified" });
  const expectedSecret = await secretResponse.json();
  if (typeof expectedSecret !== "string" || !equalSecret(suppliedSecret, expectedSecret)) {
    return json(401, { error: "Unauthorized" });
  }

  let payload: { notification_id?: string; user_id?: string };
  try { payload = await request.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const notificationId = payload.notification_id;
  const userId = payload.user_id;
  if (!notificationId || !userId) return json(400, { error: "notification_id and user_id are required" });

  const notificationResponse = await fetch(
    base + "/rest/v1/notifications?select=id,user_id,type& id=eq." + encodeURIComponent(notificationId) + "&user_id=eq." + encodeURIComponent(userId),
    { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey } },
  );
  if (!notificationResponse.ok) return json(503, { error: "Notification record could not be verified" });
  const notifications = await notificationResponse.json();
  if (!Array.isArray(notifications) || notifications.length === 0) return json(404, { error: "Notification not found" });

  const tokenResponse = await fetch(
    base + "/rest/v1/device_tokens?select=token&user_id=eq." + encodeURIComponent(userId) + "&platform=eq.android",
    { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey } },
  );
  if (!tokenResponse.ok) return json(503, { error: "Device tokens could not be loaded" });
  const rows = await tokenResponse.json();
  if (!Array.isArray(rows) || rows.length === 0) return json(200, { sent: 0, message: "No Android devices registered" });

  let serviceAccount: Record<string, string>;
  try { serviceAccount = JSON.parse(serviceJson); } catch { return json(503, { error: "Firebase service-account JSON is invalid" }); }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    return json(503, { error: "Firebase service-account JSON is incomplete" });
  }

  let accessToken: string;
  try { accessToken = await firebaseAccessToken(serviceAccount); }
  catch { return json(503, { error: "Could not authenticate with Firebase" }); }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const fcmToken = row.token as string;
    const response = await fetch(
      "https://fcm.googleapis.com/v1/projects/" + encodeURIComponent(serviceAccount.project_id) + "/messages:send",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title: "Skillect", body: "You have new activity" },
            data: { notification_id: notificationId, type: String(notifications[0].type || "activity") },
            android: { priority: "HIGH", notification: { channel_id: "skillect_activity" } },
          },
        }),
      },
    );
    if (response.ok) {
      sent++;
      continue;
    }
    failed++;
    let errorText = "";
    try { errorText = await response.text(); } catch { /* ignore */ }
    if (response.status === 404 || errorText.includes("UNREGISTERED") || errorText.includes("registration-token-not-registered")) {
      await fetch(base + "/rest/v1/device_tokens?platform=eq.android&token=eq." + encodeURIComponent(fcmToken), {
        method: "DELETE",
        headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
      });
    }
  }
  return json(200, { sent, failed });
});
