"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: senha,
    });

    if (error) {
      alert("Email ou senha inválidos");
    } else {
      router.push("/catalogo");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="bg-zinc-900 p-8 rounded-2xl w-80">
        <h1 className="text-white text-2xl mb-6 text-center">
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 rounded bg-zinc-800 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-6 p-2 rounded bg-zinc-800 text-white"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-purple-600 text-white p-2 rounded"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}