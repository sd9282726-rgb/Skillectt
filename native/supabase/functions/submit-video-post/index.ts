const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json(503, { error: "Video publishing is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in to upload a video" });
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

  let form: FormData;
  try { form = await request.formData(); } catch { return json(400, { error: "Expected multipart form data" }); }
  const file = form.get("file");
  const caption = String(form.get("content") ?? "").trim();
  if (!(file instanceof File)) return json(400, { error: "Choose a video file" });
  const allowed = new Set(["video/mp4", "video/webm", "video/quicktime"]);
  if (!allowed.has(file.type)) return json(415, { error: "Use an MP4, WebM or MOV video" });
  if (file.size < 1 || file.size > 50 * 1024 * 1024) return json(413, { error: "Video must be 50 MB or smaller" });
  if (caption.length > 5000) return json(400, { error: "Caption must be 5,000 characters or fewer" });

  const ext = file.type === "video/mp4" ? "mp4" : file.type === "video/webm" ? "webm" : "mov";
  const path = userId + "/" + crypto.randomUUID() + "." + ext;
  const storedPath = "media-quarantine/" + path;
  const uploaded = await fetch(base + "/storage/v1/object/media-quarantine/" + path.split("/").map(encodeURIComponent).join("/"), {
    method: "POST",
    headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": file.type, "x-upsert": "false" },
    body: file,
  });
  if (!uploaded.ok) return json(502, { error: "Could not upload video to private review storage" });

  const saved = await fetch(base + "/rest/v1/media_assets", {
    method: "POST",
    headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: userId, storage_path: storedPath, status: "pending",
      provider: "manual-moderation", media_type: "video", mime_type: file.type,
      post_content: caption, reviewed_at: null,
      decision_reason: "Awaiting moderator review before publication",
    }),
  });
  const savedText = await saved.text();
  if (!saved.ok) {
    await fetch(base + "/storage/v1/object/media-quarantine/" + path, { method: "DELETE", headers: { apikey: service, Authorization: "Bearer " + service } });
    return json(503, { error: "Video uploaded but its review record could not be created" });
  }
  const rows = savedText ? JSON.parse(savedText) : [];
  return json(202, { status: "pending", media_asset_id: rows[0]?.id, message: "Your video is private until a moderator approves it." });
});
