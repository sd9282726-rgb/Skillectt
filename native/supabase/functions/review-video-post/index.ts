const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !anon || !service) return json(503, { error: "Video moderation is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });
  const auth = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: authorization } });
  if (!auth.ok) return json(401, { error: "Invalid session" });
  const user = await auth.json();
  const role = user?.app_metadata?.role;
  if (role !== "moderator" && role !== "admin") return json(403, { error: "Moderator access required" });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json(400, { error: "Expected JSON body" }); }
  const id = body.media_asset_id;
  const decision = body.decision;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json(400, { error: "Invalid media_asset_id" });
  if (decision !== "approve" && decision !== "reject") return json(400, { error: "Decision must be approve or reject" });

  const assetResponse = await fetch(base + "/rest/v1/media_assets?select=id,owner_id,storage_path,status,media_type,mime_type,post_content&id=eq." + id + "&status=eq.pending&media_type=eq.video&reviewed_at=is.null&limit=1", {
    headers: { apikey: service, Authorization: "Bearer " + service },
  });
  if (!assetResponse.ok) return json(503, { error: "Could not load pending video" });
  const rows = await assetResponse.json();
  const asset = Array.isArray(rows) ? rows[0] : null;
  if (!asset) return json(404, { error: "Pending video not found" });
  const prefix = "media-quarantine/";
  const storedPath = String(asset.storage_path || "");
  if (!storedPath.startsWith(prefix)) return json(500, { error: "Invalid quarantine path" });
  const objectPath = storedPath.slice(prefix.length);
  if (!objectPath.startsWith(asset.owner_id + "/") || objectPath.includes("..")) return json(500, { error: "Invalid media ownership path" });

  if (decision === "reject") {
    const rejected = await fetch(base + "/rest/v1/media_assets?id=eq." + id + "&status=eq.pending", {
      method: "PATCH",
      headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ status: "rejected", reviewed_at: new Date().toISOString(), decision_reason: "Rejected by a Skillect moderator" }),
    });
    if (!rejected.ok) return json(503, { error: "Could not save moderation decision" });
    return json(200, { status: "rejected" });
  }

  const source = await fetch(base + "/storage/v1/object/media-quarantine/" + objectPath.split("/").map(encodeURIComponent).join("/"), {
    headers: { apikey: service, Authorization: "Bearer " + service },
  });
  if (!source.ok) return json(503, { error: "Private video could not be retrieved" });
  const publishedPath = objectPath;
  const published = await fetch(base + "/storage/v1/object/post-media/" + publishedPath.split("/").map(encodeURIComponent).join("/"), {
    method: "POST",
    headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": asset.mime_type || "video/mp4", "x-upsert": "false" },
    body: await source.arrayBuffer(),
  });
  if (!published.ok) return json(503, { error: "Video was not published. Please retry the approval." });
  const publicUrl = base + "/storage/v1/object/public/post-media/" + publishedPath;
  const postResponse = await fetch(base + "/rest/v1/posts?select=id", {
    method: "POST",
    headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ author_id: asset.owner_id, content: asset.post_content || "", image_url: publicUrl, media_type: "video", tags: [] }),
  });
  const postText = await postResponse.text();
  if (!postResponse.ok) {
    await fetch(base + "/storage/v1/object/post-media/" + publishedPath, { method: "DELETE", headers: { apikey: service, Authorization: "Bearer " + service } });
    return json(503, { error: "Approved video could not be attached to a post" });
  }
  const postRows = postText ? JSON.parse(postText) : [];
  const updated = await fetch(base + "/rest/v1/media_assets?id=eq." + id + "&status=eq.pending", {
    method: "PATCH",
    headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status: "approved", reviewed_at: new Date().toISOString(), decision_reason: "Approved by a Skillect moderator", public_url: publicUrl }),
  });
  if (!updated.ok) {
    if (postRows[0]?.id) await fetch(base + "/rest/v1/posts?id=eq." + postRows[0].id, { method: "DELETE", headers: { apikey: service, Authorization: "Bearer " + service } });
    await fetch(base + "/storage/v1/object/post-media/" + publishedPath, { method: "DELETE", headers: { apikey: service, Authorization: "Bearer " + service } });
    return json(503, { error: "Could not finalize approval. Public video and post were rolled back." });
  }
  return json(200, { status: "approved", post_id: postRows[0]?.id, public_url: publicUrl });
});
