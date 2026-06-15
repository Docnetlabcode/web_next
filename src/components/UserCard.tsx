"use client";
import { useState } from "react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { compact, roleLabel } from "@/lib/utils";
import { dok } from "@/lib/api";

export default function UserCard({ user, action = "follow", demo, onAction }) {
  const [done, setDone] = useState(false);
  const labels = { follow: ["Follow", "Following"], connect: ["+ Connect", "Requested"] };
  const [a, b] = labels[action] || labels.follow;

  const handle = async () => {
    setDone(true);
    onAction?.(user);
    if (!demo) {
      try {
        action === "connect" ? await dok.network.request(user._id) : await dok.follows.follow(user._id);
      } catch {}
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar user={user} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold">{user.fullName}</span>
          {user.isVerified && <Verified size={13} />}
        </div>
        <p className="truncate text-xs text-ink-500">
          {user.professionalHeadline || roleLabel(user.role)}
          {user.followersCount ? ` · ${compact(user.followersCount)} followers` : ""}
        </p>
      </div>
      <button
        onClick={handle}
        disabled={done}
        className={done ? "btn-outline px-4 py-1.5 text-xs" : "btn-ghost px-4 py-1.5 text-xs"}
      >
        {done ? b : a}
      </button>
    </div>
  );
}
