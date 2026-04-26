function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function readEntries(env) {
  const raw = await env.SEPT_NOTES_KV.get("entries");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(env, entries) {
  await env.SEPT_NOTES_KV.put("entries", JSON.stringify(entries, null, 2));
}

function checkAdmin(request, env) {
  const provided = request.headers.get("x-admin-secret");
  return provided && env.ADMIN_SECRET && provided === env.ADMIN_SECRET;
}

export async function onRequestGet(context) {
  const { env } = context;
  const entries = await readEntries(env);
  return json(entries);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!checkAdmin(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let entry;
  try {
    entry = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!entry || !entry.id || !entry.publishedAt || !entry.data) {
    return json({ error: "Missing required entry fields" }, 400);
  }

  const entries = await readEntries(env);

  if (entries.some(item => item.id === entry.id)) {
    return json({ error: "Entry already exists" }, 409);
  }

  entries.push({
    id: entry.id,
    publishedAt: entry.publishedAt,
    expiresAt: entry.expiresAt ?? null,
    data: entry.data
  });

  entries.sort((a, b) => b.publishedAt - a.publishedAt);

  await writeEntries(env, entries);

  return json({ ok: true, entries });
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  if (!checkAdmin(request, env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return json({ error: "Missing entry id" }, 400);
  }

  const entries = await readEntries(env);
  const nextEntries = entries.filter(entry => entry.id !== id);

  if (nextEntries.length === entries.length) {
    return json({ error: "Entry not found" }, 404);
  }

  await writeEntries(env, nextEntries);

  return json({ ok: true, entries: nextEntries });
}