export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none focus:ring-1 focus:ring-zuby-500";
