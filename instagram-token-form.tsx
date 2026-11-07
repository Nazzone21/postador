"use client";

import { useActionState, useState } from "react";
import { connectInstagramWithToken, type TokenState } from "./instagram-actions";

/** Formulário para colar o token gerado no painel da Meta. */
export function InstagramTokenForm({ brandId }: { brandId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<TokenState, FormData>(
    connectInstagramWithToken.bind(null, brandId),
    undefined,
  );

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost px-4 py-1.5 text-xs">
        Conectar com token
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 space-y-2">
      <label className="hint block" htmlFor={`token-${brandId}`}>
        Cole o token gerado no painel da Meta (Casos de uso → API do Instagram → Gerar tokens de acesso).
      </label>
      <input
        id={`token-${brandId}`}
        name="token"
        type="password"
        autoComplete="off"
        spellCheck={false}
        className="input"
        placeholder="Token de acesso"
        required
      />
      <div className="flex gap-2">
        <button className="btn btn-primary px-4 py-1.5 text-xs" disabled={pending}>
          {pending ? "Verificando…" : "Conectar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost px-4 py-1.5 text-xs">
          Cancelar
        </button>
      </div>
      {state?.error && <p className="text-xs text-err">{state.error}</p>}
    </form>
  );
}
