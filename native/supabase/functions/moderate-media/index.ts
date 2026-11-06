// Fail-closed image moderation gateway for Skillect.
// Required Edge Function secrets:
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
// SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const sightUser = Deno.env.get("SIGHTENGINE_API_USER");
  const sightSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
  if (!supabaseUrl || !anonKey || !serviceKey || !sightUser || !sightSecret) {
    return json(503, { error: "Media safety screening is not configured. Image publishing remains disabled." });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!userResponse.ok) return json(401, { error: "Invalid session" });
  const user = await userResponse.json();
  const userId = user?.id as string | undefined;
  if (!userId) return json(401, { error: "Invalid session" });

  const banResponse = await fetch(
    `${supabaseUrl}/rest/v1/account_enforcements?select=status&user_id=eq.${userId}&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!banResponse.ok) return json(503, { error: "Could not verify account status" });
  const bans = await banResponse.json();
  if (Array.isArray(bans) && bans.length > 0) return json(403, { error: "This account is restricted" });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "Expected multipart form data" });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return json(400, { error: "A file field is required" });
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (!allowed.has(file.type)) return json(415, { error: "Unsupported image type" });
  if (file.size < 1 || file.size > 12 * 1024 * 1024) return json(413, { error: "Image must be 12 MB or smaller" });

  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const objectPath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const quarantinePath = `media-quarantine/${objectPath}`;
  const storageHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": file.type,
    "x-upsert": "false",
  };

  const quarantineUpload = await fetch(
    `${supabaseUrl}/storage/v1/object/media-quarantine/${objectPath}`,
    { method: "POST", headers: storageHeaders, body: file },
  );
  if (!quarantineUpload.ok) return json(502, { error: "Could not place image in private quarantine" });

  const scanForm = new FormData();
  scanForm.append("media", file, file.name || `upload.${extension}`);
  scanForm.append("models", "nudity-2.1");
  scanForm.append("api_user", sightUser);
  scanForm.append("api_secret", sightSecret);

  let scan: Record<string, any>;
  try {
    const scanResponse = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: scanForm,
    });
    if (!scanResponse.ok) {
      await registerAsset(supabaseUrl, serviceKey, userId, quarantinePath, "pending", null, "Screening provider unavailable");
      return json(503, { error: "Image screening failed. The image was kept private and was not published." });
    }
    scan = await scanResponse.json();
  } catch {
    await registerAsset(supabaseUrl, serviceKey, userId, quarantinePath, "pending", null, "Screening provider unavailable");
    return json(503, { error: "Image screening failed. The image was kept private and was not published." });
  }

  if (scan.status !== "success" || !scan.nudity) {
    await registerAsset(supabaseUrl, serviceKey, userId, quarantinePath, "pending", scan?.request?.id ?? null, "Unusable screening result");
    return json(503, { error: "Image screening returned no valid decision. The image was not published." });
  }

  const nudity = scan.nudity;
  const unsafe = Number(nudity.sexual_activity ?? 0) >= 0.02
    || Number(nudity.sexual_display ?? 0) >= 0.02
    || Number(nudity.erotica ?? 0) >= 0.05
    || Number(nudity.very_suggestive ?? 0) >= 0.15;
  if (unsafe) {
    await registerAsset(supabaseUrl, serviceKey, userId, quarantinePath, "rejected", scan?.request?.id ?? null, "Automated screening rejected sexual or highly suggestive content");
    return json(422, { error: "This image did not pass Skillect's safety check." });
  }

  const quarantinedFile = await fetch(
    `${supabaseUrl}/storage/v1/object/media-quarantine/${objectPath}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!quarantinedFile.ok) {
    await registerAsset(supabaseUrl, serviceKey, userId, quarantinePath, "pending", scan?.request?.id ?? null, "Could not retrieve quarantined media");
    return json(503, { error: "Image remains private because publication could not be completed." });
  }

  const publishResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/post-media/${objectPath}`,
    { method: "POST", headers: storageHeaders, body: await quarantinedFile.arrayBuffer() },
  );
  if (!publishResponse.ok) {
    await registerAsset(supabaseUrl, serviceKey, userId, quarantinePath, "pending", scan?.request?.id ?? null, "Approved image could not be copied to public storage");
    return json(503, { error: "Image passed screening but could not be published. It remains private." });
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/post-media/${objectPath}`;
  const saved = await registerAsset(supabaseUrl, serviceKey, userId, quarantinePath, "approved", scan?.request?.id ?? null, null, publicUrl);
  if (!saved) return json(503, { error: "Image was screened but its approval record could not be saved." });
  return json(200, { status: "approved", public_url: publicUrl });
});

async function registerAsset(
  base: string,
  key: string,
  ownerId: string,
  storagePath: string,
  status: "pending" | "approved" | "rejected",
  providerReference: string | null,
  reason: string | null,
  publicUrl: string | null = null,
): Promise<boolean> {
  const response = await fetch(`${base}/rest/v1/media_assets`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      owner_id: ownerId,
      storage_path: storagePath,
      status,
      provider: "sightengine-nudity-2.1",
      provider_reference: providerReference,
      decision_reason: reason,
      public_url: publicUrl,
      reviewed_at: status === "pending" ? null : new Date().toISOString(),
    }),
  });
  return response.ok;
}
