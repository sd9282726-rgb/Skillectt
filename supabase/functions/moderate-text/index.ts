// Fail-closed text moderation gateway for Skillect.
// Uses the same Sightengine credentials as the image moderation function.
// Requests must be authenticated with a signed-in Supabase user JWT.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function rest(base: string, key: string, path: string, method = "GET", body?: unknown) {
  const response = await fetch(base + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error("Database request failed: " + response.status + " " + text.slice(0, 200));
  return text ? JSON.parse(text) : null;
}

function ruleMatches(scan: Record<string, any>): string[] {
  const flagged: string[] = [];
  const keys = ["profanity", "personal", "link", "drug", "weapon", "spam", "content-trade", "money-transaction", "extremism", "violence", "self-harm", "medical"];
  for (const key of keys) {
    const entries = scan[key]?.matches;
    if (Array.isArray(entries) && entries.length > 0) {
      const unsafeLinks = key === "link" && entries.every((item: any) => item.category !== "unsafe");
      if (!unsafeLinks) flagged.push(key);
    }
  }
  return flagged;
}

function classify(scan: Record<string, any>): string[] {
  const classes = scan.moderation_classes || {};
  const flagged: string[] = [];
  if (Number(classes.sexual ?? 0) >= 0.15) flagged.push("sexual");
  if (Number(classes.discriminatory ?? 0) >= 0.55) flagged.push("discriminatory");
  if (Number(classes.insulting ?? 0) >= 0.75) flagged.push("insulting");
  if (Number(classes.violent ?? 0) >= 0.55) flagged.push("violent");
  if (Number(classes.toxic ?? 0) >= 0.70) flagged.push("toxic");
  if (Number(classes["self-harm"] ?? 0) >= 0.35) flagged.push("self-harm");
  return [...new Set([...flagged, ...ruleMatches(scan)])];
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });
  const base = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiUser = Deno.env.get("SIGHTENGINE_API_USER");
  const apiSecret = Deno.env.get("SIGHTENGINE_API_SECRET");
  if (!base || !anon || !service || !apiUser || !apiSecret) {
    return json(503, { error: "Skillect safety screening is not configured. Text publishing is paused." });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in to publish" });
  const userResponse = await fetch(base + "/auth/v1/user", {
    headers: { apikey: anon, Authorization: authorization },
  });
  if (!userResponse.ok) return json(401, { error: "Invalid session" });
  const user = await userResponse.json();
  const userId = user?.id as string | undefined;
  if (!userId) return json(401, { error: "Invalid session" });

  let input: Record<string, any>;
  try { input = await request.json(); } catch { return json(400, { error: "Invalid JSON" }); }
  const type = String(input.type || "");
  const profileFields = type === "profile"
    ? [
        String(input.display_name || ""),
        String(input.username || ""),
        String(input.bio || ""),
        String(input.location || ""),
        String(input.website || ""),
        ...(Array.isArray(input.skills) ? input.skills.map(String) : []),
        ...(Array.isArray(input.interests) ? input.interests.map(String) : []),
      ]
    : [];
  const projectFields = type === "project"
    ? [String(input.title || ""), String(input.description || ""), String(input.link || "")]
    : [];
  const content = (type === "profile" ? profileFields.join("\n") : type === "project" ? projectFields.join("\n") : String(input.content || "")).trim();
  if (!["post", "comment", "message", "profile", "media_caption", "project"].includes(type)) return json(400, { error: "Unsupported content type" });
  const maxLength = type === "post" || type === "media_caption" ? 5000 : type === "comment" ? 1500 : type === "profile" ? 1500 : type === "project" ? 2500 : 2000;
  if (!content || content.length > maxLength) return json(400, { error: "Text is empty or exceeds the allowed length" });

  try {
    const restrictions = await rest(base, service, "account_enforcements?select=status&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
    if (Array.isArray(restrictions) && restrictions.length > 0) return json(403, { error: "This account is restricted" });
  } catch {
    return json(503, { error: "Could not verify account status" });
  }

  const communityId = type === "post" && input.community_id ? String(input.community_id) : null;
  if (communityId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(communityId)) {
      return json(400, { error: "Invalid community" });
    }
    try {
      const communities = await rest(base, service, "communities?select=id&id=eq." + encodeURIComponent(communityId) + "&limit=1");
      if (!Array.isArray(communities) || communities.length === 0) return json(404, { error: "Community not found" });
      const memberships = await rest(base, service, "community_members?select=id&community_id=eq." + encodeURIComponent(communityId) + "&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
      if (!Array.isArray(memberships) || memberships.length === 0) return json(403, { error: "Join this community before posting" });
    } catch {
      return json(503, { error: "Could not verify community membership" });
    }
  }

  if (type === "comment" || type === "message") {
    const parentId = String(type === "comment" ? input.post_id || "" : input.conversation_id || "");
    if (!parentId) return json(400, { error: type === "comment" ? "post_id is required" : "conversation_id is required" });
    if (type === "comment") {
      try {
        const posts = await rest(base, service, "posts?select=id,moderation_hidden&id=eq." + encodeURIComponent(parentId) + "&limit=1");
        if (!Array.isArray(posts) || posts.length === 0 || posts[0].moderation_hidden) return json(404, { error: "Post not found" });
      } catch { return json(503, { error: "Could not verify the post" }); }
    } else {
      try {
        const participants = await rest(base, service, "conversation_participants?select=user_id&conversation_id=eq." + encodeURIComponent(parentId));
        if (!Array.isArray(participants) || !participants.some((p: any) => p.user_id === userId)) return json(403, { error: "You are not a participant in this conversation" });
        const others = participants.map((p: any) => p.user_id).filter((id: string) => id !== userId);
        for (const other of others) {
          const filter = "or=(and(blocker_id.eq." + userId + ",blocked_id.eq." + other + "),and(blocker_id.eq." + other + ",blocked_id.eq." + userId + "))";
          const blocks = await rest(base, service, "blocks?select=id&" + filter + "&limit=1");
          if (Array.isArray(blocks) && blocks.length > 0) return json(403, { error: "Messaging is unavailable because one account has blocked the other" });
        }
      } catch { return json(503, { error: "Could not verify conversation permissions" }); }
    }
  }

  const form = new FormData();
  form.append("text", content);
  form.append("lang", "en");
  form.append("mode", "rules,ml");
  form.append("models", "general,self-harm");
  form.append("categories", "profanity,personal,link,drug,weapon,spam,content-trade,money-transaction,extremism,violence,self-harm,medical");
  form.append("opt_countries", "in");
  form.append("api_user", apiUser);
  form.append("api_secret", apiSecret);

  let scan: Record<string, any>;
  try {
    const response = await fetch("https://api.sightengine.com/1.0/text/check.json", { method: "POST", body: form });
    if (!response.ok) return json(503, { error: "Text safety screening is temporarily unavailable. Nothing was published." });
    scan = await response.json();
  } catch {
    return json(503, { error: "Text safety screening is temporarily unavailable. Nothing was published." });
  }
  if (scan.status !== "success" || !scan.moderation_classes) {
    return json(503, { error: "Text safety screening returned no valid decision. Nothing was published." });
  }

  const flags = classify(scan);
  if (flags.length > 0) {
    try {
      await rest(base, service, "moderation_text_cases", "POST", {
        user_id: userId,
        content_type: type,
        content_snapshot: content,
        reason: flags.join(","),
        provider_reference: scan?.request?.id ?? null,
        status: "blocked",
      });
    } catch {
      return json(503, { error: "The flagged text could not be safely recorded. Nothing was published." });
    }
    return json(422, { error: "This text did not pass Skillect's safety check.", categories: flags });
  }

  if (type === "media_caption") return json(200, { status: "approved" });

  let record: Record<string, any>;
  if (type === "profile") {
    record = {};
    if (Object.prototype.hasOwnProperty.call(input, "display_name")) record.display_name = String(input.display_name || "").trim().slice(0, 80);
    if (Object.prototype.hasOwnProperty.call(input, "username")) record.username = String(input.username || "").trim().slice(0, 30);
    if (Object.prototype.hasOwnProperty.call(input, "bio")) record.bio = String(input.bio || "").trim().slice(0, 300);
    if (Object.prototype.hasOwnProperty.call(input, "location")) record.location = String(input.location || "").trim().slice(0, 100);
    if (Object.prototype.hasOwnProperty.call(input, "website")) record.website = String(input.website || "").trim().slice(0, 500);
    if (Object.prototype.hasOwnProperty.call(input, "skills")) record.skills = Array.isArray(input.skills) ? input.skills.map((item: unknown) => String(item).trim().slice(0, 40)).filter(Boolean).slice(0, 20) : [];
    if (Object.prototype.hasOwnProperty.call(input, "interests")) record.interests = Array.isArray(input.interests) ? input.interests.map((item: unknown) => String(item).trim().slice(0, 40)).filter(Boolean).slice(0, 20) : [];
    if (Object.prototype.hasOwnProperty.call(input, "country")) record.country = String(input.country || "").trim().slice(0, 2).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(input, "is_private")) record.is_private = Boolean(input.is_private);
    if (Object.prototype.hasOwnProperty.call(input, "onboarded")) record.onboarded = Boolean(input.onboarded);
  } else if (type === "project") {
    const title = String(input.title || "").trim().slice(0, 100);
    const description = String(input.description || "").trim().slice(0, 2000);
    const link = String(input.link || "").trim().slice(0, 500);
    const status = String(input.status || "in_progress");
    if (!title) return json(400, { error: "Project title is required" });
    if (link && !/^https?:\/\//i.test(link)) return json(400, { error: "Project links must use http or https" });
    if (!["in_progress", "completed", "on_hold"].includes(status)) return json(400, { error: "Invalid project status" });
    record = { author_id: userId, title, description, link: link || null, status };
  } else if (type === "post") {
    const imageUrl = input.image_url ? String(input.image_url) : null;
    if (imageUrl) {
      try {
        const assets = await rest(base, service, "media_assets?select=id&owner_id=eq." + encodeURIComponent(userId) + "&public_url=eq." + encodeURIComponent(imageUrl) + "&status=eq.approved&limit=1");
        if (!Array.isArray(assets) || assets.length === 0) return json(403, { error: "Image has not passed media screening" });
      } catch { return json(503, { error: "Could not verify image approval" }); }
    }
    record = {
      author_id: userId,
      content,
      tags: Array.isArray(input.tags) ? input.tags.slice(0, 10) : [],
      image_url: imageUrl,
    };
    if (input.category) record.category = String(input.category).slice(0, 64);
    if (communityId) record.community_id = communityId;
  } else if (type === "comment") {
    record = { post_id: String(input.post_id), author_id: userId, content };
    if (input.parent_id) record.parent_id = String(input.parent_id);
  } else {
    record = { conversation_id: String(input.conversation_id), sender_id: userId, content };
  }

  try {
    if (type === "profile") {
      await rest(base, service, "profiles?id=eq." + encodeURIComponent(userId), "PATCH", record);
      return json(200, { status: "approved" });
    }
    if (type === "project") {
      const projectId = input.project_id ? String(input.project_id) : null;
      if (projectId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) return json(400, { error: "Invalid project" });
        const owned = await rest(base, service, "projects?select=id&id=eq." + encodeURIComponent(projectId) + "&author_id=eq." + encodeURIComponent(userId) + "&limit=1");
        if (!Array.isArray(owned) || owned.length === 0) return json(404, { error: "Project not found" });
        await rest(base, service, "projects?id=eq." + encodeURIComponent(projectId) + "&author_id=eq." + encodeURIComponent(userId), "PATCH", record);
        return json(200, { status: "approved", id: projectId });
      }
      const createdProject = await rest(base, service, "projects?select=id", "POST", record);
      return json(200, { status: "approved", id: Array.isArray(createdProject) ? createdProject[0]?.id : null });
    }
    const table = type === "post" ? "posts" : type === "comment" ? "comments" : "messages";
    const created = await rest(base, service, table + "?select=id", "POST", record);
    return json(200, { status: "approved", id: Array.isArray(created) ? created[0]?.id : null });
  } catch {
    return json(503, { error: "The content passed screening but could not be saved. Nothing was published." });
  }
});
