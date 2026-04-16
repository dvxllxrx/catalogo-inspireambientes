"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [imagemFile, setImagemFile] = useState(null);

  const [user, setUser] = useState(null);

  const [undoItem, setUndoItem] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria: "",
    cor: "",
    material: "",
  });

  // 🔐 AUTH (mantido, mas não bloqueia UI)
  useEffect(() => {
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user || null);
    };

    initAuth();

    const { data } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user || null);
      }
    );

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*");
    setProdutos(data || []);
  };

  const adicionarProduto = async () => {
    let imageUrl = "";

    if (imagemFile) {
      const fileName = `${Date.now()}-${imagemFile.name}`;

      await supabase.storage.from("produtos").upload(fileName, imagemFile);

      const { data } = supabase.storage
        .from("produtos")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    await supabase.from("produtos").insert([
      {
        ...novoProduto,
        preco: Number(novoProduto.preco),
        imagem: imageUrl || null,
      },
    ]);

    setNovoProduto({
      nome: "",
      descricao: "",
      preco: "",
      categoria: "",
      cor: "",
      material: "",
    });

    setImagemFile(null);
    setMostrarForm(false);

    buscarProdutos();
  };

  const deletarProduto = async (produto) => {
    setProdutos((prev) => prev.filter((p) => p.id !== produto.id));

    setUndoItem(produto);
    setShowUndo(true);

    setTimeout(async () => {
      setShowUndo(false);

      await supabase
        .from("produtos")
        .delete()
        .eq("id", produto.id);

      setUndoItem(null);
    }, 5000);
  };

  const desfazer = () => {
    if (!undoItem) return;
    setProdutos((prev) => [undoItem, ...prev]);
    setUndoItem(null);
    setShowUndo(false);
  };

  // 🚪 LOGOUT FORÇADO (SEM DEPENDER DE ESTADO)
  const handleLogout = async () => {
    await supabase.auth.signOut();

    setUser(null);

    window.location.href =
      "https://catalogo-inspireambientes.vercel.app/";
  };

  const produtosFiltrados = produtos.filter((p) =>
    p.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10">

      {/* HEADER */}
      <div className="mb-10 flex justify-between items-center">

        <div>
          <h1 className="text-4xl text-[#c8a24a] font-light">
            Catálogo de Alto Padrão
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            STATUS: {user ? "LOGADO" : "VISITANTE"}
          </p>
        </div>

        {/* 🔥 BOTÃO SAIR FORÇADO (NUNCA SOME) */}
        <button
          onClick={handleLogout}
          className="px-5 py-3 bg-[#111] border border-[#2a2416] text-red-400 rounded-lg hover:opacity-80 transition"
        >
          Sair
        </button>

      </div>

      {/* BUSCA */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:w-1/3 p-3 bg-[#111] border border-[#2a2416] rounded-lg"
        />

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-5 py-3 bg-[#a8832f] text-black rounded-lg"
        >
          + Produto
        </button>
      </div>

      {/* FORM */}
      {mostrarForm && (
        <div className="mb-10 p-6 bg-[#111] border border-[#2a2416] rounded-xl">

          {Object.keys(novoProduto).map((key) => (
            <input
              key={key}
              placeholder={key}
              value={novoProduto[key]}
              onChange={(e) =>
                setNovoProduto({
                  ...novoProduto,
                  [key]: e.target.value,
                })
              }
              className="w-full mb-3 p-3 bg-[#0a0a0a] border border-[#2a2416] rounded-lg"
            />
          ))}

          <input
            type="file"
            onChange={(e) => setImagemFile(e.target.files?.[0])}
            className="w-full mb-3"
          />

          <button
            onClick={adicionarProduto}
            className="px-5 py-3 bg-[#a8832f] text-black rounded-lg"
          >
            Salvar
          </button>
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-3 gap-6">
        {produtosFiltrados.map((p) => (
          <div key={p.id} className="bg-[#111] border border-[#2a2416] rounded-2xl p-4">

            {p.imagem && (
              <img src={p.imagem} className="w-full h-48 object-cover" />
            )}

            <h2 className="text-[#c8a24a] mt-2">{p.nome}</h2>
            <p className="text-gray-400 text-sm">{p.descricao}</p>

            <p className="mt-2 text-[#c8a24a]">R$ {p.preco}</p>

            <button
              onClick={() => deletarProduto(p)}
              className="text-red-400 mt-3"
            >
              🗑️ Excluir
            </button>

          </div>
        ))}
      </div>

      {/* UNDO */}
      {showUndo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] px-5 py-3 rounded-xl flex gap-4">
          <span>Produto removido</span>
          <button onClick={desfazer} className="text-[#c8a24a]">
            Desfazer
          </button>
        </div>
      )}

    </div>
  );
}