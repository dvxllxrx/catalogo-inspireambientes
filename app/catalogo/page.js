"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [imagemFile, setImagemFile] = useState(null);
  const [user, setUser] = useState(null);
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

  // AUTH LOCAL
  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (admin === "true") setUser({ admin: true });
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

      alert("Produto salvo");

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

  // DELETE
  const deletarProduto = async (produto) => {
    await supabase.from("produtos").delete().eq("id", produto.id);
    buscarProdutos();
  };

  const handleLogout = () => {
    localStorage.removeItem("admin");
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
    <div className="min-h-screen bg-black text-white p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl text-yellow-500">
            Showroom by SOFIA Platform IA
          </h1>
          <p>MODE: {user ? "ADMIN" : "VISITANTE"}</p>
        </div>

        {user && <button onClick={handleLogout}>Sair</button>}
      </div>

      {/* ABAS */}
      <div className="flex gap-4 mb-4">
        <button onClick={() => setAba("showroom")}>Showroom</button>
        <button onClick={() => setAba("encomenda")}>Encomenda</button>
      </div>

      {/* BUSCA */}
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar..."
        className="mb-4 p-2 bg-[#111] w-full"
      />

      {/* ADD */}
      {user && (
        <button onClick={() => setMostrarForm(!mostrarForm)}>
          + Produto
        </button>
      )}

      {/* FORM */}
      {mostrarForm && (
        <div className="bg-[#111] p-4 mb-6">

          {/* INPUTS */}
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
                className="block w-full mb-2 p-2 bg-black"
              />
            );
          })}

          {/* SELECT TIPO */}
          <select
            value={novoProduto.tipo}
            onChange={(e) =>
              setNovoProduto({ ...novoProduto, tipo: e.target.value })
            }
            className="w-full mb-2 p-2 bg-black"
          >
            <option value="showroom">Showroom</option>
            <option value="encomenda">Encomenda</option>
          </select>

          <input
            type="file"
            onChange={(e) => setImagemFile(e.target.files?.[0])}
          />

          <button onClick={adicionarProduto}>Salvar</button>
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-3 gap-4">
        {produtosFiltrados.map((p) => (
          <div
            key={p.id}
            className="bg-[#111] p-3 cursor-pointer hover:scale-105 transition"
            onClick={() => setProdutoSelecionado(p)}
          >
            <img src={p.imagem} className="h-40 w-full object-cover" />
            <h2>{p.nome}</h2>
            <p>R$ {p.preco}</p>

            {user && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletarProduto(p);
                }}
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>

      {/* MODAL PREMIUM */}
      {produtoSelecionado && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setProdutoSelecionado(null)}
        >
          <div
            className="bg-[#111] max-w-4xl w-full mx-4 rounded-2xl overflow-hidden border border-[#2a2416]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[300px]">
              <img
                src={produtoSelecionado.imagem}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl text-yellow-500">
                  {produtoSelecionado.nome}
                </h2>
                <p className="text-gray-400 mt-2">
                  {produtoSelecionado.descricao}
                </p>
                <p className="mt-4 text-lg">
                  R$ {produtoSelecionado.preco}
                </p>
              </div>

              <div className="text-sm space-y-2">
                <p><b>Categoria:</b> {produtoSelecionado.categoria}</p>
                <p><b>Cor:</b> {produtoSelecionado.cor}</p>
                <p><b>Material:</b> {produtoSelecionado.material || "-"}</p>
                <p><b>Medidas:</b> {produtoSelecionado.medidas || "-"}</p>
                <p><b>Indústria:</b> {produtoSelecionado.industria || "-"}</p>
                <p>
                  <b>Tipo:</b>{" "}
                  {produtoSelecionado.tipo === "encomenda"
                    ? "Sob Encomenda"
                    : "Showroom"}
                </p>
              </div>
            </div>

            <div className="p-4 text-right border-t border-[#2a2416]">
              <button
                onClick={() => setProdutoSelecionado(null)}
                className="px-4 py-2 bg-yellow-500 text-black rounded"
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