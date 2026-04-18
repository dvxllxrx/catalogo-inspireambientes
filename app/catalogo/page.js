"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

// ============================================================
// ✅ CONFIG DA EMPRESA — altere aqui para cada cliente
// ============================================================
const configEmpresa = {
  nome: "Inspire Ambientes",
  endereco: "Av. Brasil, 4677 - Centro",
  whatsapp: "4532273913",
  horario: "Seg a Sex: 9h às 18h\nSáb: 9h às 13h",
  mensagemWhats: "Olá! Falei com a SOFIA e desejo saber mais. Algum consultor disponível?",
  // mapsUrl: "cole aqui o link direto do Maps se preferir",
};
// ============================================================

const perguntasAdmin = [
  "Tem estofado bege abaixo de R$ 15.000?",
  "Quais produtos são de couro ecológico?",
  "Me lista os sofás da indústria Buriti",
  "Qual o produto mais caro do showroom?",
  "Tem algum sofá maior que 3 metros?",
];

const perguntasPublico = [
  "Que tipos de estofados vocês têm?",
  "Como funciona uma encomenda?",
  "Vocês têm sofás em couro?",
  "Qual a faixa de preço dos produtos?",
  "Como posso visitar o showroom?",
];

// ============================================================
// COMPONENTE CHATBOT SOFIA — embutido, sem arquivo separado
// ============================================================
function ChatbotSOFIA({ role, produtos, config }) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [digitando, setDigitando] = useState(false);
  const bottomRef = useRef(null);

  const perguntas = role === "admin" ? perguntasAdmin : perguntasPublico;

  const whatsappLink = `https://wa.me/55${config.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(config.mensagemWhats)}`;
  const mapsLink = config.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.endereco)}`;

  useEffect(() => {
    if (aberto && messages.length === 0) {
      const boasVindas = role === "admin"
        ? `Olá! 👋 Sou a **SOFIA**, assistente inteligente da ${config.nome}. Estou com acesso a todos os produtos cadastrados. Como posso te ajudar agora?`
        : `Olá! Seja bem-vindo à **${config.nome}** ✨\n\nSou a SOFIA, sua assistente virtual. Posso te ajudar a conhecer nossos produtos, tirar dúvidas sobre materiais, medidas, localização e muito mais. O que você gostaria de saber?`;
      setMessages([{ role: "assistant", content: boasVindas }]);
    }
  }, [aberto]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, digitando]);

  const enviar = async (texto) => {
    const mensagem = texto || input.trim();
    if (!mensagem || carregando) return;

    setInput("");
    setCarregando(true);
    setDigitando(true);

    const novasMessages = [...messages, { role: "user", content: mensagem }];
    setMessages(novasMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: novasMessages, produtos, role, config }),
      });

      const data = await res.json();
      setDigitando(false);
      setMessages([...novasMessages, {
        role: "assistant",
        content: data.resposta || "Desculpe, tive um problema. Tente novamente.",
      }]);
    } catch {
      setDigitando(false);
      setMessages([...novasMessages, {
        role: "assistant",
        content: "Erro de conexão. Verifique sua internet e tente novamente.",
      }]);
    } finally {
      setCarregando(false);
    }
  };

  const formatarMsg = (texto) =>
    texto.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        onClick={() => setAberto(!aberto)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          aberto ? "bg-white/10 border border-white/20" : "bg-gradient-to-br from-cyan-500 to-purple-600 hover:scale-110"
        }`}
      >
        <span className="text-white text-xl">{aberto ? "✕" : "💬"}</span>
      </button>

      {/* JANELA */}
      {aberto && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[600px] flex flex-col rounded-2xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden">

          {/* HEADER */}
          <div className="px-5 py-4 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">S</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">SOFIA</p>
              <p className="text-white/40 text-xs truncate">{role === "admin" ? "Assistente de catálogo" : config.nome}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>

          {/* ABAS */}
          <div className="flex border-b border-white/10 shrink-0">
            <button
              onClick={() => setAba("chat")}
              className={`flex-1 py-2.5 text-xs font-medium transition ${aba === "chat" ? "text-white border-b-2 border-cyan-500" : "text-white/40 hover:text-white/70"}`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setAba("info")}
              className={`flex-1 py-2.5 text-xs font-medium transition ${aba === "info" ? "text-white border-b-2 border-cyan-500" : "text-white/40 hover:text-white/70"}`}
            >
              📍 Localização & Contato
            </button>
          </div>

          {/* ABA CHAT */}
          {aba === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white rounded-br-sm"
                          : "bg-white/5 border border-white/10 text-white/85 rounded-bl-sm"
                      }`}
                      dangerouslySetInnerHTML={{ __html: formatarMsg(msg.content) }}
                    />
                  </div>
                ))}

                {digitando && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-2 shrink-0">
                  {perguntas.slice(0, 3).map((p, i) => (
                    <button
                      key={i}
                      onClick={() => enviar(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/5 transition text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-3 border-t border-white/10 flex gap-2 shrink-0">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviar()}
                  placeholder="Digite sua pergunta..."
                  disabled={carregando}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition disabled:opacity-50"
                />
                <button
                  onClick={() => enviar()}
                  disabled={carregando || !input.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white transition hover:opacity-90 disabled:opacity-30"
                >
                  ➤
                </button>
              </div>
            </>
          )}

          {/* ABA INFO */}
          {aba === "info" && (
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Empresa</p>
                <p className="text-white font-medium">{config.nome}</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📍</span>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Endereço</p>
                    <p className="text-white text-sm">{config.endereco}</p>
                  </div>
                </div>
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-600/30 transition"
                >
                  🗺️ Abrir no Google Maps
                </a>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📱</span>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">WhatsApp</p>
                    <p className="text-white text-sm">
                      {config.whatsapp.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, "+$1 ($2) $3-$4")}
                    </p>
                  </div>
                </div>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition"
                >
                  💬 Falar com um consultor
                </a>
              </div>

              {config.horario && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">🕐</span>
                    <div>
                      <p className="text-white/40 text-xs mb-0.5">Horário de funcionamento</p>
                      <p className="text-white text-sm whitespace-pre-line">{config.horario}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-center text-white/30 text-xs pt-2">
                Ficou com dúvida? Pergunte para a SOFIA no chat 💬
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
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

  const formatarPreco = (valor) =>
    Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

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

  const deletarProduto = async (produto) => {
    await supabase.from("produtos").delete().eq("id", produto.id);
    buscarProdutos();
  };

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
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-40"
          onClick={() => { setProdutoSelecionado(null); setCopiado(false); }}
        >
          <div
            className="bg-[#111] max-w-4xl w-full rounded-2xl overflow-hidden border border-white/10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setProdutoSelecionado(null); setCopiado(false); }}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white transition"
            >
              ✕
            </button>

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
                <p className="mt-4 text-xl">{formatarPreco(produtoSelecionado.preco)}</p>

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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
          <div className="bg-[#111] p-6 rounded-xl w-[500px] relative">
            <button
              onClick={() => setEditandoProduto(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white transition"
            >
              ✕
            </button>

            <h2 className="mb-4 text-lg font-light">Editar produto</h2>

            {Object.keys(editandoProduto).map((key) =>
              key !== "id" && (
                <input
                  key={key}
                  value={editandoProduto[key] || ""}
                  onChange={(e) => setEditandoProduto({ ...editandoProduto, [key]: e.target.value })}
                  className="w-full mb-2 p-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm"
                  placeholder={key}
                />
              )
            )}

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setEditandoProduto(null)}
                className="px-4 py-2 rounded-full border border-white/10 text-white/50 hover:text-white text-sm transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition"
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SOFIA — embutida, sem import externo */}
      {role !== null && (
        <ChatbotSOFIA role={role} produtos={produtos} config={configEmpresa} />
      )}

    </div>
  );
}