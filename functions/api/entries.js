export async function onRequestGet(context) {
  const { env } = context;

  const raw = await env.SEPT_NOTES_KV.get("entries");

  if (!raw) {
    return new Response(JSON.stringify([]), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  return new Response(raw, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}