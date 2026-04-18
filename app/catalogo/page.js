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
  const [editandoProduto, setEditandoProduto] = useState(null);

  // ✅ NOVO: state do botão copiar
  const [copiado, setCopiado] = useState(false);

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

  const [filtrosAvancados, setFiltrosAvancados] = useState({
    precoMin: "",
    precoMax: "",
    cor: "",
    material: "",
    medidas: "",
    industria: "",
    categoria: "",
    ordemPreco: "",
  });

  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // AUTH
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

  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*");
    setProdutos(data || []);
  };

  // ✅ NOVO: formata preço em R$ 20.265,00
  const formatarPreco = (valor) =>
    Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  // ✅ NOVO: copia ficha formatada para área de transferência
  const copiarFicha = async (produto) => {
    const texto = `🛋️ *${produto.nome}*

📋 *Descrição:* ${produto.descricao}

• *Cor:* ${produto.cor}
• *Material:* ${produto.material}
• *Medidas:* ${produto.medidas}
• *Categoria:* ${produto.categoria}
• *Indústria:* ${produto.industria}
• *Tipo:* ${produto.tipo}

💰 *Preço:* ${formatarPreco(produto.preco)}

_Inspire Ambientes — inspirados em você._`;

    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // ADD PRODUTO
  const adicionarProduto = async () => {
    try {
      let imageUrl = "https://via.placeholder.com/400x300";

      if (imagemFile) {
        const fileName = `${Date.now()}-${imagemFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("produtos")
          .upload(fileName, imagemFile);

        if (uploadError) {
          alert("Erro ao fazer upload da imagem");
          return;
        }

        const { data } = supabase.storage
          .from("produtos")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("produtos").insert([
        {
          ...novoProduto,
          preco: Number(novoProduto.preco),
          imagem: imageUrl,
        },
      ]);

      if (error) {
        alert("Erro ao salvar produto");
        return;
      }

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
      alert("Erro inesperado");
      console.error(err);
    }
  };

  // DELETE
  const deletarProduto = async (produto) => {
    await supabase.from("produtos").delete().eq("id", produto.id);
    buscarProdutos();
  };

  // EDIT
  const salvarEdicao = async () => {
    await supabase
      .from("produtos")
      .update(editandoProduto)
      .eq("id", editandoProduto.id);

    setEditandoProduto(null);
    buscarProdutos();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const produtosFiltrados = produtos
    .filter((p) => {
      if ((p.tipo || "showroom") !== aba) return false;

      const texto = `${p.nome || ""} ${p.descricao || ""} ${p.categoria || ""}`
        .toLowerCase();

      if (!texto.includes(busca.toLowerCase())) return false;

      if (filtrosAvancados.precoMin && Number(p.preco) < Number(filtrosAvancados.precoMin)) return false;
      if (filtrosAvancados.precoMax && Number(p.preco) > Number(filtrosAvancados.precoMax)) return false;
      if (filtrosAvancados.cor && !p.cor?.toLowerCase().includes(filtrosAvancados.cor.toLowerCase())) return false;
      if (filtrosAvancados.material && !p.material?.toLowerCase().includes(filtrosAvancados.material.toLowerCase())) return false;
      if (filtrosAvancados.categoria && !p.categoria?.toLowerCase().includes(filtrosAvancados.categoria.toLowerCase())) return false;

      return true;
    })
    .sort((a, b) => {
      if (filtrosAvancados.ordemPreco === "asc") return Number(a.preco) - Number(b.preco);
      if (filtrosAvancados.ordemPreco === "desc") return Number(b.preco) - Number(a.preco);
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 font-sans">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-wide">
            Showroom{" "}
            <span className="font-medium text-white">INSPIRE AMBIENTES</span>
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
        className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
      />

      {/* FILTRO AVANÇADO */}
      <button
        onClick={() => setMostrarFiltros(!mostrarFiltros)}
        className="mb-4 px-4 py-2 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 text-sm"
      >
        Filtros avançados
      </button>

      {/* PAINEL DE FILTROS */}
      {mostrarFiltros && (
        <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="grid md:grid-cols-2 gap-4">
            <input
              placeholder="Preço mínimo"
              value={filtrosAvancados.precoMin}
              onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, precoMin: e.target.value })}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg"
            />
            <input
              placeholder="Preço máximo"
              value={filtrosAvancados.precoMax}
              onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, precoMax: e.target.value })}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg"
            />
            <input
              placeholder="Cor"
              value={filtrosAvancados.cor}
              onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, cor: e.target.value })}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg"
            />
            <input
              placeholder="Material"
              value={filtrosAvancados.material}
              onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, material: e.target.value })}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg"
            />
            <input
              placeholder="Categoria"
              value={filtrosAvancados.categoria}
              onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, categoria: e.target.value })}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg"
            />
            <select
              value={filtrosAvancados.ordemPreco}
              onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, ordemPreco: e.target.value })}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg"
            >
              <option value="">Ordenar preço</option>
              <option value="asc">Menor → Maior</option>
              <option value="desc">Maior → Menor</option>
            </select>
          </div>
        </div>
      )}

      {/* ADD */}
      {role === "admin" && (
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="mb-8 px-5 py-2 bg-white text-black rounded-full"
        >
          + Adicionar produto
        </button>
      )}

      {/* FORM */}
      {mostrarForm && role === "admin" && (
        <div className="mb-10 p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(novoProduto).map((key) =>
              key !== "tipo" && (
                <input
                  key={key}
                  placeholder={key}
                  value={novoProduto[key]}
                  onChange={(e) => setNovoProduto({ ...novoProduto, [key]: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                />
              )
            )}
          </div>

          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImagemFile(e.target.files?.[0])}
              className="text-sm text-white/60"
            />
          </div>

          <button
            onClick={adicionarProduto}
            className="mt-4 px-5 py-2 bg-white text-black rounded-full"
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
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:scale-[1.03] transition duration-300 cursor-pointer"
            onClick={() => setProdutoSelecionado(p)}
          >
            <div className="aspect-[4/3] overflow-hidden bg-black">
              <img
                src={p.imagem}
                className="w-full h-full object-cover hover:scale-110 transition duration-500"
              />
            </div>

            <div className="p-4">
              <h2 className="text-lg font-light">{p.nome}</h2>
              {/* ✅ preço formatado nos cards também */}
              <p className="text-white/50 text-sm">{formatarPreco(p.preco)}</p>

              {role === "admin" && (
                <div className="flex justify-between mt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditandoProduto(p); }}
                    className="text-blue-400 text-xs"
                  >
                    editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletarProduto(p); }}
                    className="text-red-400 text-xs"
                  >
                    excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PRODUTO */}
      {produtoSelecionado && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => { setProdutoSelecionado(null); setCopiado(false); }}
        >
          <div
            className="bg-[#111] max-w-4xl w-full rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/9] overflow-hidden">
              <img
                src={produtoSelecionado.imagem}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-light">{produtoSelecionado.nome}</h2>
                <p className="text-white/60 mt-2">{produtoSelecionado.descricao}</p>

                {/* ✅ preço formatado no modal */}
                <p className="mt-4 text-xl">{formatarPreco(produtoSelecionado.preco)}</p>

                {/* ✅ BOTÃO COPIAR FICHA */}
                <button
                  onClick={() => copiarFicha(produtoSelecionado)}
                  className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                    copiado
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-white/20 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {copiado ? "✅ Copiado!" : "📋 Copiar ficha"}
                </button>
              </div>

              <div className="text-sm space-y-2 text-white/70">
                <p><b>Categoria:</b> {produtoSelecionado.categoria}</p>
                <p><b>Cor:</b> {produtoSelecionado.cor}</p>
                <p><b>Material:</b> {produtoSelecionado.material}</p>
                <p><b>Medidas:</b> {produtoSelecionado.medidas}</p>
                <p><b>Indústria:</b> {produtoSelecionado.industria}</p>
                <p><b>Tipo:</b> {produtoSelecionado.tipo}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editandoProduto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-[#111] p-6 rounded-xl w-[500px]">
            <h2 className="mb-4">Editar produto</h2>

            {Object.keys(editandoProduto).map((key) =>
              key !== "id" && (
                <input
                  key={key}
                  value={editandoProduto[key] || ""}
                  onChange={(e) => setEditandoProduto({ ...editandoProduto, [key]: e.target.value })}
                  className="w-full mb-2 p-2 bg-black"
                  placeholder={key}
                />
              )
            )}

            <div className="flex justify-between mt-4">
              <button onClick={() => setEditandoProduto(null)}>Cancelar</button>
              <button onClick={salvarEdicao} className="text-green-400">Salvar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}