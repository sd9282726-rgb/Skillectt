const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const adminHeaders = (key: string) => ({ apikey: key, Authorization: "Bearer " + key });
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const sightUser = Deno.env.get("SIGHTENGINE_API_USER"), sightSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
  if (!base || !anon || !service || !sightUser || !sightSecret) return json(503, { error: "Media safety screening is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });
  const auth = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: authorization } });
  if (!auth.ok) return json(401, { error: "Invalid session" });
  const user = await auth.json(), userId = user?.id as string | undefined;
  if (!userId) return json(401, { error: "Invalid session" });
  const bansResponse = await fetch(base + "/rest/v1/account_enforcements?select=status&user_id=eq." + userId + "&limit=1", { headers: adminHeaders(service) });
  if (!bansResponse.ok) return json(503, { error: "Could not verify account status" });
  if ((await bansResponse.json()).length) return json(403, { error: "This account is restricted" });

  let form: FormData;
  try { form = await request.formData(); } catch { return json(400, { error: "Expected multipart form data" }); }
  const file = form.get("file"), caption = String(form.get("content") ?? "").trim();
  if (!(file instanceof File)) return json(400, { error: "A file field is required" });
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (!allowed.has(file.type)) return json(415, { error: "Unsupported image type" });
  if (file.size < 1 || file.size > 12 * 1024 * 1024 || caption.length > 5000) return json(413, { error: "Image must be 12 MB or smaller and caption no longer than 5,000 characters" });

  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = userId + "/" + crypto.randomUUID() + "." + extension;
  const storageHeaders = { ...adminHeaders(service), "Content-Type": file.type, "x-upsert": "false" };
  const privateUpload = await fetch(base + "/storage/v1/object/media-quarantine/" + path, { method: "POST", headers: storageHeaders, body: file });
  if (!privateUpload.ok) return json(502, { error: "Could not save image in private quarantine" });
  const publicUpload = await fetch(base + "/storage/v1/object/post-media/" + path, { method: "POST", headers: storageHeaders, body: file });
  if (!publicUpload.ok) return json(502, { error: "Could not publish image file" });
  const publicUrl = base + "/storage/v1/object/public/post-media/" + path;

  const assetResponse = await fetch(base + "/rest/v1/media_assets", {
    method: "POST", headers: { ...adminHeaders(service), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ owner_id: userId, storage_path: "media-quarantine/" + path, public_url: publicUrl, post_id: null, status: "pending", provider: "sightengine-nudity-2.1-background", media_type: "image", mime_type: file.type, post_content: caption, decision_reason: "Waiting for automated image screening", reviewed_at: null }),
  });
  const assets = assetResponse.ok ? await assetResponse.json() : [];
  if (!assetResponse.ok || !assets[0]?.id) {
    await fetch(base + "/storage/v1/object/post-media/" + path, { method: "DELETE", headers: adminHeaders(service) });
    await fetch(base + "/storage/v1/object/media-quarantine/" + path, { method: "DELETE", headers: adminHeaders(service) });
    return json(503, { error: "Image uploaded but its moderation record could not be created" });
  }

  const postResponse = await fetch(base + "/rest/v1/posts?select=id", {
    method: "POST", headers: { ...adminHeaders(service), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ author_id: userId, content: caption, image_url: publicUrl, media_type: "image", tags: [], moderation_hidden: true }),
  });
  const postRows = postResponse.ok ? await postResponse.json() : [];
  if (!postResponse.ok || !postRows[0]?.id) {
    await fetch(base + "/rest/v1/media_assets?id=eq." + assets[0].id, { method: "DELETE", headers: adminHeaders(service) });
    await fetch(base + "/storage/v1/object/post-media/" + path, { method: "DELETE", headers: adminHeaders(service) });
    await fetch(base + "/storage/v1/object/media-quarantine/" + path, { method: "DELETE", headers: adminHeaders(service) });
    return json(503, { error: "Image is safely held but the post could not be created" });
  }

  const postId = postRows[0].id;
  const linked = await fetch(base + "/rest/v1/media_assets?id=eq." + assets[0].id, {
    method: "PATCH", headers: { ...adminHeaders(service), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ post_id: postId }),
  });
  if (!linked.ok) {
    await fetch(base + "/rest/v1/posts?id=eq." + postId, { method: "PATCH", headers: { ...adminHeaders(service), "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: true }) });
    await fetch(base + "/storage/v1/object/post-media/" + path, { method: "DELETE", headers: adminHeaders(service) });
    return json(503, { error: "Post remains hidden because its moderation record could not be linked" });
  }

  const moderationTask = moderateImage(base, service, sightUser, sightSecret, file, path, assets[0].id, postId);
  EdgeRuntime.waitUntil(moderationTask);
  return json(202, { status: "pending_moderation", post_id: postId, message: "Your image is hidden until safety screening is complete." });
});

async function moderateImage(base: string, service: string, sightUser: string, sightSecret: string, file: File, path: string, assetId: string, postId: string) {
  const admin = adminHeaders(service);
  try {
    const scanForm = new FormData();
    scanForm.append("media", file, file.name || "upload");
    scanForm.append("models", "nudity-2.1");
    scanForm.append("api_user", sightUser);
    scanForm.append("api_secret", sightSecret);
    const response = await fetch("https://api.sightengine.com/1.0/check.json", { method: "POST", body: scanForm });
    const scan = await response.json();
    if (!response.ok || scan?.status !== "success" || !scan?.nudity) throw new Error("Screening provider returned no usable result");
    const n = scan.nudity;
    const violation = Number(n.sexual_activity ?? 0) >= 0.02 || Number(n.sexual_display ?? 0) >= 0.02 || Number(n.erotica ?? 0) >= 0.05 || Number(n.very_suggestive ?? 0) >= 0.15;
    if (violation) {
      await fetch(base + "/rest/v1/posts?id=eq." + postId, { method: "PATCH", headers: { ...admin, "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: true }) });
      await fetch(base + "/storage/v1/object/post-media/" + path, { method: "DELETE", headers: admin });
      await fetch(base + "/rest/v1/media_assets?id=eq." + assetId, { method: "PATCH", headers: { ...admin, "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected", reviewed_at: new Date().toISOString(), decision_reason: "Automated screening flagged sexual or highly suggestive content" }) });
      return;
    }
    const approved = await fetch(base + "/rest/v1/media_assets?id=eq." + assetId, { method: "PATCH", headers: { ...admin, "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved", reviewed_at: new Date().toISOString(), decision_reason: "Automated image screening passed" }) });
    if (!approved.ok) throw new Error("Could not save image approval");
    const visible = await fetch(base + "/rest/v1/posts?id=eq." + postId, { method: "PATCH", headers: { ...admin, "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: false }) });
    if (!visible.ok) throw new Error("Could not publish approved image post");
  } catch {
    await fetch(base + "/rest/v1/posts?id=eq." + postId, { method: "PATCH", headers: { ...admin, "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: true }) });
    await fetch(base + "/storage/v1/object/post-media/" + path, { method: "DELETE", headers: admin });
    await fetch(base + "/rest/v1/media_assets?id=eq." + assetId, { method: "PATCH", headers: { ...admin, "Content-Type": "application/json" }, body: JSON.stringify({ status: "quarantined", reviewed_at: new Date().toISOString(), decision_reason: "Automated image screening failed; hidden for moderator review" }) });
  }
}
