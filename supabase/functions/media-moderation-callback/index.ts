const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const headers = (key: string) => ({ apikey: key, Authorization: "Bearer " + key });
const unsafeKeys = new Set(["sexual_activity", "sexual_display", "erotica", "very_suggestive"]);
function findUnsafe(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) { for (const item of value) { const found = findUnsafe(item); if (found) return found; } return null; }
  const obj = value as Record<string, unknown>;
  const nudity = obj.nudity && typeof obj.nudity === "object" ? obj.nudity as Record<string, unknown> : obj;
  for (const key of unsafeKeys) {
    const score = Number(nudity[key] ?? 0), threshold = key === "erotica" ? 0.05 : key === "very_suggestive" ? 0.15 : 0.02;
    if (Number.isFinite(score) && score >= threshold) return key + " score " + score.toFixed(3);
  }
  for (const [key, child] of Object.entries(obj)) if (key !== "nudity") { const found = findUnsafe(child); if (found) return found; }
  return null;
}
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), supplied = new URL(request.url).searchParams.get("token");
  if (!base || !service || !supplied) return json(401, { error: "Invalid callback" });
  let payload: Record<string, any>;
  try { payload = await request.json(); } catch { return json(400, { error: "Invalid callback payload" }); }
  const mediaId = payload?.media?.id, status = String(payload?.status ?? "");
  if (typeof mediaId !== "string" || !mediaId.startsWith("med_")) return json(400, { error: "Missing media identifier" });
  const assetResponse = await fetch(base + "/rest/v1/media_assets?select=id,post_id,provider_reference,status&callback_token=eq." + encodeURIComponent(supplied) + "&media_type=eq.video&limit=1", { headers: headers(service) });
  if (!assetResponse.ok) return json(503, { error: "Could not locate moderation record" });
  const asset = (await assetResponse.json())[0];
  if (!asset) return json(404, { error: "Unknown moderation callback" });
  if (asset.provider_reference && asset.provider_reference !== mediaId) return json(409, { error: "Media identifier mismatch" });
  const violation = findUnsafe(payload.data ?? payload), finished = status === "finished", failed = status === "failure" || status === "stopped";
  if (violation || failed) {
    const reason = violation ? "Automated screening detected prohibited sexual content: " + violation : "Automated video screening ended with status " + status + "; moderator review required";
    if (asset.post_id) await fetch(base + "/rest/v1/posts?id=eq." + asset.post_id, { method: "PATCH", headers: { ...headers(service), "Content-Type": "application/json" }, body: JSON.stringify({ moderation_hidden: true }) });
    await fetch(base + "/rest/v1/media_assets?id=eq." + asset.id, { method: "PATCH", headers: { ...headers(service), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ provider_reference: mediaId, ...(violation ? { status: "rejected", reviewed_at: new Date().toISOString() } : {}), decision_reason: reason, callback_token: null }) });
    if (asset.post_id) {
      const post = await fetch(base + "/rest/v1/posts?select=image_url&id=eq." + asset.post_id, { headers: headers(service) });
      const postRows = post.ok ? await post.json() : [];
      const publicUrl = postRows[0]?.image_url as string | undefined;
      const prefix = base + "/storage/v1/object/public/post-media/";
      if (publicUrl?.startsWith(prefix)) {
        const path = publicUrl.slice(prefix.length).split("/").map(encodeURIComponent).join("/");
        await fetch(base + "/storage/v1/object/post-media/" + path, { method: "DELETE", headers: headers(service) });
      }
    }
    return json(200, { received: true, hidden: true, status: "flagged_for_human_review" });
  }
  if (finished) {
    const approved = await fetch(base + "/rest/v1/media_assets?id=eq." + asset.id, { method: "PATCH", headers: { ...headers(service), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ provider_reference: mediaId, status: "approved", reviewed_at: new Date().toISOString(), decision_reason: "Automated video screening passed", callback_token: null }) });
    if (!approved.ok) return json(503, { error: "Could not save the video approval" });
    if (asset.post_id) {
      const visible = await fetch(base + "/rest/v1/posts?id=eq." + asset.post_id, { method: "PATCH", headers: { ...headers(service), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ moderation_hidden: false }) });
      if (!visible.ok) return json(503, { error: "Video was approved but its post remains hidden" });
    }
    return json(200, { received: true, status: "approved" });
  }
  await fetch(base + "/rest/v1/media_assets?id=eq." + asset.id + "&provider_reference=is.null", { method: "PATCH", headers: { ...headers(service), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ provider_reference: mediaId }) });
  return json(200, { received: true, status: "ongoing" });
});
