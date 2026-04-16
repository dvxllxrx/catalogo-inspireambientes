"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [imagemFile, setImagemFile] = useState(null);

  const [user, setUser] = useState(null);

  const [tab, setTab] = useState("showroom"); // showroom | encomenda

  const [undoItem, setUndoItem] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria: "",
    cor: "",
    material: "",
    medidas: "",
    tipo: "showroom", // showroom | encomenda
  });

  // 🔐 AUTH LIMPO (SEM DUPLICAÇÃO)
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setUser(data?.session?.user ?? null);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 📦 PRODUTOS
  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*");
    setProdutos(data || []);
  };

  // ➕ ADICIONAR PRODUTO
  const adicionarProduto = async () => {
    let imageUrl = "";

    if (imagemFile) {
      const fileName = `${Date.now()}-${imagemFile.name}`;

      const { error } = await supabase.storage
        .from("produtos")
        .upload(fileName, imagemFile);

      if (!error) {
        const { data } = supabase.storage
          .from("produtos")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }
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
      medidas: "",
      tipo: "showroom",
    });

    setImagemFile(null);
    setMostrarForm(false);

    buscarProdutos();
  };

  // 🗑 DELETE + UNDO
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

  // 🚪 LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href =
      "https://catalogo-inspireambientes.vercel.app/";
  };

  // 🔍 FILTRO
  const produtosFiltrados = produtos.filter((p) => {
    const matchBusca =
      `${p.nome} ${p.categoria} ${p.descricao}`
        .toLowerCase()
        .includes(busca.toLowerCase());

    const matchTab = p.tipo === tab;

    return matchBusca && matchTab;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10">

      {/* HEADER */}
      <div className="mb-8 flex justify-between items-center border-b border-[#2a2416] pb-4">

        <div>
          <h1 className="text-3xl text-[#c8a24a] font-light">
            Showroom by SOFIA Platform IA
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            MODE: {user ? "ADMIN" : "VISITANTE"}
          </p>
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="px-5 py-2 bg-[#111] border border-[#2a2416] text-red-400 rounded-lg"
          >
            Sair
          </button>
        )}

      </div>

      {/* ABAS */}
      <div className="flex gap-4 mb-6">

        <button
          onClick={() => setTab("showroom")}
          className={`px-4 py-2 rounded-lg border ${
            tab === "showroom"
              ? "bg-[#c8a24a] text-black"
              : "border-[#2a2416]"
          }`}
        >
          Showroom
        </button>

        <button
          onClick={() => setTab("encomenda")}
          className={`px-4 py-2 rounded-lg border ${
            tab === "encomenda"
              ? "bg-[#c8a24a] text-black"
              : "border-[#2a2416]"
          }`}
        >
          Sob Encomenda
        </button>

      </div>

      {/* BUSCA + ADD */}
      <div className="flex gap-3 mb-6 flex-wrap">

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar..."
          className="w-full md:w-1/3 p-3 bg-[#111] border border-[#2a2416] rounded-lg"
        />

        {user && (
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="px-5 py-3 bg-[#a8832f] text-black rounded-lg"
          >
            + Produto
          </button>
        )}

      </div>

      {/* FORM */}
      {mostrarForm && user && (
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
          <div
            key={p.id}
            className="bg-[#111] border border-[#2a2416] rounded-2xl overflow-hidden hover:scale-[1.02] transition"
          >

            <div className="h-48">
              {p.imagem ? (
                <img
                  src={p.imagem}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#1a1a1a]" />
              )}
            </div>

            <div className="p-5">

              <h2 className="text-[#c8a24a]">{p.nome}</h2>

              <p className="text-gray-400 text-sm">
                {p.descricao}
              </p>

              <p className="text-xs mt-2 text-gray-500">
                Medidas: {p.medidas || "não informado"}
              </p>

              <div className="flex justify-between mt-4">

                <p className="text-[#c8a24a]">
                  R$ {p.preco}
                </p>

                {user && (
                  <button
                    onClick={() => deletarProduto(p)}
                    className="text-red-400"
                  >
                    🗑️
                  </button>
                )}

              </div>

            </div>
          </div>
        ))}

      </div>

      {/* UNDO */}
      {showUndo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111] px-5 py-3 rounded-xl border border-[#2a2416] flex gap-4">
          <span>Produto removido</span>
          <button onClick={desfazer} className="text-[#c8a24a]">
            Desfazer
          </button>
        </div>
      )}

    </div>
  );
}