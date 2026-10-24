export function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-10 flex items-start gap-4">
      <span
        className="accent-bar mt-1 h-10 w-1 shrink-0 rounded-full"
        aria-hidden
      />
      <div>
        <p className="text-gradient font-mono text-sm font-semibold">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
    </div>
  );
}
