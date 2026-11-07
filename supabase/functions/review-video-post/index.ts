const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const h = (key: string) => ({ apikey: key, Authorization: "Bearer " + key });
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json(503, { error: "Media moderation is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });
  const auth = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: authorization } });
  if (!auth.ok) return json(401, { error: "Invalid session" });
  const user = await auth.json(), role = user?.app_metadata?.role;
  if (role !== "moderator" && role !== "admin") return json(403, { error: "Moderator access required" });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json(400, { error: "Expected JSON body" }); }
  const id = body.media_asset_id, decision = body.decision;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: "Invalid media_asset_id" });
  if (decision !== "approve" && decision !== "reject") return json(400, { error: "Decision must be approve or reject" });
  const result = await fetch(base + "/rest/v1/media_assets?select=id,post_id,storage_path,status,media_type&id=eq." + id + "&status=in.(pending,quarantined)&media_type=in.(video,image)&limit=1", { headers: h(service) });
  if (!result.ok) return json(503, { error: "Could not load moderation record" });
  const rows = await result.json(), asset = rows[0];
  if (!asset) return json(404, { error: "Pending media not found" });
  if (asset.post_id) {
    const postPatch = await fetch(base + "/rest/v1/posts?id=eq." + asset.post_id, {
      method: "PATCH", headers: { ...h(service), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ moderation_hidden: decision !== "approve" }),
    });
    if (!postPatch.ok) return json(503, { error: "Could not update post visibility; review remains pending" });
  }
  const patch = await fetch(base + "/rest/v1/media_assets?id=eq." + id + "&status=eq.pending", {
    method: "PATCH", headers: { ...h(service), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status: decision === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString(), decision_reason: decision === "approve" ? "Approved by a Skillect moderator" : "Rejected by a Skillect moderator", callback_token: null }),
  });
  if (!patch.ok) {
    if (asset.post_id && decision === "approve") await fetch(base + "/rest/v1/posts?id=eq." + asset.post_id, { method: "PATCH", headers: { ...h(service), "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: true }) });
    return json(503, { error: "Could not save moderation decision" });
  }
  if (decision === "reject") {
    const prefix = "media-quarantine/", stored = String(asset.storage_path || "");
    if (stored.startsWith(prefix)) {
      const path = stored.slice(prefix.length).split("/").map(encodeURIComponent).join("/");
      await fetch(base + "/storage/v1/object/post-media/" + path, { method: "DELETE", headers: h(service) });
    }
  }
  return json(200, { status: decision === "approve" ? "approved" : "rejected", post_id: asset.post_id });
});
