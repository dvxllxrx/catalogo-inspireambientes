"use client";

import { useEffect, useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [typedText, setTypedText] = useState("");

  const fullText = "SOFIA";

  // efeito de digitação seguro
  useEffect(() => {
    let i = 0;

    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;

      if (i > fullText.length) clearInterval(interval);
    }, 180);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      alert("Login autorizado (simulação)");
      window.location.href = "/catalogo";
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white relative overflow-hidden">

      {/* fundo dourado suave */}
      <div className="absolute w-[600px] h-[600px] bg-yellow-600 opacity-10 blur-[140px] rounded-full top-[-200px] left-[-200px]" />
      <div className="absolute w-[500px] h-[500px] bg-yellow-500 opacity-10 blur-[160px] rounded-full bottom-[-200px] right-[-200px]" />

      {/* card login */}
      <div className="w-full max-w-md p-8 bg-zinc-950 border border-yellow-900 rounded-2xl shadow-2xl z-10 animate-fadeIn">

        {/* topo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl tracking-[0.4em] text-yellow-500 font-light h-10">
            {typedText}
            <span className="animate-pulse">|</span>
          </h1>

          <p className="text-xs text-zinc-400 mt-2 tracking-widest">
            FILES PLATFORM BY IA
          </p>
        </div>

        {/* inputs */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 p-3 bg-black border border-zinc-800 rounded-lg outline-none focus:border-yellow-500"
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-6 p-3 bg-black border border-zinc-800 rounded-lg outline-none focus:border-yellow-500"
        />

        {/* botão */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-yellow-600 text-black font-semibold rounded-lg hover:bg-yellow-500 transition flex items-center justify-center"
        >
          {loading ? "Entrando..." : "Entrar no Sistema"}
        </button>

        {/* rodapé */}
        <p className="text-[10px] text-center text-zinc-500 mt-6 tracking-widest">
          SOFIA FILES PLATFORM • HIGH LEVEL ACCESS
        </p>
      </div>

      {/* animação segura */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out;
        }
      `}</style>

    </div>
  );
}