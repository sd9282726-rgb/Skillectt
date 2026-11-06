// Fail-closed text moderation gateway for Skillect.
// Uses the same Sightengine credentials as the image moderation function.
// Requests must be authenticated with a signed-in Supabase user JWT.
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

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
  const content = String(input.content || "").trim();
  if (!["post", "comment", "message"].includes(type)) return json(400, { error: "Unsupported content type" });
  const maxLength = type === "post" ? 5000 : type === "comment" ? 1500 : 2000;
  if (!content || content.length > maxLength) return json(400, { error: "Text is empty or exceeds the allowed length" });

  try {
    const restrictions = await rest(base, service, "account_enforcements?select=status&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
    if (Array.isArray(restrictions) && restrictions.length > 0) return json(403, { error: "This account is restricted" });
  } catch {
    return json(503, { error: "Could not verify account status" });
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

  let record: Record<string, any>;
  if (type === "post") {
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
  } else if (type === "comment") {
    record = { post_id: String(input.post_id), author_id: userId, content };
    if (input.parent_id) record.parent_id = String(input.parent_id);
  } else {
    record = { conversation_id: String(input.conversation_id), sender_id: userId, content };
  }

  try {
    const table = type === "post" ? "posts" : type === "comment" ? "comments" : "messages";
    const created = await rest(base, service, table + "?select=id", "POST", record);
    return json(200, { status: "approved", id: Array.isArray(created) ? created[0]?.id : null });
  } catch {
    return json(503, { error: "The content passed screening but could not be saved. Nothing was published." });
  }
});
