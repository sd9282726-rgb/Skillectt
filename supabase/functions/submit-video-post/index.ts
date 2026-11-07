const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const safePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");
const adminHeaders = (key: string) => ({ apikey: key, Authorization: "Bearer " + key });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const sightUser = Deno.env.get("SIGHTENGINE_API_USER");
  const sightSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
  if (!base || !anon || !service || !sightUser || !sightSecret) return json(503, { error: "Video moderation is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in to publish a video" });
  const auth = await fetch(base + "/auth/v1/user", { headers: { apikey: anon, Authorization: authorization } });
  if (!auth.ok) return json(401, { error: "Invalid session" });
  const user = await auth.json();
  const userId = user?.id as string | undefined;
  if (!userId) return json(401, { error: "Invalid session" });

  const account = await fetch(base + "/rest/v1/account_enforcements?select=status&user_id=eq." + encodeURIComponent(userId) + "&limit=1", { headers: adminHeaders(service) });
  if (!account.ok) return json(503, { error: "Could not verify account status" });
  if ((await account.json()).length) return json(403, { error: "This account is restricted" });

  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return json(400, { error: "Expected JSON body" }); }
  const storagePath = input.storage_path;
  const caption = String(input.content ?? "").trim();
  if (typeof storagePath !== "string" || !storagePath.startsWith(userId + "/") || storagePath.includes("..")) return json(400, { error: "Invalid video storage path" });
  const extension = storagePath.split(".").pop()?.toLowerCase();
  const mimeByExt: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
  if (!extension || !mimeByExt[extension] || caption.length > 5000) return json(415, { error: "Use MP4, WebM or MOV video and a caption up to 5,000 characters" });

  const encoded = safePath(storagePath);
  const source = await fetch(base + "/storage/v1/object/media-quarantine/" + encoded, { headers: adminHeaders(service) });
  if (!source.ok) return json(404, { error: "Private video upload was not found" });
  const bytes = await source.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 50 * 1024 * 1024) return json(413, { error: "Video must be 50 MB or smaller" });

  const publicUpload = await fetch(base + "/storage/v1/object/post-media/" + encoded, {
    method: "POST",
    headers: { ...adminHeaders(service), "Content-Type": mimeByExt[extension], "x-upsert": "false" },
    body: bytes,
  });
  if (!publicUpload.ok) return json(503, { error: "Could not publish the video file" });
  const publicUrl = base + "/storage/v1/object/public/post-media/" + storagePath;
  const callbackToken = crypto.randomUUID() + crypto.randomUUID();
  const assetResponse = await fetch(base + "/rest/v1/media_assets", {
    method: "POST",
    headers: { ...adminHeaders(service), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: userId, storage_path: "media-quarantine/" + storagePath, public_url: publicUrl,
      status: "pending", provider: "sightengine-video-nudity-2.1", media_type: "video",
      mime_type: mimeByExt[extension], post_content: caption, post_id: null,
      callback_token: callbackToken, reviewed_at: null, decision_reason: "Waiting for automated video screening",
    }),
  });
  const assetRows = assetResponse.ok ? await assetResponse.json() : [];
  if (!assetResponse.ok || !assetRows[0]?.id) {
    await fetch(base + "/storage/v1/object/post-media/" + encoded, { method: "DELETE", headers: adminHeaders(service) });
    return json(503, { error: "Video is held safely but its moderation record could not be created" });
  }

  const postResponse = await fetch(base + "/rest/v1/posts?select=id", {
    method: "POST",
    headers: { ...adminHeaders(service), "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ author_id: userId, content: caption, image_url: publicUrl, media_type: "video", tags: [], moderation_hidden: true }),
  });
  const postRows = postResponse.ok ? await postResponse.json() : [];
  if (!postResponse.ok || !postRows[0]?.id) {
    await fetch(base + "/rest/v1/media_assets?id=eq." + assetRows[0].id, { method: "DELETE", headers: adminHeaders(service) });
    await fetch(base + "/storage/v1/object/post-media/" + encoded, { method: "DELETE", headers: adminHeaders(service) });
    return json(503, { error: "Video is held safely but the post could not be created" });
  }
  const postId = postRows[0].id;
  const linked = await fetch(base + "/rest/v1/media_assets?id=eq." + assetRows[0].id, {
    method: "PATCH",
    headers: { ...adminHeaders(service), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ post_id: postId }),
  });
  if (!linked.ok) {
    await fetch(base + "/rest/v1/posts?id=eq." + postId, { method: "PATCH", headers: { ...adminHeaders(service), "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: true }) });
    return json(503, { error: "Video post remains hidden because its moderation record could not be linked" });
  }

  const signedResponse = await fetch(base + "/storage/v1/object/sign/media-quarantine/" + encoded, {
    method: "POST",
    headers: { ...adminHeaders(service), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  const signed = signedResponse.ok ? await signedResponse.json() : null;
  const signedPath = signed?.signedURL || signed?.signedUrl;
  if (!signedPath) {
    await hideForReview(base, service, postRows[0].id, assetRows[0].id, "Could not create a private URL for automated video screening");
    return json(202, { status: "published_pending_review", post_id: postRows[0].id, message: "Post published; moderation could not start, so it has been hidden for safety review." });
  }
  const streamUrl = signedPath.startsWith("http") ? signedPath : base + signedPath;
  const callbackUrl = base + "/functions/v1/media-moderation-callback?token=" + encodeURIComponent(callbackToken);
  const params = new URLSearchParams({ stream_url: streamUrl, models: "nudity-2.1", callback_url: callbackUrl, api_user: sightUser, api_secret: sightSecret });
  let submitted: any;
  try {
    const response = await fetch("https://api.sightengine.com/1.0/video/check.json", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
    submitted = await response.json();
    if (!response.ok || submitted?.status !== "success" || !submitted?.media?.id) throw new Error("Sightengine did not accept the video");
  } catch {
    await hideForReview(base, service, postRows[0].id, assetRows[0].id, "Automated video screening could not be started; moderator review required");
    return json(202, { status: "published_pending_review", post_id: postRows[0].id, message: "Post was published and then hidden because screening could not start. It is flagged for moderator review." });
  }

  await fetch(base + "/rest/v1/media_assets?id=eq." + assetRows[0].id, {
    method: "PATCH",
    headers: { ...adminHeaders(service), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ provider_reference: submitted.media.id, decision_reason: "Published; automated video screening is running" }),
  });
  return json(202, { status: "pending_moderation", post_id: postId, message: "Your video is hidden until safety screening is complete.", provider_reference: submitted.media.id });
});

async function hideForReview(base: string, service: string, postId: string, assetId: string, reason: string) {
  await fetch(base + "/rest/v1/posts?id=eq." + postId, { method: "PATCH", headers: { ...adminHeaders(service), "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: true }) });
  await fetch(base + "/rest/v1/media_assets?id=eq." + assetId, { method: "PATCH", headers: { ...adminHeaders(service), "Content-Type": "application/json" }, body: JSON.stringify({ decision_reason: reason }) });
}
