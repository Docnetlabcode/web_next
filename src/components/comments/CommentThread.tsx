"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Heart, Trash2, Smile, Send, Loader2, MessageCircle, CornerDownRight, X } from "lucide-react";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import { EmojiPicker } from "@/components/ui/Overlays";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn, timeAgoLong } from "@/lib/utils";

/**
 * The interactive comment canvas (docs/feed.md §4) — shared between the
 * slide-up CommentsSheet and the Discussion (post detail) page.
 *
 * - Nested multi-threaded replies (parentId anchoring), lazy-loaded
 * - Per-comment like toggle with its own optimistic counter
 * - @uniqueusername mentions with live autocomplete (backend dispatches the
 *   "tagged you in a comment" notification)
 * - Deletion: comment author OR post owner can delete any comment/reply
 * - Deep-link: `highlightId` auto-scrolls to and flashes the target comment
 */

const cid = (c) => c?.id || c?._id;
const uid = (u) => u?.id || u?._id;

const normalize = (c) => ({
  id: cid(c),
  content: c.content,
  author: c.author || {},
  createdAt: c.createdAt,
  likesCount: c.likesCount ?? c.likes ?? 0,
  isLiked: Boolean(c.isLiked),
  repliesCount: c.repliesCount ?? c.replies?.length ?? 0,
  replies: Array.isArray(c.replies) ? c.replies.map(normalize) : null, // null = not loaded yet
  pending: false,
});

