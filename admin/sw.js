// ─── PUSH NOTIFICATIONS ──────────────────────────────────────
async function getPushSubscriptions(env) {
    const r = await env.DB.prepare('SELECT endpoint, keys FROM push_subscriptions').all();
    return (r.results || []).map(row => ({ endpoint: row.endpoint, keys: JSON.parse(row.keys) }));
}
async function savePushSubscription(env, subscription) {
    await env.DB.prepare(`
        INSERT INTO push_subscriptions (endpoint, keys, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(endpoint) DO UPDATE SET keys = ?, updated_at = datetime('now')
    `).bind(subscription.endpoint, JSON.stringify(subscription.keys), JSON.stringify(subscription.keys)).run();
}
async function deletePushSubscription(env, endpoint) {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
}

// ─── PUSH ENCRYPTION (RFC 8291) ──────────────────────────────

function base64UrlToUint8Array(base64Url) {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

function uint8ToBase64Url(buf) {
    let binary = '';
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateVapidJWT(publicKeyBase64, privateKeyBase64, audience) {
    const pubBuf = base64UrlToUint8Array(publicKeyBase64);
    const privBuf = base64UrlToUint8Array(privateKeyBase64);

    const x = pubBuf.slice(1, 33);
    const y = pubBuf.slice(33, 65);

    const jwk = {
        kty: 'EC', crv: 'P-256',
        x: uint8ToBase64Url(x),
        y: uint8ToBase64Url(y),
        d: uint8ToBase64Url(privBuf)
    };

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

    const header  = { alg: 'ES256', typ: 'JWT' };
    const now     = Math.floor(Date.now() / 1000);
    const payload = { aud: audience, exp: now + 86400, sub: 'mailto:admin@dornori.com' };

    const enc = (obj) => uint8ToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
    const signingInput = enc(header) + '.' + enc(payload);

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        key,
        new TextEncoder().encode(signingInput)
    );

    return signingInput + '.' + uint8ToBase64Url(new Uint8Array(signature));
}

async function hkdfExpand(prk, info, length) {
    const encoder = new TextEncoder();
    const infoBytes = typeof info === 'string' ? encoder.encode(info) : info;
    
    const N = Math.ceil(length / 32);
    const okm = new Uint8Array(N * 32);
    
    let previous = new Uint8Array(0);
    
    for (let i = 1; i <= N; i++) {
        const input = new Uint8Array(previous.length + infoBytes.length + 1);
        input.set(previous);
        input.set(infoBytes, previous.length);
        input[input.length - 1] = i;
        
        const hmacKey = await crypto.subtle.importKey(
            'raw',
            prk,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', hmacKey, input);
        previous = new Uint8Array(signature);
        okm.set(previous, (i - 1) * 32);
    }
    
    return okm.slice(0, length);
}

async function encryptPushPayload(payload, subscription) {
    const encoder = new TextEncoder();
    
    const p256dh = base64UrlToUint8Array(subscription.keys.p256dh);
    const authSecret = base64UrlToUint8Array(subscription.keys.auth);
    
    const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );
    
    const publicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey('raw', keyPair.publicKey)
    );
    
    const clientPublicKey = await crypto.subtle.importKey(
        'raw',
        p256dh,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );
    
    const sharedSecret = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'ECDH', public: clientPublicKey },
            keyPair.privateKey,
            256
        )
    );
    
    const hmacKey = await crypto.subtle.importKey(
        'raw',
        authSecret,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    
    const prk = new Uint8Array(
        await crypto.subtle.sign('HMAC', hmacKey, sharedSecret)
    );
    
    const cekInfo = encoder.encode('Content-Encoding: aesgcm\0');
    const cekInfoFull = new Uint8Array([...cekInfo, 0x00, 0x00, 0x00, 0x01]);
    const cek = await hkdfExpand(prk, cekInfoFull, 16);
    
    const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
    const nonceInfoFull = new Uint8Array([...nonceInfo, 0x00, 0x00, 0x00, 0x0C]);
    const nonce = await hkdfExpand(prk, nonceInfoFull, 12);
    
    const plaintext = encoder.encode(JSON.stringify(payload));
    console.log(`📦 Encrypting ${plaintext.length} bytes:`, JSON.stringify(payload));
    
    const paddedPlaintext = new Uint8Array(plaintext.length + 1);
    paddedPlaintext[0] = 0x00;
    paddedPlaintext.set(plaintext, 1);
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        cek,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
    );
    
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: nonce, tagLength: 128 },
            cryptoKey,
            paddedPlaintext
        )
    );
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = new Uint8Array(salt.length + ciphertext.length);
    encrypted.set(salt);
    encrypted.set(ciphertext, salt.length);
    
    return {
        encrypted,
        salt,
        publicKey: publicKeyRaw,
        ciphertext
    };
}

// ─── SEND PUSH NOTIFICATION ──────────────────────────────────

async function sendPushNotification(env, ticket) {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
        console.log('❌ Push skipped: VAPID keys missing');
        return { success: false, error: 'VAPID keys missing' };
    }

    // ✅ Real ticket payload
    const payload = {
        title: `🔔 New Ticket ${ticket.ticket_number}`,
        body: ticket.subject || 'New ticket received',
        url: '/admin/dashboard.html',
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        category: ticket.category,
        status: ticket.status
    };

    console.log('📤 Sending push for ticket:', ticket.ticket_number);
    console.log('📦 Payload:', JSON.stringify(payload));

    const subscriptions = await getPushSubscriptions(env);
    if (subscriptions.length === 0) {
        console.log('⚠️ No push subscriptions found');
        return { success: true, sent: 0 };
    }

    let sent = 0;
    
    for (const sub of subscriptions) {
        try {
            const { encrypted, publicKey } = await encryptPushPayload(payload, sub);
            
            const audience = new URL(sub.endpoint).origin;
            const vapidJWT = await generateVapidJWT(
                env.VAPID_PUBLIC_KEY,
                env.VAPID_PRIVATE_KEY,
                audience
            );
            
            const dhKey = uint8ToBase64Url(publicKey);
            const vapidKey = env.VAPID_PUBLIC_KEY;
            
            const response = await fetch(sub.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Encoding': 'aesgcm',
                    'Crypto-Key': `dh=${dhKey};p256ecdsa=${vapidKey}`,
                    'TTL': '86400',
                    'Authorization': `WebPush ${vapidJWT}`
                },
                body: encrypted
            });
            
            const responseText = await response.text();
            
            if (response.status === 201 || response.status === 200) {
                sent++;
                console.log('✅ Push sent successfully');
            } else if (response.status === 410 || response.status === 404) {
                await deletePushSubscription(env, sub.endpoint);
                console.log('🗑️ Removed expired subscription');
            } else {
                console.log(`❌ Push failed (${response.status}): ${responseText}`);
            }
        } catch (err) {
            console.error('❌ Push error:', err.message);
        }
    }
    
    console.log(`📊 Push result: ${sent}/${subscriptions.length} sent`);
    return { success: true, sent };
}