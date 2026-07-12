"use client";
import { useEffect, useState } from "react";
import PostCard from "@/components/PostCard";
import RightRail from "@/components/layout/RightRail";
import { PostFeedSkeleton } from "@/components/ui/Skeletons";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";

export default function Explore() {
  const { demo } = useAuth();
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    dok.feed.explore().then((d) => setPosts(d.feed || [])).catch(() => setPosts([]));
  }, []);
  return (
    <div className="flex gap-6">
      <div className="mx-auto w-full max-w-xl pb-24">
        <header className="mb-5">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Explore</h1>
          <p className="text-sm text-ink-500">Trending posts & reels from across Orovion.</p>
        </header>
        {posts === null ? (
          <PostFeedSkeleton />
        ) : (
          <div className="space-y-5">{posts.map((p) => <PostCard key={p._id || p.id} post={p} demo={demo} />)}</div>
        )}
      </div>
      <RightRail />
    </div>
  );
}
