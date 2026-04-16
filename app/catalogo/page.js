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

  // AUTH LOCAL SIMPLES
  useEffect(() => {
    const admin = localStorage.getItem("admin");
    if (admin === "true") setUser({ admin: true });
  }, []);

  // BUSCAR
  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    const { data, error } = await supabase.from("produtos").select("*");

    if (error) {
      alert(error.message);
      return;
    }

    setProdutos(data || []);
  };

  // SALVAR
  const adicionarProduto = async () => {
    try {
      let imageUrl = "https://via.placeholder.com/400x300"; // 🔥 evita erro NOT NULL

      if (imagemFile) {
        const fileName = `${Date.now()}-${imagemFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("produtos")
          .upload(fileName, imagemFile);

        if (uploadError) {
          alert(uploadError.message);
          return;
        }

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
          industria: novoProduto.industria || null, // ✅ sem acento
          imagem: imageUrl, // 🔥 sempre preenchido
        },
      ]);

      if (error) {
        alert("Erro: " + error.message);
        return;
      }

      alert("Salvo com sucesso");

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
      alert(err.message);
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

  const produtosFiltrados = produtos.filter((p) =>
    (p.tipo || "showroom") === aba &&
    `${p.nome || ""} ${p.descricao || ""} ${p.categoria || ""}`
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">

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
              className="block w-full mb-2 p-2 bg-black"
            />
          ))}

          <input type="file" onChange={(e) => setImagemFile(e.target.files?.[0])} />

          <button onClick={adicionarProduto}>Salvar</button>
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-3 gap-4">
        {produtosFiltrados.map((p) => (
          <div
            key={p.id}
            className="bg-[#111] p-3 cursor-pointer"
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

      {/* MODAL */}
      {produtoSelecionado && (
        <div
          className="fixed inset-0 bg-black/80 flex justify-center items-center"
          onClick={() => setProdutoSelecionado(null)}
        >
          <div className="bg-[#111] p-6">
            <h2>{produtoSelecionado.nome}</h2>
            <p>{produtoSelecionado.descricao}</p>
            <p>{produtoSelecionado.medidas}</p>
            <p>{produtoSelecionado.industria}</p>
          </div>
        </div>
      )}

    </div>
  );
}