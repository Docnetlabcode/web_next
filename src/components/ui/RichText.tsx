"use client";
import { useNavigate } from "@/lib/router";
import { dok } from "@/lib/api";

/**
 * Renders user text with clickable links, #hashtags and @mentions.
 * - URLs open in a new tab (safe rel flags).
 * - #hashtag → the hashtag workspace (/app/tag/:tag).
 * - @username → the mentioned user's profile (resolved by username; falls back
 *   to search if the handle doesn't resolve).
 * All clicks stopPropagation so they don't trigger a parent row handler.
 */
const TOKEN = /((?:https?:\/\/|www\.)[^\s]+|(?:^|\s)[#@][\w.]+)/g;
const TRAILING = /[.,;:!?)\]]+$/; // punctuation that shouldn't be swallowed into a URL

export function RichText({ text = "" }: { text?: string }) {
  const nav = useNavigate();

  const openTag = (tag) => { if (tag) nav(`/app/tag/${encodeURIComponent(tag)}`); };
  const openMention = async (handle) => {
    const username = String(handle).replace(/^@/, "");
    if (!username) return;
    try {
      const d = await dok.profile.byUsername(username);
      const u = d?.user || d;
      const pid = u?.id || u?._id;
      if (pid) { nav(`/app/profile/${pid}`); return; }
    } catch {}
    nav(`/app/search?q=${encodeURIComponent("@" + username)}`);
  };

  return (
    <>
      {String(text).split(TOKEN).map((part, i) => {
        if (!part) return null;
        const t = part.trimStart();
        const lead = part.slice(0, part.length - t.length); // preserved leading whitespace

        if (/^(https?:\/\/|www\.)/i.test(t)) {
          const trail = (TRAILING.exec(t) || [""])[0];
          const url = trail ? t.slice(0, -trail.length) : t;
          const href = url.toLowerCase().startsWith("http") ? url : `https://${url}`;
          return (
            <span key={i}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700 break-words"
              >
                {url}
              </a>
              {trail}
            </span>
          );
        }

        if (t.startsWith("#")) {
          return (
            <span key={i}>
              {lead}
              <button type="button" onClick={(e) => { e.stopPropagation(); openTag(t.slice(1)); }} className="font-medium text-brand-600 hover:underline">
                {t}
              </button>
            </span>
          );
        }

        if (t.startsWith("@")) {
          return (
            <span key={i}>
              {lead}
              <button type="button" onClick={(e) => { e.stopPropagation(); openMention(t); }} className="font-medium text-brand-600 hover:underline">
                {t}
              </button>
            </span>
          );
        }

        return part;
      })}
    </>
  );
}

export default RichText;
