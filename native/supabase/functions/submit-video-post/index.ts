const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json(503, { error: "Video publishing is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in to submit a video" });
  const auth = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: authorization } });
  if (!auth.ok) return json(401, { error: "Invalid session" });
  const user = await auth.json();
  const userId = user?.id as string | undefined;
  if (!userId) return json(401, { error: "Invalid session" });

  const account = await fetch(base + "/rest/v1/account_enforcements?select=status&user_id=eq." + encodeURIComponent(userId) + "&limit=1", {
    headers: { apikey: service, Authorization: "Bearer " + service },
  });
  if (!account.ok) return json(503, { error: "Could not verify account status" });
  const restrictions = await account.json();
  if (Array.isArray(restrictions) && restrictions.length) return json(403, { error: "This account is restricted" });

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return json(400, { error: "Expected JSON body" }); }
  const storagePath = input.storage_path;
  const caption = String(input.content ?? "").trim();
  if (typeof storagePath !== "string" || !storagePath.startsWith(userId + "/") || storagePath.includes("..")) {
    return json(400, { error: "Invalid video storage path" });
  }
  const extension = storagePath.split(".").pop()?.toLowerCase();
  const allowedExtensions = new Set(["mp4", "webm", "mov"]);
  if (!extension || !allowedExtensions.has(extension)) return json(415, { error: "Use an MP4, WebM or MOV video" });
  if (caption.length > 5000) return json(400, { error: "Caption must be 5,000 characters or fewer" });

  const head = await fetch(base + "/storage/v1/object/media-quarantine/" + storagePath.split("/").map(encodeURIComponent).join("/"), {
    method: "HEAD",
    headers: { apikey: service, Authorization: "Bearer " + service },
  });
  if (!head.ok) return json(404, { error: "Video upload was not found in your private storage" });
  const size = Number(head.headers.get("content-length") || 0);
  const mime = (head.headers.get("content-type") || "").split(";")[0].toLowerCase();
  const allowedMime = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  if (size < 1 || size > 50 * 1024 * 1024 || !allowedMime.has(mime)) {
    await fetch(base + "/storage/v1/object/media-quarantine/" + storagePath, { method: "DELETE", headers: { apikey: service, Authorization: "Bearer " + service } });
    return json(415, { error: "Video must be MP4, WebM or MOV and no larger than 50 MB" });
  }

  const saved = await fetch(base + "/rest/v1/media_assets", {
    method: "POST",
    headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: userId, storage_path: "media-quarantine/" + storagePath, status: "pending",
      provider: "manual-moderation", media_type: "video", mime_type: mime,
      post_content: caption, reviewed_at: null,
      decision_reason: "Awaiting moderator review before publication",
    }),
  });
  const savedText = await saved.text();
  if (!saved.ok) return json(503, { error: "Video uploaded but its review record could not be created" });
  const rows = savedText ? JSON.parse(savedText) : [];
  return json(202, { status: "pending", media_asset_id: rows[0]?.id, message: "Your video is private until a moderator approves it." });
});
