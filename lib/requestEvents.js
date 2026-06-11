// Server-side helper for writing system-event rows into request_updates.
//
// Events are emitted ONLY from v2 API paths (the caller passes an `actor`). The legacy
// UI never sends an actor, so production write paths stay inert and don't log events.
// Failures here are non-fatal — they must never break the primary request mutation.

export async function logSystemEvent(supabase, { requestId, eventType, eventMeta = {}, actor }) {
  try {
    await supabase.from('request_updates').insert({
      request_id: requestId,
      kind: 'system',
      event_type: eventType,
      event_meta: eventMeta,
      author_type: actor?.type || 'system',
      author_name: actor?.name || null,
    })
  } catch (err) {
    console.error(`Failed to log system event "${eventType}":`, err.message)
  }
}
