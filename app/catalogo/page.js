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

  // ✅ ADD PRODUTO (COM UPLOAD CORRIGIDO)
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
        className="w-full mb-8 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
      />

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
            {Object.keys(novoProduto).map((key) => (
              key !== "tipo" && (
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
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                />
              )
            ))}
          </div>

          {/* 📌 UPLOAD DE IMAGEM (VOLTOU AQUI) */}
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
              <p className="text-white/50 text-sm">R$ {p.preco}</p>

              {role === "admin" && (
                <div className="flex justify-between mt-3">

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditandoProduto(p);
                    }}
                    className="text-blue-400 text-xs"
                  >
                    editar
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletarProduto(p);
                    }}
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setProdutoSelecionado(null)}>

          <div className="bg-[#111] max-w-4xl w-full rounded-2xl overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}>

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
                <p className="mt-4 text-xl">R$ {produtoSelecionado.preco}</p>
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

            {Object.keys(editandoProduto).map((key) => (
              key !== "id" && (
                <input
                  key={key}
                  value={editandoProduto[key] || ""}
                  onChange={(e) =>
                    setEditandoProduto({
                      ...editandoProduto,
                      [key]: e.target.value,
                    })
                  }
                  className="w-full mb-2 p-2 bg-black"
                  placeholder={key}
                />
              )
            ))}

            <div className="flex justify-between mt-4">
              <button onClick={() => setEditandoProduto(null)}>
                Cancelar
              </button>

              <button onClick={salvarEdicao} className="text-green-400">
                Salvar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}