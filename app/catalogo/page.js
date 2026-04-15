"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroCor, setFiltroCor] = useState("");
  const [filtroMaterial, setFiltroMaterial] = useState("");
  const [ordenacao, setOrdenacao] = useState("");

  const [novoProduto, setNovoProduto] = useState({
    nome: "",
    descricao: "",
    preco: "",
    categoria: "",
    imagem: "",
    cor: "",
    material: "",
  });

  useEffect(() => {
    buscarProdutos();
  }, []);

  const buscarProdutos = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("produtos")
      .select("*");

    if (!error) setProdutos(data);
    setLoading(false);
  };

  const adicionarProduto = async () => {
    const { error } = await supabase
      .from("produtos")
      .insert([novoProduto]);

    if (error) {
      alert("Erro ao salvar");
      return;
    }

    setMostrarForm(false);
    setNovoProduto({
      nome: "",
      descricao: "",
      preco: "",
      categoria: "",
      imagem: "",
      cor: "",
      material: "",
    });

    buscarProdutos();
  };

  const deletarProduto = async (id) => {
    const { error } = await supabase
      .from("produtos")
      .delete()
      .eq("id", id);

    if (!error) buscarProdutos();
  };

  let produtosFiltrados = produtos.filter((p) => {
    const matchBusca = p.nome
      ?.toLowerCase()
      .includes(busca.toLowerCase());

    const matchCategoria = filtroCategoria
      ? p.categoria === filtroCategoria
      : true;

    const matchCor = filtroCor ? p.cor === filtroCor : true;

    const matchMaterial = filtroMaterial
      ? p.material === filtroMaterial
      : true;

    return matchBusca && matchCategoria && matchCor && matchMaterial;
  });

  // ordenação
  if (ordenacao === "menor") {
    produtosFiltrados.sort((a, b) => a.preco - b.preco);
  }

  if (ordenacao === "maior") {
    produtosFiltrados.sort((a, b) => b.preco - a.preco);
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl mb-6 font-bold">
        Catálogo Premium
      </h1>

      {/* BUSCA + AÇÕES */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          className="p-2 bg-zinc-800 rounded w-full md:w-1/3"
          placeholder="Buscar produtos..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-purple-600 px-4 rounded"
        >
          + Produto
        </button>

        <button
          onClick={() => {
            setFiltroCategoria("");
            setFiltroCor("");
            setFiltroMaterial("");
            setOrdenacao("");
            setBusca("");
          }}
          className="bg-zinc-700 px-4 rounded"
        >
          Limpar filtros
        </button>
      </div>

      {/* FILTROS PROFISSIONAIS */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <select
          className="p-2 bg-zinc-800 rounded"
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Categoria</option>
          <option value="roupa">Roupa</option>
          <option value="sapato">Sapato</option>
          <option value="acessorio">Acessório</option>
        </select>

        <select
          className="p-2 bg-zinc-800 rounded"
          onChange={(e) => setFiltroCor(e.target.value)}
        >
          <option value="">Cor</option>
          <option value="preto">Preto</option>
          <option value="branco">Branco</option>
          <option value="azul">Azul</option>
        </select>

        <select
          className="p-2 bg-zinc-800 rounded"
          onChange={(e) => setFiltroMaterial(e.target.value)}
        >
          <option value="">Material</option>
          <option value="algodao">Algodão</option>
          <option value="couro">Couro</option>
          <option value="plastico">Plástico</option>
        </select>

        <select
          className="p-2 bg-zinc-800 rounded"
          onChange={(e) => setOrdenacao(e.target.value)}
        >
          <option value="">Ordenar</option>
          <option value="menor">Menor preço</option>
          <option value="maior">Maior preço</option>
        </select>
      </div>

      {/* FORM */}
      {mostrarForm && (
        <div className="bg-zinc-900 p-4 rounded mb-6">
          {Object.keys(novoProduto).map((key) => (
            <input
              key={key}
              placeholder={key}
              className="w-full p-2 mb-2 rounded bg-zinc-800"
              onChange={(e) =>
                setNovoProduto({
                  ...novoProduto,
                  [key]: e.target.value,
                })
              }
            />
          ))}

          <button
            onClick={adicionarProduto}
            className="bg-green-600 px-4 py-2 rounded"
          >
            Salvar Produto
          </button>
        </div>
      )}

      {/* LOADING */}
      {loading && <p>Carregando produtos...</p>}

      {/* GRID */}
      {!loading && produtosFiltrados.length === 0 && (
        <p>Nenhum produto encontrado.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {produtosFiltrados.map((produto) => (
          <div
            key={produto.id}
            className="bg-zinc-900 p-4 rounded-lg hover:scale-105 transition"
          >
            <img
              src={produto.imagem}
              className="w-full h-40 object-cover rounded mb-2"
            />

            <h2 className="text-lg font-bold">
              {produto.nome}
            </h2>

            <p className="text-sm text-gray-400">
              {produto.descricao}
            </p>

            <p className="mt-2 font-bold">
              R$ {produto.preco}
            </p>

            <button
              onClick={() => deletarProduto(produto.id)}
              className="mt-3 text-red-400 text-sm"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}