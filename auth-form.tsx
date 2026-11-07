"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "./actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : signup,
    undefined,
  );

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5b7cff] to-[#2440d8] text-lg font-extrabold text-white shadow-[0_10px_30px_-8px_rgba(47,92,255,0.8)]">
            C
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{mode === "login" ? "Entrar no Cadência" : "Criar sua conta"}</h1>
          <p className="mt-1 text-sm text-muted">Agende seus vídeos e deixe o servidor publicar.</p>
        </div>
        <form action={action} className="card space-y-4 p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
          {mode === "signup" && (
            <div>
              <label className="label" htmlFor="name">Nome</label>
              <input className="input" id="name" name="name" autoComplete="name" required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </div>
          {state?.error && <p className="rounded-lg bg-err-soft px-3 py-2 text-sm text-err">{state.error}</p>}
          <button className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (
            <>Ainda não tem conta? <Link className="text-accent-ink hover:underline" href="/cadastro">Criar conta</Link></>
          ) : (
            <>Já tem conta? <Link className="text-accent-ink hover:underline" href="/login">Entrar</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
