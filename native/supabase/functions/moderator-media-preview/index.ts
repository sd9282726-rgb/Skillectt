// Returns a short-lived signed URL for a private video/image awaiting moderator review.
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json(503, { error: "Moderator media preview is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });
  const auth = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: authorization } });
  if (!auth.ok) return json(401, { error: "Invalid session" });
  const user = await auth.json();
  if (!["moderator", "admin"].includes(user?.app_metadata?.role)) return json(403, { error: "Moderator access required" });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json(400, { error: "Expected JSON request body" }); }
  const id = body.media_asset_id;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json(400, { error: "Invalid media_asset_id" });
  const assetResponse = await fetch(base + "/rest/v1/media_assets?select=id,owner_id,storage_path,status,media_type,mime_type,reviewed_at&id=eq." + id + "&status=in.(pending,rejected)&reviewed_at=is.null&limit=1", {
    headers: { apikey: service, Authorization: "Bearer " + service },
  });
  if (!assetResponse.ok) return json(503, { error: "Could not load moderation case" });
  const rows = await assetResponse.json();
  const asset = Array.isArray(rows) ? rows[0] : null;
  if (!asset) return json(404, { error: "Pending media case not found" });
  const prefix = "media-quarantine/";
  const storedPath = String(asset.storage_path || "");
  if (!storedPath.startsWith(prefix)) return json(500, { error: "Invalid quarantine path" });
  const objectPath = storedPath.slice(prefix.length);
  if (!objectPath.startsWith(asset.owner_id + "/") || objectPath.includes("..")) return json(500, { error: "Invalid media ownership path" });
  const signedResponse = await fetch(base + "/storage/v1/object/sign/media-quarantine/" + objectPath.split("/").map(encodeURIComponent).join("/"), {
    method: "POST",
    headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 180 }),
  });
  if (!signedResponse.ok) return json(503, { error: "Could not create private preview URL" });
  const signed = await signedResponse.json();
  const path = signed?.signedURL ?? signed?.signedUrl;
  if (typeof path !== "string") return json(503, { error: "Storage did not return a signed preview URL" });
  const url = path.startsWith("http") ? path : base + "/storage/v1" + (path.startsWith("/") ? "" : "/") + path;
  return json(200, { signed_url: url, media_type: asset.media_type, mime_type: asset.mime_type, expires_in: 180 });
});