export default function CommentThread({ postId, postOwnerId, demo, highlightId, onCountChange, autoFocus, className, kind = "post" }) {
  const { user } = useAuth();
  const toast = useToast();
  const source = kind === "reel" ? dok.reels : dok.posts;
  const [comments, setComments] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, author } — anchors the composer
  const inputRef = useRef(null);
  const highlightDone = useRef(false);

  const meId = uid(user);
  const isPostOwner = meId && String(meId) === String(postOwnerId);

  // ---- load roots ----
  useEffect(() => {
    let alive = true;
    setComments(null);
    source
      .comments(postId, "?limit=20")
      .then((d) => {
        if (!alive) return;
        const list = (d.comments || d.items || (Array.isArray(d) ? d : [])).map(normalize);
        setComments(list);
        setHasMore(Boolean(d.hasMore));
        setCursor(d.nextCursor || null);
      })
      .catch(() => alive && setComments([]));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, demo, kind]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const d = await source.comments(postId, `?limit=20&cursor=${cursor}`);
      setComments((c) => [...(c || []), ...(d.comments || []).map(normalize)]);
      setHasMore(Boolean(d.hasMore));
      setCursor(d.nextCursor || null);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // ---- deep-link scroll + flash (mention notifications) ----
  useEffect(() => {
    if (!highlightId || !comments || highlightDone.current) return;
    const el = document.getElementById(`comment-${highlightId}`);
    if (el) {
      highlightDone.current = true;
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("anim-comment-flash");
      }, 250);
    }
  }, [highlightId, comments]);

  // ---- tree mutations ----
  const mutate = useCallback((list, id, fn) => {
    return list.map((c) => {
      if (c.id === id) return fn(c);
      if (c.replies?.length) return { ...c, replies: mutate(c.replies, id, fn) };
      return c;
    });
  }, []);

  const removeNode = useCallback(function rm(list, id) {
    return list
      .filter((c) => c.id !== id)
      .map((c) => (c.replies?.length ? { ...c, replies: rm(c.replies, id) } : c));
  }, []);

  // ---- actions ----
  const submit = async (text) => {
    const parent = replyTo;
    const temp = normalize({
      id: `tmp-${Date.now()}`, content: text, author: user,
      createdAt: new Date().toISOString(), likesCount: 0, repliesCount: 0, replies: [],
    });
    temp.pending = true;

    // optimistic insert
    if (parent) {
      setComments((c) => mutate(c, parent.id, (p) => ({ ...p, repliesCount: p.repliesCount + 1, replies: [...(p.replies || []), temp] })));
    } else {
      setComments((c) => [temp, ...(c || [])]);
    }
    onCountChange?.(+1);
    setReplyTo(null);

    if (demo) {
      setComments((c) => mutate(c, temp.id, (x) => ({ ...x, pending: false })));
      return;
    }
    try {
      const d = await source.comment(postId, { content: text, ...(parent ? { parentId: parent.id } : {}) });
      const real = normalize(d.comment || d);
      setComments((c) => mutate(c, temp.id, () => ({ ...real, replies: real.replies || [] })));
    } catch {
      // rollback
      setComments((c) => removeNode(c, temp.id));
      onCountChange?.(-1);
      toast?.error("Couldn't post your comment — try again");
    }
  };

  const toggleLike = (comment) => {
    setComments((c) =>
      mutate(c, comment.id, (x) => ({ ...x, isLiked: !x.isLiked, likesCount: x.likesCount + (x.isLiked ? -1 : 1) }))
    );
    if (demo) return;
    source.likeComment(postId, comment.id).catch(() => {
      setComments((c) =>
        mutate(c, comment.id, (x) => ({ ...x, isLiked: comment.isLiked, likesCount: comment.likesCount }))
      );
      toast?.error("Couldn't update the reaction");
    });
  };

  const remove = (comment) => {
    const snapshot = comments;
    setComments((c) => removeNode(c, comment.id));
    onCountChange?.(-1);
    if (demo) return;
    source.deleteComment(postId, comment.id).catch(() => {
      setComments(snapshot);
      onCountChange?.(+1);
      toast?.error("Couldn't delete the comment");
    });
  };

  const loadReplies = async (comment) => {
    if (demo) return;
    try {
      const d = await source.replies(postId, comment.id);
      const list = (d.replies || d.comments || (Array.isArray(d) ? d : [])).map(normalize);
      setComments((c) => mutate(c, comment.id, (x) => ({ ...x, replies: list })));
    } catch {
      toast?.error("Couldn't load replies");
    }
  };

  const startReply = (comment) => {
    setReplyTo({ id: comment.id, author: comment.author });
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {/* thread */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 py-3">
        {comments === null ? (
          <ThreadSkeleton />
        ) : comments.length === 0 ? (
          <div className="grid place-items-center gap-2 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><MessageCircle size={20} /></span>
            <p className="text-sm font-semibold text-ink-900">Start the discussion</p>
            <p className="max-w-[16rem] text-xs text-ink-500">Share your clinical take — mention colleagues with @username.</p>
          </div>
        ) : (
          comments.map((c) => (
            <CommentNode
              key={c.id}
              c={c}
              depth={0}
              meId={meId}
              isPostOwner={isPostOwner}
              onLike={toggleLike}
              onReply={startReply}
              onDelete={remove}
              onLoadReplies={loadReplies}
            />
          ))
        )}
        {hasMore && (
          <button onClick={loadMore} className="press mx-auto block rounded-full bg-ink-900/[.04] px-4 py-2 text-xs font-bold text-ink-600 hover:bg-ink-900/[.07]">
            {loadingMore ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Load more comments"}
          </button>
        )}
      </div>

      {/* composer */}
      <Composer
        ref={inputRef}
        user={user}
        demo={demo}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSubmit={submit}
        autoFocus={autoFocus}
      />
    </div>
  );
}

/* ---------------- comment row ---------------- */

function CommentNode({ c, depth, meId, isPostOwner, onLike, onReply, onDelete, onLoadReplies }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const canDelete = isPostOwner || (meId && String(uid(c.author)) === String(meId));
  const authorId = uid(c.author);

  // Resolve a @username mention to the tagged user and open their profile.
  // Falls back to search if the handle doesn't resolve (typo / deleted account).
  const openMention = async (handle) => {
    const username = String(handle).trim().replace(/^@/, "");
    if (!username) return;
    try {
      const d = await dok.profile.byUsername(username);
      const u = d?.user || d;
      const pid = u?.id || u?._id;
      if (pid) { nav(`/app/profile/${pid}`); return; }
    } catch {}
    nav(`/app/search?q=${encodeURIComponent("@" + username)}`);
  };

  const toggleReplies = async () => {
    if (!open && c.replies === null) {
      setLoading(true);
      await onLoadReplies(c);
      setLoading(false);
    }
    setOpen((v) => !v);
  };

  return (
    <div id={`comment-${c.id}`} className={cn("anim-pop", depth > 0 && "ml-9")}>
      <div className="flex gap-2.5">
        <button onClick={() => authorId && nav(`/app/profile/${authorId}`)} className="press h-fit shrink-0">
          <Avatar user={c.author} size={depth > 0 ? 30 : 36} />
        </button>
        <div className="min-w-0 flex-1">
          <div className={cn("rounded-2xl rounded-tl-md bg-ink-900/[.03] px-3.5 py-2.5", c.pending && "opacity-60")}>
            <p className="flex items-baseline gap-1.5 text-sm">
              <button onClick={() => authorId && nav(`/app/profile/${authorId}`)} className="flex min-w-0 items-center gap-1 font-semibold text-ink-900 hover:underline">
                <span className="truncate">{c.author?.fullName}</span>
                {c.author?.isVerified && <Verified size={12} className="shrink-0" />}
              </button>
              <span className="ml-auto shrink-0 text-[11px] font-normal text-ink-400">{c.pending ? "sending…" : timeAgoLong(c.createdAt)}</span>
            </p>
            {c.author?.professionalHeadline && <p className="truncate text-[11px] text-ink-400">{c.author.professionalHeadline}</p>}
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{renderRich(c.content, openMention)}</p>
          </div>

          <div className="mt-1 flex items-center gap-4 px-2 text-xs text-ink-500">
            <button
              onClick={() => onLike(c)}
              aria-pressed={c.isLiked}
              className={cn("press flex items-center gap-1 font-medium transition", c.isLiked && "text-rose-500")}
            >
              <Heart size={13} className={cn("transition", c.isLiked && "anim-burst fill-rose-500")} />
              {c.likesCount > 0 && <span>{c.likesCount}</span>}
            </button>
            <button onClick={() => onReply(c)} className="press font-medium transition hover:text-ink-900">Reply</button>
            {canDelete && (
              <button onClick={() => onDelete(c)} className="press flex items-center gap-1 font-medium transition hover:text-rose-500">
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>

          {(c.repliesCount > 0 || (c.replies?.length || 0) > 0) && (
            <button onClick={toggleReplies} className="press mt-1.5 flex items-center gap-1 px-2 text-xs font-bold text-brand-700">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <CornerDownRight size={12} />}
              {open ? "Hide replies" : `View ${c.replies?.length || c.repliesCount} ${(c.replies?.length || c.repliesCount) === 1 ? "reply" : "replies"}`}
            </button>
          )}

          {open && c.replies?.length > 0 && (
            <div className="mt-3 space-y-3 border-l-[1px] border-ink-900/[.06] pl-0">
              {c.replies.map((r) => (
                <CommentNode key={r.id} c={r} depth={Math.min(depth + 1, 2)} meId={meId} isPostOwner={isPostOwner} onLike={onLike} onReply={onReply} onDelete={onDelete} onLoadReplies={onLoadReplies} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- composer with @mention autocomplete ---------------- */

const Composer = forwardRef(function Composer({ user, demo, replyTo, onCancelReply, onSubmit, autoFocus }, ref) {
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [mentions, setMentions] = useState(null); // suggestion list
  const innerRef = useRef(null);
  const debounce = useRef(null);

  useImperativeHandle(ref, () => ({ focus: () => innerRef.current?.focus() }));

  useEffect(() => { if (replyTo) innerRef.current?.focus(); }, [replyTo]);

  // live @mention lookup on the token at the caret
  const onChange = (e) => {
    const v = e.target.value;
    setText(v);
    const caret = e.target.selectionStart ?? v.length;
    const m = /(^|\s)@([a-zA-Z0-9_.]{1,30})$/.exec(v.slice(0, caret));
    clearTimeout(debounce.current);
    if (!m) { setMentions(null); return; }
    const q = m[2];
    debounce.current = setTimeout(async () => {
      try {
        const d = await dok.search.users(q);
        setMentions((d.users || d.results || []).slice(0, 5));
      } catch { setMentions(null); }
    }, 220);
  };

  const pickMention = (u) => {
    const el = innerRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([a-zA-Z0-9_.]{1,30})$/, `@${u.uniqueUsername} `);
    setText(before + text.slice(caret));
    setMentions(null);
    el?.focus();
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
    setEmoji(false);
    setMentions(null);
  };

  return (
    <div className="relative border-t border-ink-900/[.06] bg-surface p-3">
      {/* mention suggestions */}
      {mentions?.length > 0 && (
        <div className="anim-pop absolute bottom-full left-3 right-3 z-10 mb-1 overflow-hidden rounded-2xl border border-ink-900/[.08] bg-surface shadow-card">
          {mentions.map((u) => (
            <button key={uid(u)} onClick={() => pickMention(u)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-brand-50">
              <Avatar user={u} size={30} />
              <span className="min-w-0">
                <span className="flex items-center gap-1 truncate text-sm font-semibold text-ink-900">{u.fullName} {u.isVerified && <Verified size={11} />}</span>
                <span className="block truncate text-[11px] text-ink-500">@{u.uniqueUsername}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="anim-pop mb-2 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 text-xs text-brand-700">
          <CornerDownRight size={12} />
          Replying to <strong>{replyTo.author?.fullName}</strong>
          <button onClick={onCancelReply} className="press ml-auto rounded-full p-1 hover:bg-brand-100"><X size={12} /></button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Avatar user={user} size={34} />
        <div className="relative flex flex-1 items-center rounded-full bg-ink-900/[.04] pr-1.5">
          <input
            ref={innerRef}
            value={text}
            onChange={onChange}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={replyTo ? "Write a reply…" : "Add to the discussion… use @ to mention"}
            autoFocus={autoFocus}
            className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-ink-400"
          />
          <button onClick={() => setEmoji((v) => !v)} aria-label="Add emoji" className="press rounded-full p-1.5 text-ink-400 hover:text-brand-600"><Smile size={18} /></button>
          {emoji && (
            <div className="absolute bottom-12 right-0 z-10">
              <EmojiPicker onPick={(e) => setText((t) => t + e)} />
            </div>
          )}
        </div>
        <button
          onClick={send}
          disabled={!text.trim()}
          aria-label="Send comment"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white shadow-glow transition disabled:opacity-40 disabled:shadow-none"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
});

/* ---------------- rich text: @mentions + #hashtags ---------------- */

function renderRich(text = "", onMention) {
  return text.split(/((?:^|\s)[#@][a-zA-Z0-9_.]+)/g).map((part, i) => {
    const t = part.trimStart();
    if (t.startsWith("#")) return <span key={i} className="font-medium text-brand-600">{part}</span>;
    if (t.startsWith("@")) {
      return (
        <button key={i} onClick={(e) => { e.stopPropagation(); onMention(t); }} className="font-medium text-brand-600 hover:underline">
          {part}
        </button>
      );
    }
    return part;
  });
}

function ThreadSkeleton() {
  return (
    <div className="space-y-4 px-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-2.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
