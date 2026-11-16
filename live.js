/* CHIBI CLASH live events: TikFinity Desktop on the SAME PC re-broadcasts your TikTok LIVE events at
   ws://127.0.0.1:21213/ . This page only LISTENS to that local socket. Nothing here logs into TikTok,
   scrapes TikTok, sends likes/comments, or talks to any server. Auto-reconnects with backoff.
   Override the address with ?tikfinity=ws://host:port/ . Classic script, loaded before game.js. */
'use strict';
const TF = { url: 'ws://127.0.0.1:21213/', ws: null, wait: 1000, timer: 0, seen: new Map(), state: 'idle', lastMsg: 0, count: 0 };
function tfUser(d) {
  const u = d.user || d.sender || {};
  const uid = String(d.uniqueId || d.unique_id || u.uniqueId || u.unique_id || u.displayId || u.userId || d.userId || '').trim();
  const nick = String(d.nickname || d.nickName || u.nickname || u.nickName || uid || '').trim();
  const pic = d.profilePictureUrl || u.profilePictureUrl || (u.profilePicture && (u.profilePicture.url || (u.profilePicture.urls || [])[0])) || '';
  return { id: uid || nick.toLowerCase().replace(/\s+/g, '_'), nick: nick || uid, avatar: typeof pic === 'string' ? pic : '' };
}
// TikFinity frame {event, data} -> the game's event shape
function tfNormalize(name, d) {
  if (!d || typeof d !== 'object') return null;
  if (name === 'roomUser') { const n = Number(d.viewerCount ?? d.viewer_count); return Number.isFinite(n) ? { type: 'viewers', count: n } : null; }
  const u = tfUser(d);
  if (!u.id) return null;
  switch (name) {
    case 'chat': case 'comment':
      return { type: 'chat', ...u, text: String(d.comment ?? d.text ?? d.message ?? '') };
    case 'like':
      return { type: 'like', ...u, count: Number(d.likeCount ?? d.like_count ?? 1) || 1 };
    case 'gift': {
      const g = d.gift || {};
      const gtype = g.type ?? d.giftType ?? g.giftType;
      const end = d.repeatEnd ?? d.repeat_end;
      if (gtype === 1 && !(end === 1 || end === true)) return null;   // streak still running: only the final frame counts
      const coins = Number(d.diamondCount ?? d.diamond_count ?? g.diamondCount ?? g.diamond_count ?? 1) || 1;
      const count = Number(d.repeatCount ?? d.repeat_count ?? d.comboCount ?? 1) || 1;
      return { type: 'gift', ...u, giftName: String(d.giftName ?? d.gift_name ?? g.name ?? 'Gift'), coins, count };
    }
    case 'follow': return { type: 'follow', ...u };
    case 'share': return { type: 'share', ...u };
    case 'member': return { type: 'join', ...u };
  }
  return null;
}
function tfDuplicate(name, d, ev) {
  const key = d.msgId || d.msg_id || d.messageId || d.logId || (name === 'gift' ? 'g:' + ev.id + ':' + (d.groupId || '') + ':' + ev.giftName + ':' + ev.count : '');
  if (!key) return false;
  const now = performance.now();
  if (TF.seen.has(key)) return true;
  TF.seen.set(key, now);
  if (TF.seen.size > 600) for (const [k, t] of TF.seen) if (now - t > 60000) TF.seen.delete(k);
  return false;
}
function tfStatus(mode, message) {
  try { if (typeof onEvent === 'function') onEvent({ type: 'status', mode, message: message || '', username: '' }); } catch (e) {}
}
function connectTikFinity() {
  try { const q = new URLSearchParams(location.search).get('tikfinity'); if (q && /^wss?:\/\//.test(q)) TF.url = q; } catch (e) {}
  if (TF.ws) return;
  let ws;
  TF.state = 'connecting';
  try { ws = new WebSocket(TF.url); } catch (e) { tfRetry(); return; }
  TF.ws = ws;
  ws.onopen = () => { TF.state = 'live'; TF.wait = 1000; tfStatus('live', 'TikFinity connected'); };
  ws.onmessage = (m) => {
    let msg; try { msg = JSON.parse(m.data); } catch (e) { return; }
    if (!msg) return;
    const name = String(msg.event || msg.type || msg.eventName || '');
    const data = msg.data || msg.payload || msg;
    const ev = tfNormalize(name, data);
    if (!ev || (ev.type !== 'viewers' && tfDuplicate(name, data, ev))) return;
    TF.lastMsg = performance.now(); TF.count++;
    try { onEvent(ev); } catch (e) { console.warn('event', e); }
  };
  ws.onerror = () => {};
  ws.onclose = () => { if (TF.ws === ws) TF.ws = null; tfStatus('connecting', 'Waiting for TikFinity on ' + TF.url); tfRetry(); };
}
function tfRetry() {
  clearTimeout(TF.timer);
  TF.timer = setTimeout(connectTikFinity, TF.wait);
  TF.wait = Math.min(15000, Math.round(TF.wait * 1.7));   // 1s, 1.7s, 2.9s ... capped at 15s
}
