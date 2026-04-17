"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [imagemFile, setImagemFile] = useState(null);

  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  const [aba, setAba] = useState("showroom");
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria: "",
    cor: "",
    material: "",
    medidas: "",
    tipo: "showroom",
    industria: "",
  });

  // AUTH REAL
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      setUser(user);

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole(data?.role || "user");
    };

    initAuth();
  }, []);

  // BUSCAR PRODUTOS
  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    try {
      const { data, error } = await supabase.from("produtos").select("*");
      if (error) throw error;
      setProdutos(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // SALVAR PRODUTO
  const adicionarProduto = async () => {
    try {
      let imageUrl = "https://via.placeholder.com/400x300";

      if (imagemFile) {
        const fileName = `${Date.now()}-${imagemFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("produtos")
          .upload(fileName, imagemFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("produtos")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("produtos").insert([
        {
          nome: novoProduto.nome,
          descricao: novoProduto.descricao,
          preco: Number(novoProduto.preco) || 0,
          categoria: novoProduto.categoria,
          cor: novoProduto.cor,
          material: novoProduto.material || null,
          medidas: novoProduto.medidas || null,
          tipo: novoProduto.tipo || "showroom",
          industria: novoProduto.industria || null,
          imagem: imageUrl,
        },
      ]);

      if (error) throw error;

      alert("Produto salvo com sucesso");

      setNovoProduto({
        nome: "",
        descricao: "",
        preco: "",
        categoria: "",
        cor: "",
        material: "",
        medidas: "",
        tipo: "showroom",
        industria: "",
      });

      setImagemFile(null);
      setMostrarForm(false);
      buscarProdutos();

    } catch (err) {
      alert("Erro: " + err.message);
    }
  };

  const deletarProduto = async (produto) => {
    await supabase.from("produtos").delete().eq("id", produto.id);
    buscarProdutos();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const produtosFiltrados = produtos.filter(
    (p) =>
      (p.tipo || "showroom") === aba &&
      `${p.nome || ""} ${p.descricao || ""} ${p.categoria || ""}`
        .toLowerCase()
        .includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 font-sans">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">

        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-wide">
            Showroom{" "}
            <span className="font-medium text-white">
              INSPIRE AMBIENTES
            </span>
          </h1>

          <p className="text-sm text-white/40 mt-1">
            Modo de acesso:{" "}
            <span className={role === "admin" ? "text-emerald-400" : "text-white/40"}>
              {role === "admin" ? "Administrador" : "Visitante"}
            </span>
          </p>
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 transition"
          >
            Sair
          </button>
        )}
      </div>

      {/* ABAS */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setAba("showroom")}
          className={`px-4 py-2 rounded-full text-sm transition border ${
            aba === "showroom"
              ? "bg-white text-black border-white"
              : "border-white/10 text-white/60 hover:text-white"
          }`}
        >
          Showroom
        </button>

        <button
          onClick={() => setAba("encomenda")}
          className={`px-4 py-2 rounded-full text-sm transition border ${
            aba === "encomenda"
              ? "bg-white text-black border-white"
              : "border-white/10 text-white/60 hover:text-white"
          }`}
        >
          Encomenda
        </button>
      </div>

      {/* BUSCA */}
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar produtos..."
        className="w-full mb-8 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition"
      />

      {/* ADD */}
      {role === "admin" && (
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="mb-8 px-5 py-2 rounded-full bg-white text-black text-sm hover:opacity-80 transition"
        >
          + Adicionar produto
        </button>
      )}

      {/* FORM */}
      {mostrarForm && role === "admin" && (
        <div className="mb-10 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">

          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(novoProduto).map((key) => {
              if (key === "tipo") return null;

              return (
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
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 outline-none"
                />
              );
            })}
          </div>

          <div className="mt-4">
            <select
              value={novoProduto.tipo}
              onChange={(e) =>
                setNovoProduto({ ...novoProduto, tipo: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white"
            >
              <option value="showroom">Showroom</option>
              <option value="encomenda">Encomenda</option>
            </select>
          </div>

          <div className="mt-4">
            <input
              type="file"
              onChange={(e) => setImagemFile(e.target.files?.[0])}
              className="text-sm text-white/60"
            />
          </div>

          <button
            onClick={adicionarProduto}
            className="mt-5 px-5 py-2 rounded-full bg-white text-black hover:opacity-80 transition"
          >
            Salvar produto
          </button>
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-3 gap-6">

        {produtosFiltrados.map((p) => (
          <div
            key={p.id}
            onClick={() => setProdutoSelecionado(p)}
            className="group cursor-pointer rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >

            <div className="h-48 overflow-hidden">
              <img
                src={p.imagem}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>

            <div className="p-4">
              <h2 className="text-lg font-light">{p.nome}</h2>
              <p className="text-white/50 text-sm mt-1">R$ {p.preco}</p>

              {role === "admin" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deletarProduto(p);
                  }}
                  className="mt-3 text-xs text-red-400 hover:text-red-300"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {produtoSelecionado && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setProdutoSelecionado(null)}
        >
          <div
            className="bg-[#111] max-w-3xl w-full rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={produtoSelecionado.imagem}
              className="w-full h-72 object-cover"
            />

            <div className="p-6">
              <h2 className="text-2xl font-light">
                {produtoSelecionado.nome}
              </h2>

              <p className="text-white/60 mt-2">
                {produtoSelecionado.descricao}
              </p>

              <button
                onClick={() => setProdutoSelecionado(null)}
                className="mt-6 px-5 py-2 rounded-full bg-white text-black"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}