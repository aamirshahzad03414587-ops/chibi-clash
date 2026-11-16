import { CONFIG } from "./config.js";

/**
 * TikFinity Event API adapter.
 * TikFinity Desktop (running on the same computer as the game) rebroadcasts
 * TikTok LIVE events on a local WebSocket, typically:
 *   ws://127.0.0.1:21213/
 * Frames look like: { "event": "chat"|"gift"|"like"|..., "data": { ... } }
 * Field names follow tiktok-live-connector (camelCase). Payloads can also
 * nest the user under `data.user`.
 */
export class TikFinityAdapter {
  constructor({ url, onEvent, onStatus } = {}) {
    this.url = url || CONFIG.ws.url;
    this.onEvent = onEvent || (() => {});
    this.onStatus = onStatus || (() => {});
    this.ws = null;
    this.wanted = false;
    this.timer = null;
    this.seenIds = new Map();
  }

  start() {
    this.wanted = true;
    this._connect();
  }

  stop() {
    this.wanted = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.ws) {
      try { this.ws.close(); } catch (_) { /* ignore */ }
      this.ws = null;
    }
    this.onStatus({ state: "idle", detail: "Disconnected" });
  }

  _connect() {
    if (!this.wanted) return;
    this.onStatus({ state: "connecting", detail: `Connecting to ${this.url}` });
    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      this.onStatus({ state: "error", detail: String(err) });
      this._schedule();
      return;
    }
    this.ws = ws;
    ws.addEventListener("open", () => {
      if (this.ws !== ws) return;
      this.onStatus({ state: "connected", detail: "TikFinity connected" });
    });
    ws.addEventListener("message", (ev) => {
      if (this.ws !== ws) return;
      this._handleRaw(ev.data);
    });
    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.wanted) {
        this.onStatus({ state: "reconnecting", detail: "TikFinity disconnected — retrying" });
        this._schedule();
      }
    });
    ws.addEventListener("error", () => {
      // close will follow; status is set there
    });
  }

  _schedule() {
    if (!this.wanted) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this._connect(), CONFIG.ws.reconnectMs);
  }

  _handleRaw(raw) {
    let msg;
    try {
      msg = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      return;
    }
    if (!msg) return;
    const event = msg.event || msg.type || msg.eventName;
    const data = msg.data || msg.payload || msg;
    if (!event || typeof event !== "string") return;
    const normalized = normalizeEvent(event, data);
    if (!normalized) return;
    if (this._isDuplicate(normalized)) return;
    this.onEvent(normalized);
  }

  _isDuplicate(ev) {
    const id = ev.id;
    if (!id) return false;
    const now = performance.now();
    if (this.seenIds.has(id)) return true;
    this.seenIds.set(id, now);
    if (this.seenIds.size > 400) {
      for (const [key, ts] of this.seenIds) {
        if (now - ts > 30000) this.seenIds.delete(key);
      }
    }
    return false;
  }
}

export function normalizeEvent(eventName, data) {
  const ev = String(eventName);
  const user = pickUser(data);
  if (!user.uniqueId && !user.nickname && ev !== "roomUser") return null;

  if (ev === "chat" || ev === "comment") {
    return {
      type: "chat",
      id: pickId(data, user, "chat"),
      user,
      comment: String(data.comment ?? data.text ?? data.message ?? ""),
    };
  }

  if (ev === "like") {
    return {
      type: "like",
      id: pickId(data, user, "like"),
      user,
      likeCount: Number(data.likeCount ?? data.like_count ?? 1) || 1,
    };
  }

  if (ev === "gift") {
    if (isStreakInProgress(data)) return null;
    const gift = data.gift || {};
    const diamondsEach = Number(
      data.diamondCount ?? data.diamond_count ?? gift.diamondCount ?? gift.diamond_count ?? 1
    ) || 1;
    const repeat = Number(data.repeatCount ?? data.repeat_count ?? data.comboCount ?? 1) || 1;
    return {
      type: "gift",
      id: pickId(data, user, "gift"),
      user,
      giftName: String(data.giftName ?? data.gift_name ?? gift.name ?? "Gift"),
      diamonds: diamondsEach * repeat,
      repeatCount: repeat,
    };
  }

  if (ev === "follow") {
    return { type: "follow", id: pickId(data, user, "follow"), user };
  }

  if (ev === "share") {
    return { type: "share", id: pickId(data, user, "share"), user };
  }

  if (ev === "subscribe" || ev === "superFan" || ev === "subscription") {
    return { type: "subscribe", id: pickId(data, user, "sub"), user };
  }

  if (ev === "member" || ev === "join") {
    return { type: "joinRoom", id: pickId(data, user, "member"), user };
  }

  return null;
}

function isStreakInProgress(data) {
  const gift = data.gift || {};
  const type = gift.type ?? data.giftType ?? gift.giftType;
  const end = data.repeatEnd ?? data.repeat_end;
  // Streakable gifts (type === 1) emit many updates; only count the final one.
  if (type === 1 && end !== 1 && end !== true) return true;
  return false;
}

function pickUser(data) {
  const u = data.user || data.sender || {};
  const uniqueId = String(
    data.uniqueId || data.unique_id || u.uniqueId || u.unique_id || u.displayId || u.display_id || ""
  );
  const nickname = String(
    data.nickname || data.nickName || u.nickname || u.nickName || uniqueId || "Viewer"
  );
  const profilePictureUrl =
    data.profilePictureUrl ||
    data.profilePicture ||
    u.profilePictureUrl ||
    u.profilePicture ||
    (u.profilePicture?.url) ||
    "";
  return { uniqueId: uniqueId || slug(nickname), nickname, profilePictureUrl };
}

function pickId(data, user, kind) {
  return String(
    data.msgId ||
      data.msg_id ||
      data.messageId ||
      data.id ||
      data.groupId ||
      `${kind}:${user.uniqueId}:${data.comment || data.giftId || data.likeCount || ""}:${Math.floor(Date.now() / 250)}`
  );
}

function slug(name) {
  return String(name || "viewer").toLowerCase().replace(/\s+/g, "_").slice(0, 24);
}

export function fakeUser(name, id) {
  return { uniqueId: id || slug(name), nickname: name, profilePictureUrl: "" };
}
