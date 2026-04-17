"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.replace("/catalogo");
        return;
      }

      setChecking(false);
    };

    check();
  }, []);

  const handleLogin = async () => {
    if (!email || !senha) return;

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

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <p className="text-zinc-400 animate-pulse">
          Carregando sistema...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-black overflow-hidden relative">

      {/* BACKGROUND ANIMADO */}
      <div className="absolute inset-0">
        <div className="absolute w-[600px] h-[600px] bg-cyan-500/20 blur-[150px] rounded-full top-[-150px] left-[-150px] animate-pulse" />
        <div className="absolute w-[600px] h-[600px] bg-purple-600/20 blur-[150px] rounded-full bottom-[-150px] right-[-150px] animate-pulse" />

        {/* camada extra movimento */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 via-black to-purple-900/10 animate-gradientMove" />
      </div>

      {/* CARD */}
      <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-black/60 backdrop-blur-xl z-10 shadow-2xl">

        {/* LOGO SOFIA DIVIDIDO */}
        <h1 className="text-5xl font-bold text-center mb-2 tracking-widest">
          <span className="text-cyan-400">SOF</span>
          <span className="text-purple-500">IA</span>
        </h1>

        <p className="text-center text-zinc-400 mb-8 text-sm">
          Software + Intelligence Artificial
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 bg-black border border-zinc-800 rounded-lg focus:border-cyan-400 outline-none"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-6 p-3 bg-black border border-zinc-800 rounded-lg focus:border-purple-500 outline-none"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 font-semibold rounded-lg transition bg-gradient-to-r from-cyan-500 to-purple-600 text-black hover:opacity-90"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-xs text-center text-zinc-500 mt-6">
          Powered by Supabase Auth
        </p>
      </div>

      {/* CSS ANIMADO (gradient move) */}
      <style jsx>{`
        .animate-gradientMove {
          background-size: 200% 200%;
          animation: move 6s ease infinite;
        }

        @keyframes move {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

    </div>
  );
}