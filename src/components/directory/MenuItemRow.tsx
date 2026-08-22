import Image from "next/image";
import type { ChefMenuItem } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/format";
import { copy } from "@/lib/copy/en";

const DIETARY_DOT: Record<string, string> = {
  veg: "bg-green-600",
  non_veg: "bg-red-600",
  egg: "bg-yellow-500",
};

export function MenuItemRow({ item }: { item: ChefMenuItem }) {
  return (
    <div className="flex gap-3 border-b border-neutral-100 py-4 last:border-0">
      {item.photoUrl && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
          <Image src={item.photoUrl} alt={item.name} fill sizes="64px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {item.dietary && (
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DIETARY_DOT[item.dietary] ?? "bg-neutral-400"}`}
                aria-hidden="true"
              />
            )}
            <span className="truncate font-medium text-neutral-900">{item.name}</span>
            {item.isBestSeller && (
              <span className="shrink-0 rounded-full bg-zuby-50 px-2 py-0.5 text-[11px] font-semibold text-zuby-600">
                {copy.chef.bestSellerBadge}
              </span>
            )}
          </div>
          {item.price !== null && (
            <span className="shrink-0 font-semibold text-neutral-900">
              {formatPrice(item.price, item.currencyCode)}
              {item.unit && (
                <span className="ml-1 text-xs font-normal text-neutral-400">/{item.unit}</span>
              )}
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500">{item.description}</p>
        )}
        {item.nutrition && (
          <p className="mt-1 text-xs text-neutral-400">
            {[
              item.nutrition.calories_kcal !== undefined && `${item.nutrition.calories_kcal} kcal`,
              item.nutrition.protein_g !== undefined && `${item.nutrition.protein_g}g protein`,
              item.nutrition.carbs_g !== undefined && `${item.nutrition.carbs_g}g carbs`,
              item.nutrition.fat_g !== undefined && `${item.nutrition.fat_g}g fat`,
            ]
              .filter(Boolean)
              .join(" · ")}
            {item.nutrition.serving_g !== undefined &&
              ` · ${copy.chef.nutritionPer} (${item.nutrition.serving_g}g)`}
          </p>
        )}
        {!item.isAvailable && (
          <p className="mt-1 text-xs font-medium text-neutral-400">{copy.chef.unavailable}</p>
        )}
      </div>
    </div>
  );
}
