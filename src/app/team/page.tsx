export default function TeamPage() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        My team
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        BuildX
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
        Team membership, required skills, and candidate decisions will be
        connected here after teammate discovery.
      </p>
      <div className="mt-10 border-y border-stone-200 py-5 text-sm text-stone-600">
        3 / 4 members confirmed · Need AI / ML
      </div>
    </main>
  );
}
