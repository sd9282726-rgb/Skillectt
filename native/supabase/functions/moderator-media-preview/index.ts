// Returns a very short-lived signed URL for a rejected image to an authenticated moderator.
// The private quarantine object is never made public.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json(503, { error: "Moderator media preview is not configured" });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Authentication required" });
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
  if (!userResponse.ok) return json(401, { error: "Invalid session" });
  const user = await userResponse.json();
  const role = user?.app_metadata?.role;
  if (role !== "moderator" && role !== "admin") return json(403, { error: "Moderator access required" });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json(400, { error: "Expected JSON request body" }); }
  const assetId = body.media_asset_id;
  if (typeof assetId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)) {
    return json(400, { error: "A valid media_asset_id is required" });
  }
  const assetResponse = await fetch(
    `${supabaseUrl}/rest/v1/media_assets?select=id,owner_id,storage_path,status,reviewed_at&id=eq.${assetId}&status=eq.rejected&reviewed_at=is.null&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!assetResponse.ok) return json(503, { error: "Could not load moderation case" });
  const assets = await assetResponse.json();
  const asset = Array.isArray(assets) ? assets[0] : null;
  if (!asset) return json(404, { error: "Rejected media case not found" });
  const prefix = "media-quarantine/";
  const storedPath = asset.storage_path as string;
  if (typeof storedPath !== "string" || !storedPath.startsWith(prefix)) return json(500, { error: "Invalid quarantine object path" });
  const objectPath = storedPath.slice(prefix.length);
  if (!objectPath.startsWith(`${asset.owner_id}/`) || objectPath.includes("..")) return json(500, { error: "Invalid quarantine object ownership" });
  const signedResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/sign/media-quarantine/${objectPath.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 90 }),
    },
  );
  if (!signedResponse.ok) return json(503, { error: "Could not create private preview URL" });
  const signed = await signedResponse.json();
  const signedPath = signed?.signedURL ?? signed?.signedUrl;
  if (typeof signedPath !== "string") return json(503, { error: "Storage did not return a signed preview URL" });
  const signedUrl = signedPath.startsWith("http") ? signedPath : `${supabaseUrl}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;
  return json(200, { signed_url: signedUrl, expires_in: 90 });
});
