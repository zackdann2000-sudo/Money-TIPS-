/** Esqueletos cinza animados exibidos enquanto os dados da ESPN são carregados (usados pelos loading.tsx). */

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--surface-3)] ${className}`} />;
}

export function MatchRowSkeleton() {
  return (
    <div className="card flex items-stretch gap-2 px-2.5 py-2.5">
      <div className="flex w-[58px] shrink-0 flex-col items-center justify-center gap-1.5 border-r pr-2 hairline"><Bone className="h-3 w-9" /><Bone className="h-2 w-7" /></div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Bone className="h-[22px] w-[22px] !rounded-full" /><Bone className="h-3 w-28" /></div><Bone className="h-3 w-4" /></div>
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Bone className="h-[22px] w-[22px] !rounded-full" /><Bone className="h-3 w-24" /></div><Bone className="h-3 w-4" /></div>
        <div className="flex gap-1"><Bone className="h-3.5 w-10 !rounded-full" /><Bone className="h-3.5 w-10 !rounded-full" /><Bone className="h-3.5 w-10 !rounded-full" /><Bone className="ml-auto h-3 w-20" /></div>
      </div>
    </div>
  );
}

export function MatchListSkeleton({ rows = 8, header = true }: { rows?: number; header?: boolean }) {
  return (
    <div className="space-y-4">
      {header ? (
        <>
          <div className="px-1"><Bone className="h-6 w-48" /><Bone className="mt-1.5 h-3 w-64" /></div>
          <div className="flex gap-1.5">{Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-7 w-20 !rounded-full" />)}</div>
          <div className="flex gap-1.5">{Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-6 w-24 !rounded-full" />)}</div>
        </>
      ) : null}
      <div className="space-y-1.5">
        <Bone className="h-3.5 w-16" />
        {Array.from({ length: rows }).map((_, i) => <MatchRowSkeleton key={i} />)}
      </div>
      <p className="text-center text-[0.62rem] muted">Carregando jogos da ESPN…</p>
    </div>
  );
}

export function StatCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex flex-col items-center gap-1.5 px-2 py-2"><Bone className="h-4 w-4" /><Bone className="h-4 w-8" /><Bone className="h-2 w-12" /></div>
      ))}
    </div>
  );
}

export function StatBarsSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <div className="card space-y-2.5 px-3 py-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}><div className="flex justify-between"><Bone className="h-3 w-6" /><Bone className="h-3 w-20" /><Bone className="h-3 w-6" /></div><Bone className="mt-1.5 h-1.5 w-full !rounded-full" /></div>
      ))}
    </div>
  );
}

export function TileRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => <div key={i} className="card px-3 py-2.5"><Bone className="h-2.5 w-16" /><Bone className="mt-2 h-5 w-12" /><Bone className="mt-1.5 h-2 w-20" /></div>)}
    </div>
  );
}

export function MatchPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><Bone className="h-6 w-20 !rounded-full" /><Bone className="h-6 w-32 !rounded-full" /></div>
      <div className="card overflow-hidden">
        <div className="brand-gradient px-3 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-1 flex-col items-center gap-1.5"><Bone className="h-11 w-11 !rounded-full !bg-white/20" /><Bone className="h-3 w-20 !bg-white/20" /></div>
            <div className="flex flex-col items-center gap-2"><Bone className="h-8 w-20 !bg-white/20" /><Bone className="h-4 w-14 !rounded-full !bg-white/20" /></div>
            <div className="flex flex-1 flex-col items-center gap-1.5"><Bone className="h-11 w-11 !rounded-full !bg-white/20" /><Bone className="h-3 w-20 !bg-white/20" /></div>
          </div>
        </div>
        <div className="flex gap-1.5 px-3 py-2">{Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-6 w-16 !rounded-full" />)}</div>
      </div>
      <div className="flex gap-1.5">{Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-7 w-24 !rounded-full" />)}</div>
      <div><Bone className="mb-2 h-4 w-44" /><StatCardsSkeleton /><div className="mt-2"><StatBarsSkeleton /></div></div>
      <div><Bone className="mb-2 h-4 w-36" /><div className="card divide-y divide-[var(--line)]">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-2.5 px-3 py-2.5"><Bone className="h-3 w-8" /><Bone className="h-7 w-7" /><div className="flex-1 space-y-1"><Bone className="h-3 w-3/4" /><Bone className="h-2 w-1/3" /></div></div>)}</div></div>
      <p className="text-center text-[0.62rem] muted">Carregando estatísticas ao vivo…</p>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="space-y-5">
      <Bone className="h-44 w-full !rounded-2xl" />
      <TileRowSkeleton />
      <div className="flex gap-2 overflow-hidden">{Array.from({ length: 3 }).map((_, i) => <Bone key={i} className="h-28 min-w-[290px] flex-1 !rounded-2xl" />)}</div>
      <div><Bone className="mb-2 h-4 w-32" /><div className="grid gap-1.5 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <MatchRowSkeleton key={i} />)}</div></div>
      <div><Bone className="mb-2 h-4 w-52" /><div className="grid gap-2 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-36 w-full !rounded-2xl" />)}</div></div>
    </div>
  );
}
