"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // 🔐 CHECA SESSÃO ANTES DE MOSTRAR TELA
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.replace("/catalogo");
        return;
      }

      setCheckingSession(false);
    };

    check();
  }, []);

  const handleLogin = async () => {
    if (!email || !senha) {
      alert("Preencha email e senha");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setLoading(false);

    if (error || !data.session) {
      alert("Login inválido");
      return;
    }

    router.replace("/catalogo");
  };

  // 🔥 EVITA FLICKER (NÃO MOSTRA NADA ATÉ CHECAR SESSÃO)
  if (checkingSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <p className="animate-pulse text-zinc-400">
          Verificando sessão...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 bg-zinc-950 border border-yellow-900 rounded-2xl">

        <h1 className="text-3xl text-yellow-500 mb-6 text-center">
          SOFIA LOGIN
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 bg-black border border-zinc-800 rounded"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-6 p-3 bg-black border border-zinc-800 rounded"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-yellow-600 text-black rounded"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

      </div>
    </div>
  );
}