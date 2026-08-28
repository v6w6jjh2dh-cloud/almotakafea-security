export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === context.env.META_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    if (body.object !== 'page') {
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        const senderId = event.sender?.id;
        const text = event.message?.text;
        if (!senderId || !text || event.message?.is_echo) continue;

        await sendMessage(context.env.META_PAGE_ACCESS_TOKEN, senderId,
          'تم استلام رسالتك بنجاح. أهلاً بك في المتكافئة لكاميرات المراقبة وأنظمة الحماية.'
        );
      }
    }

    return new Response('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('EVENT_RECEIVED', { status: 200 });
  }
}

async function sendMessage(accessToken, recipientId, text) {
  if (!accessToken) throw new Error('META_PAGE_ACCESS_TOKEN is missing');

  const response = await fetch(
    `https://graph.facebook.com/v26.0/me/messages?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: 'RESPONSE',
        message: { text }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Meta send failed: ${response.status} ${await response.text()}`);
  }
}