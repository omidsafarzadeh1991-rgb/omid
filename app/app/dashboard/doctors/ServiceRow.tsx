"use client";

import { useActionState, useTransition } from "react";
import {
  toggleServiceActiveAction,
  updateServiceAction,
  type UpdateServiceFormState,
} from "@/app/actions/clinic";

const initialState: UpdateServiceFormState = undefined;

export default function ServiceRow({
  id,
  name,
  price,
  active,
}: {
  id: string;
  name: string;
  price: string | null;
  active: boolean;
}) {
  const [togglePending, startToggle] = useTransition();
  const [state, action, pending] = useActionState(updateServiceAction, initialState);

  return (
    <li className="rounded-lg border border-slate-100 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={active ? "text-slate-700" : "text-slate-400 line-through"}>
          {name}
          {price && <span className="text-amber-700"> · {price}</span>}
          {!active && <span className="mr-1 text-slate-400"> (غیرفعال)</span>}
        </span>
        <div className="flex items-center gap-2">
          <details className="inline-block">
            <summary className="cursor-pointer text-teal-700 hover:underline">ویرایش</summary>
            <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="serviceId" value={id} />
              <input
                name="name"
                defaultValue={name}
                required
                className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
              <input
                name="price"
                defaultValue={price?.replace(/[^\d۰-۹]/g, "") ?? ""}
                placeholder="قیمت (تومان)"
                className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
              />
              <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
                {pending ? "..." : "ذخیره"}
              </button>
            </form>
            {state?.message && <p className="mt-1 text-red-600">{state.message}</p>}
          </details>
          <button
            type="button"
            disabled={togglePending}
            onClick={() => startToggle(() => toggleServiceActiveAction(id))}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-teal-50 text-teal-700 hover:bg-teal-100"
            }`}
          >
            {togglePending ? "..." : active ? "غیرفعال کردن" : "فعال کردن"}
          </button>
        </div>
      </div>
    </li>
  );
}
