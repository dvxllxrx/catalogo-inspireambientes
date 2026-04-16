"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

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
    const { data, error } = await supabase.from("produtos").select("*");
    if (!error) setProdutos(data);
  };

  const adicionarProduto = async () => {
    let imageUrl = "";

    if (novoProduto.imagem instanceof File) {
      const file = novoProduto.imagem;
      const fileName = `${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("produtos")
        .upload(fileName, file);

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
        imagem: imageUrl,
        preco: Number(novoProduto.preco),
      },
    ]);

    setNovoProduto({
      nome: "",
      descricao: "",
      preco: "",
      categoria: "",
      imagem: "",
      cor: "",
      material: "",
    });

    setMostrarForm(false);
    buscarProdutos();
  };

  const produtosFiltrados = produtos.filter((p) =>
    p.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10">
      
      {/* HEADER LUXO */}
      <div className="mb-10">
        <h1 className="text-4xl tracking-wide font-light text-[#c8a24a]">
          Catálogo de Alto Padrão
        </h1>
        <p className="text-gray-400 mt-2">
          Móveis exclusivos e design refinado
        </p>
      </div>

      {/* BUSCA + BOTÃO */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          placeholder="Buscar peças..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:w-1/3 p-3 bg-[#111111] border border-[#2a2416] rounded-lg outline-none"
        />

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="px-5 py-3 bg-[#a8832f] text-black rounded-lg hover:bg-[#c8a24a] transition"
        >
          + Novo Produto
        </button>
      </div>

      {/* FORMULÁRIO LUXO */}
      {mostrarForm && (
        <div className="mb-10 p-6 bg-[#111111] border border-[#2a2416] rounded-xl">
          
          {Object.keys(novoProduto).map((key) => (
            <input
              key={key}
              placeholder={key}
              className="w-full mb-3 p-3 bg-[#0a0a0a] border border-[#2a2416] rounded-lg outline-none"
              onChange={(e) =>
                setNovoProduto({
                  ...novoProduto,
                  [key]:
                    key === "imagem"
                      ? e.target.files?.[0] || e.target.value
                      : e.target.value,
                })
              }
              type={key === "imagem" ? "file" : "text"}
            />
          ))}

          <button
            onClick={adicionarProduto}
            className="mt-4 px-5 py-3 bg-[#a8832f] text-black rounded-lg hover:bg-[#c8a24a]"
          >
            Salvar Produto
          </button>
        </div>
      )}

      {/* GRID LUXO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {produtosFiltrados.map((p) => (
          <div
            key={p.id}
            className="bg-[#111111] border border-[#2a2416] rounded-2xl overflow-hidden hover:scale-[1.02] transition duration-300"
          >
            <img
              src={p.imagem}
              className="w-full h-48 object-cover"
            />

            <div className="p-5">
              <h2 className="text-lg font-light text-[#c8a24a]">
                {p.nome}
              </h2>

              <p className="text-sm text-gray-400 mt-1">
                {p.descricao}
              </p>

              <p className="mt-3 text-[#c8a24a] font-semibold">
                R$ {p.preco}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}