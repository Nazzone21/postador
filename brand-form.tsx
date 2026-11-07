"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBrand, type FormState } from "./actions";

export function BrandForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createBrand, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <div>
        <label className="label" htmlFor="name">Nome da página</label>
        <input className="input" id="name" name="name" placeholder="Ex.: Minha Marca" required />
      </div>
      <div>
        <label className="label" htmlFor="handle">@ da página</label>
        <input className="input" id="handle" name="handle" placeholder="minhamarca" required />
      </div>
      <div>
        <label className="label" htmlFor="avatar">Avatar (opcional)</label>
        <input className="input py-1.5" id="avatar" name="avatar" type="file" accept=".png,.jpg,.jpeg,.webp" />
      </div>
      <button className="btn btn-primary" disabled={pending}>{pending ? "Criando…" : "Criar página"}</button>
      {state?.error && <p className="text-sm text-err sm:col-span-4">{state.error}</p>}
    </form>
  );
}
