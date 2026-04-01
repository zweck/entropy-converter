// Cloudflare Pages Function for TTS using Workers AI aura-2-en
// Uses KV for persistent caching with paper content hash validation

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function clearKV(env) {
  // List and delete all keys
  const list = await env.TTS_CACHE.list();
  const deletePromises = list.keys.map(key => env.TTS_CACHE.delete(key.name));
  await Promise.all(deletePromises);
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { text, section, paperHash } = await request.json();

    if (!text || typeof text !== 'string') {
      return new Response('Missing or invalid text', { status: 400 });
    }

    if (!paperHash || typeof paperHash !== 'string') {
      return new Response('Missing paperHash', { status: 400 });
    }

    // Check if paper hash matches stored hash
    const storedHash = await env.TTS_CACHE.get('paper_hash');

    if (storedHash && storedHash !== paperHash) {
      // Paper content changed - clear all cached audio
      console.log('Paper hash mismatch, clearing KV cache');
      await clearKV(env);
    }

    // Store/update the current paper hash
    if (storedHash !== paperHash) {
      await env.TTS_CACHE.put('paper_hash', paperHash);
    }

    // Create key for this section's audio
    const sectionKey = `audio:${paperHash}:${section}`;

    // Check KV for cached audio
    const cachedAudio = await env.TTS_CACHE.get(sectionKey, { type: 'arrayBuffer' });

    if (cachedAudio) {
      return new Response(cachedAudio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'HIT',
        }
      });
    }

    // Generate TTS using Workers AI
    const audioResponse = await env.AI.run('@cf/deepgram/aura-2-en', {
      text: text,
    });

    // Convert to ArrayBuffer for KV storage
    const audioBuffer = await new Response(audioResponse).arrayBuffer();

    // Store in KV (fire and forget)
    context.waitUntil(
      env.TTS_CACHE.put(sectionKey, audioBuffer, {
        // Optional: set expiration (e.g., 30 days) as a fallback cleanup
        expirationTtl: 60 * 60 * 24 * 30
      })
    );

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': 'MISS',
      }
    });

  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}
