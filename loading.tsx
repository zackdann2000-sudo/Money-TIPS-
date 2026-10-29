import { MatchListSkeleton } from "@/components/skeletons";
export default function Loading() { return <div className="space-y-4"><div className="card h-32 animate-pulse" /><MatchListSkeleton rows={6} header={false} /></div>; }
