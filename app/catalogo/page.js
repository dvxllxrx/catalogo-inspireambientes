"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

// ============================================================
// ✅ CONFIG DA EMPRESA — base da SOFIA
// ============================================================
const configEmpresa = {
  nome: "Inspire Ambientes",
  endereco: "Av. Brasil, 4677 - Centro",
  whatsapp: "45932273913",
  horario: "Seg a Sex: 9h às 18h\nSáb: 9h às 13h",
  mensagemWhats: "Olá! Falei com a SOFIA e desejo saber mais. Algum consultor disponível?",
  // mapsUrl: "cole aqui link direto do Google Maps se preferir",
};

// ============================================================
// 🔑 MULTI-TENANT — mapeamento de email → empresa
// Emails MASTER veem todos os produtos de todas as empresas.
// Os demais veem apenas os produtos da sua empresa.
// Para adicionar novo cliente: adicione o email e o valor
// do campo "empresa" da tabela produtos no Supabase.
// ============================================================
const EMAILS_MASTER = [
  "empresarialwagnerdvellore@gmail.com",
  "visitante@gmail.com",
];

const EMAIL_PARA_EMPRESA = {
  "inspireambientes2021@gmail.com": "inspire_ambientes",
  // "novaempresa@email.com": "nome_empresa_no_supabase",
};
// ============================================================

// ============================================================
// 🔍 BUSCA INTELIGENTE — exata para campos, ±5000 para preço
// Busca apenas em produtos do tipo "showroom"
// ============================================================
function buscarNoCatalogo(input, produtos) {
  const texto = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const normalizar = (str) =>
    (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Só produtos showroom
  const showroom = produtos.filter((p) => (p.tipo || "showroom") === "showroom");

  // Extrai medida exata da pergunta (ex: 2,50 / 2.50 / 250cm / 3,40m)
  const regexMedida = /(\d+[.,]\d+)\s*(?:cm|m)?|(\d{3})\s*cm/gi;
  const medidasBuscadas = [];
  let m;
  while ((m = regexMedida.exec(texto)) !== null) {
    const val = parseFloat((m[1] || m[2]).replace(",", "."));
    if (val > 0) medidasBuscadas.push(val);
  }

  // Extrai preço da pergunta
  const regexPreco = /(?:r\$\s*)?(\d[\d.,]*)\s*(?:mil|reais|k)?/gi;
  const precosBuscados = [];
  while ((m = regexPreco.exec(texto)) !== null) {
    let val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    if (texto.includes("mil") || texto.includes("k")) val *= 1000;
    if (!isNaN(val) && val >= 500) precosBuscados.push(val);
  }

  const TOLERANCIA_PRECO = 5000;

  return showroom.filter((p) => {
    let score = 0;

    const nomeProd = normalizar(p.nome);
    const corProd = normalizar(p.cor);
    const materialProd = normalizar(p.material);
    const categoriaProd = normalizar(p.categoria);
    const industriaProd = normalizar(p.industria);
    const descricaoProd = normalizar(p.descricao);

    // ── MEDIDA: match EXATO (sem tolerância)
    if (medidasBuscadas.length > 0 && p.medidas) {
      const medidaProd = parseFloat(
        normalizar(p.medidas).replace("cm", "").replace("m", "").replace(",", ".").trim()
      );
      if (medidasBuscadas.some((mv) => mv === medidaProd)) score += 10;
    }

    // ── PREÇO: tolerância ±5.000
    if (precosBuscados.length > 0) {
      const preco = Number(p.preco);
      const contem = (...w) => w.some((x) => texto.includes(x));
      if (contem("abaixo", "até", "ate", "menos de", "menor que")) {
        if (precosBuscados.some((v) => preco <= v + TOLERANCIA_PRECO)) score += 5;
      } else if (contem("acima", "mais de", "maior que")) {
        if (precosBuscados.some((v) => preco >= v - TOLERANCIA_PRECO)) score += 5;
      } else {
        if (precosBuscados.some((v) => Math.abs(preco - v) <= TOLERANCIA_PRECO)) score += 6;
      }
    }

    // ── COR: match exato de palavra (case insensitive)
    const coresPalavras = texto.match(/\b\w+\b/g) || [];
    coresPalavras.forEach((palavra) => {
      if (palavra.length > 2 && corProd.includes(palavra)) score += 4;
    });

    // ── MATERIAL: match exato
    const materiaisPalavras = texto.match(/\b\w+\b/g) || [];
    materiaisPalavras.forEach((palavra) => {
      if (palavra.length > 3 && materialProd.includes(palavra)) score += 4;
    });

    // ── CATEGORIA / TIPO DE PRODUTO
    const tiposPalavras = ["sofa", "poltrona", "chaise", "estofado", "reclinavel", "canto", "modular"];
    tiposPalavras.forEach((tipo) => {
      if (texto.includes(tipo) && (nomeProd.includes(tipo) || categoriaProd.includes(tipo))) score += 3;
    });

    // ── INDÚSTRIA
    if (industriaProd && texto.includes(industriaProd.split(" ")[0])) score += 4;

    // ── NOME DIRETO
    const palavrasNome = nomeProd.split(" ").filter((w) => w.length > 3);
    palavrasNome.forEach((w) => {
      if (texto.includes(w)) score += 3;
    });

    // ── DESCRIÇÃO
    const palavrasDesc = descricaoProd.split(" ").filter((w) => w.length > 4);
    palavrasDesc.forEach((w) => {
      if (texto.includes(w)) score += 1;
    });

    return score > 0 ? ((p._score = score), true) : false;
  }).sort((a, b) => (b._score || 0) - (a._score || 0));
}

// ============================================================
// 🤖 MOTOR DE RESPOSTAS — tom interno para TODOS os logins
// ============================================================
function gerarResposta(input, produtos, config) {
  const raw = input.toLowerCase();
  const texto = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normalizar = (str) =>
    (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const contem = (...p) => p.some((w) => texto.includes(normalizar(w)));
  const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Só showroom para o chat
  const showroom = produtos.filter((p) => (p.tipo || "showroom") === "showroom");

  // ── Saudações
  if (contem("oi", "olá", "ola", "bom dia", "boa tarde", "boa noite")) {
    return {
      texto: `👋 Olá! SOFIA aqui.\n\nPode perguntar sobre qualquer produto do showroom — medida exata, cor, material, preço ou indústria. Acesso completo ao catálogo.`,
      botaoWhats: false,
      fichas: [],
    };
  }

  // ── Agradecimento
  if (contem("obrigado", "obrigada", "valeu", "grato", "grata")) {
    return { texto: `✅ Disponha! Qualquer consulta é só chamar.`, botaoWhats: false, fichas: [] };
  }

  // ── Horário
  if (contem("horário", "horario", "funciona", "abre", "fecha")) {
    return { texto: `🕐 Horário:\n\n**${config.horario}**`, botaoWhats: false, fichas: [] };
  }

  // ── Endereço
  if (contem("endereço", "endereco", "onde fica", "localizacao", "localização")) {
    return { texto: `📍 **${config.endereco}**`, botaoWhats: false, fichas: [] };
  }

  // ── Resumo do catálogo
  if (contem("quantos", "total", "catalogo", "catálogo", "quantas pecas", "quantas peças")) {
    const total = showroom.length;
    const categorias = [...new Set(showroom.map((p) => p.categoria).filter(Boolean))];
    return {
      texto: `📦 Showroom atual:\n\n• **${total} peças** disponíveis\n${categorias.length > 0 ? `• Categorias: ${categorias.join(", ")}` : ""}`,
      botaoWhats: false,
      fichas: [],
    };
  }

  // ── Mais caro
  if (contem("mais caro", "maior preco", "maior preço", "mais valorizado", "mais alto")) {
    const p = [...showroom].sort((a, b) => Number(b.preco) - Number(a.preco))[0];
    if (p) return {
      texto: `💰 Produto mais caro no showroom:\n\n**${p.nome}**\n${fmt(p.preco)} | ${p.cor || "—"} | ${p.medidas || "—"}`,
      botaoWhats: false,
      fichas: [p],
      labelFicha: `📋 Copiar ficha: ${p.nome}`,
    };
  }

  // ── Mais barato
  if (contem("mais barato", "menor preco", "menor preço", "mais em conta")) {
    const p = [...showroom].sort((a, b) => Number(a.preco) - Number(b.preco))[0];
    if (p) return {
      texto: `💰 Produto mais em conta no showroom:\n\n**${p.nome}**\n${fmt(p.preco)} | ${p.cor || "—"} | ${p.medidas || "—"}`,
      botaoWhats: false,
      fichas: [p],
      labelFicha: `📋 Copiar ficha: ${p.nome}`,
    };
  }

  // ── Busca geral no catálogo
  const encontrados = buscarNoCatalogo(input, produtos);

  if (encontrados.length > 0) {
    const melhor = encontrados[0];
    const lista = encontrados.slice(0, 5).map((p, i) =>
      `${i + 1}. **${p.nome}** — ${fmt(p.preco)} | ${p.cor || "—"} | ${p.medidas || "—"}`
    ).join("\n");

    return {
      texto: `🔍 ${encontrados.length === 1
        ? "Encontrei 1 resultado:"
        : `Encontrei **${encontrados.length}** resultados:`}\n\n${lista}`,
      botaoWhats: false,
      fichas: [melhor],
      labelFicha: `📋 Copiar ficha: ${melhor.nome}`,
    };
  }

  // ── Não encontrado
  return {
    texto: `🤔 Nenhuma peça encontrada com esse critério no showroom.\n\nTente buscar por:\n• Medida exata (ex: "2,50m" ou "3,40m")\n• Cor (ex: "off white", "bege")\n• Material (ex: "couro", "linho")\n• Faixa de preço (ex: "próximo a 15.000")`,
    botaoWhats: false,
    fichas: [],
  };
}
// ============================================================

// ============================================================
// COMPONENTE CHATBOT SOFIA — gradiente dourado premium
// ============================================================
function ChatbotSOFIA({ userEmail, produtos, config }) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [copiados, setCopiados] = useState({});
  const bottomRef = useRef(null);

  const whatsappLink = `https://wa.me/55${config.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(config.mensagemWhats)}`;
  const mapsLink = config.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.endereco)}`;

  const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const gerarFicha = (produto) =>
    `🛋️ *${produto.nome}*\n\n📋 *Descrição:* ${produto.descricao || "—"}\n\n• *Cor:* ${produto.cor || "—"}\n• *Material:* ${produto.material || "—"}\n• *Medidas:* ${produto.medidas || "—"}\n• *Categoria:* ${produto.categoria || "—"}\n• *Indústria:* ${produto.industria || "—"}\n• *Tipo:* ${produto.tipo || "—"}\n\n💰 *Preço:* ${fmt(produto.preco)}\n\n_${config.nome} — inspirados em você._`;

  const copiarFicha = async (produto, idx) => {
    await navigator.clipboard.writeText(gerarFicha(produto));
    setCopiados((c) => ({ ...c, [idx]: true }));
    setTimeout(() => setCopiados((c) => ({ ...c, [idx]: false })), 2500);
  };

  useEffect(() => {
    if (aberto && messages.length === 0) {
      setMessages([{
        tipo: "sofia",
        texto: `👋 Olá! SOFIA aqui.\n\nPode perguntar sobre qualquer produto do showroom — medida exata, cor, material, preço ou indústria.`,
        botaoWhats: false,
        fichas: [],
      }]);
    }
  }, [aberto]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, digitando]);

  const enviar = (textoManual) => {
    const mensagem = textoManual || input.trim();
    if (!mensagem) return;
    setInput("");
    const novas = [...messages, { tipo: "user", texto: mensagem }];
    setMessages(novas);
    setDigitando(true);

    setTimeout(() => {
      const resp = gerarResposta(mensagem, produtos, config);
      setMessages([...novas, { tipo: "sofia", ...resp }]);
      setDigitando(false);
    }, 600);
  };

  const formatarMsg = (texto) =>
    texto
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>");

  // Gradiente dourado premium (escuro, sofisticado)
  const ouro = "from-[#c9a84c] to-[#7d5a14]";
  const ouroBg = "from-[#c9a84c]/20 to-[#7d5a14]/20";
  const ouroBorda = "border-[#c9a84c]/40";

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <button
        onClick={() => setAberto(!aberto)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          aberto
            ? "bg-white/10 border border-white/20"
            : `bg-gradient-to-br ${ouro} hover:scale-110 hover:shadow-amber-900/40`
        }`}
      >
        <span className="text-white text-xl">{aberto ? "✕" : "💬"}</span>
      </button>

      {aberto && (
        <div className={`fixed bottom-24 right-6 z-50 w-[360px] max-h-[600px] flex flex-col rounded-2xl border ${ouroBorda} bg-[#111] shadow-2xl overflow-hidden`}>

          {/* HEADER */}
          <div className={`px-5 py-4 bg-gradient-to-r ${ouroBg} border-b ${ouroBorda} flex items-center gap-3`}>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${ouro} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">SOFIA</p>
              <p className="text-[#c9a84c]/60 text-xs truncate">Assistente interna · {config.nome}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>

          {/* ABAS */}
          <div className={`flex border-b ${ouroBorda} shrink-0`}>
            <button
              onClick={() => setAba("chat")}
              className={`flex-1 py-2.5 text-xs font-medium transition ${
                aba === "chat"
                  ? `text-[#c9a84c] border-b-2 border-[#c9a84c]`
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setAba("info")}
              className={`flex-1 py-2.5 text-xs font-medium transition ${
                aba === "info"
                  ? `text-[#c9a84c] border-b-2 border-[#c9a84c]`
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              📍 Localização & Contato
            </button>
          </div>

          {/* ABA CHAT */}
          {aba === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.tipo === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.tipo === "user"
                          ? `bg-gradient-to-br ${ouro} text-white rounded-br-sm`
                          : "bg-white/5 border border-white/10 text-white/85 rounded-bl-sm"
                      }`}
                      dangerouslySetInnerHTML={{ __html: formatarMsg(msg.texto) }}
                    />

                    {/* BOTÃO COPIAR FICHA */}
                    {msg.tipo === "sofia" && msg.fichas?.length > 0 && (
                      <button
                        onClick={() => copiarFicha(msg.fichas[0], i)}
                        className={`mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          copiados[i]
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : `border-[#c9a84c]/40 text-[#c9a84c]/80 hover:bg-[#c9a84c]/10`
                        }`}
                      >
                        {copiados[i] ? "✅ Ficha copiada!" : (msg.labelFicha || "📋 Copiar ficha")}
                      </button>
                    )}

                    {/* BOTÃO WHATSAPP */}
                    {msg.tipo === "sofia" && msg.botaoWhats && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition"
                      >
                        💬 Falar com consultor no WhatsApp
                      </a>
                    )}
                  </div>
                ))}

                {digitando && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-[#c9a84c]/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#c9a84c]/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-[#c9a84c]/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className={`px-4 py-3 border-t ${ouroBorda} flex gap-2 shrink-0`}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviar()}
                  placeholder="Ex: tem sofá de 2,50m bege?"
                  className={`flex-1 bg-white/5 border ${ouroBorda} rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#c9a84c]/60 transition`}
                />
                <button
                  onClick={() => enviar()}
                  disabled={!input.trim()}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br ${ouro} text-white hover:opacity-90 disabled:opacity-30 transition`}
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
                <p className="text-[#c9a84c]/60 text-xs uppercase tracking-widest mb-1">Empresa</p>
                <p className="text-white font-medium">{config.nome}</p>
              </div>

              <div className={`p-4 rounded-xl bg-white/5 border ${ouroBorda} space-y-3`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📍</span>
                  <div>
                    <p className="text-[#c9a84c]/60 text-xs mb-0.5">Endereço</p>
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

              <div className={`p-4 rounded-xl bg-white/5 border ${ouroBorda} space-y-3`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📱</span>
                  <div>
                    <p className="text-[#c9a84c]/60 text-xs mb-0.5">WhatsApp</p>
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
                <div className={`p-4 rounded-xl bg-white/5 border ${ouroBorda}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">🕐</span>
                    <div>
                      <p className="text-[#c9a84c]/60 text-xs mb-0.5">Horário</p>
                      <p className="text-white text-sm whitespace-pre-line">{config.horario}</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-center text-white/30 text-xs pt-2">
                Pergunte para a SOFIA no chat 💬
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
  const [produtosFiltradosPorEmpresa, setProdutosFiltradosPorEmpresa] = useState([]);

  const [novoProduto, setNovoProduto] = useState({
    nome: "", descricao: "", preco: "", categoria: "",
    cor: "", material: "", medidas: "", tipo: "showroom", industria: "",
  });

  const [filtrosAvancados, setFiltrosAvancados] = useState({
    precoMin: "", precoMax: "", cor: "", material: "",
    medidas: "", industria: "", categoria: "", ordemPreco: "",
  });

  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUser(user);
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole(data?.role || "user");
    };
    initAuth();
  }, []);

  useEffect(() => { if (user) buscarProdutos(); }, [user]);

  const buscarProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*");
    const todos = data || [];

    // Multi-tenant: filtra por empresa conforme o email do usuário
    const emailUsuario = user?.email || "";
    const isMaster = EMAILS_MASTER.includes(emailUsuario);
    const empresaDoUsuario = EMAIL_PARA_EMPRESA[emailUsuario];

    const filtrados = isMaster
      ? todos
      : empresaDoUsuario
        ? todos.filter((p) => p.empresa === empresaDoUsuario)
        : todos; // fallback: mostra tudo se email não mapeado

    setProdutos(filtrados);
    setProdutosFiltradosPorEmpresa(filtrados);
  };

  const formatarPreco = (valor) =>
    Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const copiarFicha = async (produto) => {
    const texto = `🛋️ *${produto.nome}*\n\n📋 *Descrição:* ${produto.descricao}\n\n• *Cor:* ${produto.cor}\n• *Material:* ${produto.material}\n• *Medidas:* ${produto.medidas}\n• *Categoria:* ${produto.categoria}\n• *Indústria:* ${produto.industria}\n• *Tipo:* ${produto.tipo}\n\n💰 *Preço:* ${formatarPreco(produto.preco)}\n\n_Inspire Ambientes — inspirados em você._`;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const adicionarProduto = async () => {
    try {
      let imageUrl = "https://via.placeholder.com/400x300";
      if (imagemFile) {
        const fileName = `${Date.now()}-${imagemFile.name}`;
        const { error: uploadError } = await supabase.storage.from("produtos").upload(fileName, imagemFile);
        if (uploadError) { alert("Erro ao fazer upload da imagem"); return; }
        const { data } = supabase.storage.from("produtos").getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }
      const { error } = await supabase.from("produtos").insert([{
        ...novoProduto,
        preco: Number(novoProduto.preco),
        imagem: imageUrl,
        empresa: "inspire_ambientes", // ✅ campo empresa — altere por cliente
      }]);
      if (error) { alert("Erro ao salvar produto"); return; }
      alert("Produto salvo com sucesso");
      setNovoProduto({ nome: "", descricao: "", preco: "", categoria: "", cor: "", material: "", medidas: "", tipo: "showroom", industria: "" });
      setImagemFile(null);
      setMostrarForm(false);
      buscarProdutos();
    } catch (err) { alert("Erro inesperado"); console.error(err); }
  };

  const deletarProduto = async (produto) => {
    await supabase.from("produtos").delete().eq("id", produto.id);
    buscarProdutos();
  };

  const salvarEdicao = async () => {
    await supabase.from("produtos").update(editandoProduto).eq("id", editandoProduto.id);
    setEditandoProduto(null);
    buscarProdutos();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const produtosExibidos = produtosFiltradosPorEmpresa
    .filter((p) => {
      if ((p.tipo || "showroom") !== aba) return false;
      const texto = `${p.nome || ""} ${p.descricao || ""} ${p.categoria || ""}`.toLowerCase();
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
            Showroom <span className="font-medium text-white">INSPIRE AMBIENTES</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Modo de acesso:{" "}
            <span className={role === "admin" ? "text-emerald-400" : "text-white/40"}>
              {role === "admin" ? "Administrador" : "Visitante"}
            </span>
          </p>
        </div>
        {user && (
          <button onClick={handleLogout} className="text-sm px-4 py-2 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 transition">
            Sair
          </button>
        )}
      </div>

      {/* ABAS */}
      <div className="flex gap-2 mb-8">
        {["showroom", "encomenda"].map((tipo) => (
          <button key={tipo} onClick={() => setAba(tipo)}
            className={`px-4 py-2 rounded-full text-sm transition border ${
              aba === tipo ? "bg-white text-black border-white" : "border-white/10 text-white/60 hover:text-white"
            }`}>
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      {/* BUSCA */}
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produtos..."
        className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10" />

      {/* FILTROS */}
      <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
        className="mb-4 px-4 py-2 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 text-sm">
        Filtros avançados
      </button>

      {mostrarFiltros && (
        <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="grid md:grid-cols-2 gap-4">
            {[["precoMin","Preço mínimo"],["precoMax","Preço máximo"],["cor","Cor"],["material","Material"],["categoria","Categoria"]].map(([key, label]) => (
              <input key={key} placeholder={label} value={filtrosAvancados[key]}
                onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, [key]: e.target.value })}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg" />
            ))}
            <select value={filtrosAvancados.ordemPreco}
              onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, ordemPreco: e.target.value })}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded-lg">
              <option value="">Ordenar preço</option>
              <option value="asc">Menor → Maior</option>
              <option value="desc">Maior → Menor</option>
            </select>
          </div>
        </div>
      )}

      {/* ADD */}
      {role === "admin" && (
        <button onClick={() => setMostrarForm(!mostrarForm)} className="mb-8 px-5 py-2 bg-white text-black rounded-full">
          + Adicionar produto
        </button>
      )}

      {/* FORM */}
      {mostrarForm && role === "admin" && (
        <div className="mb-10 p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="grid md:grid-cols-2 gap-3">
            {Object.keys(novoProduto).map((key) =>
              key !== "tipo" && (
                <input key={key} placeholder={key} value={novoProduto[key]}
                  onChange={(e) => setNovoProduto({ ...novoProduto, [key]: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
              )
            )}
          </div>
          <div className="mt-4">
            <input type="file" accept="image/*" onChange={(e) => setImagemFile(e.target.files?.[0])} className="text-sm text-white/60" />
          </div>
          <button onClick={adicionarProduto} className="mt-4 px-5 py-2 bg-white text-black rounded-full">Salvar produto</button>
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-3 gap-6">
        {produtosExibidos.map((p) => (
          <div key={p.id} onClick={() => setProdutoSelecionado(p)}
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:scale-[1.03] transition duration-300 cursor-pointer">
            <div className="aspect-[4/3] overflow-hidden bg-black">
              <img src={p.imagem} className="w-full h-full object-cover hover:scale-110 transition duration-500" />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-light">{p.nome}</h2>
              <p className="text-white/50 text-sm">{formatarPreco(p.preco)}</p>
              {role === "admin" && (
                <div className="flex justify-between mt-3">
                  <button onClick={(e) => { e.stopPropagation(); setEditandoProduto(p); }} className="text-blue-400 text-xs">editar</button>
                  <button onClick={(e) => { e.stopPropagation(); deletarProduto(p); }} className="text-red-400 text-xs">excluir</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PRODUTO */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-40"
          onClick={() => { setProdutoSelecionado(null); setCopiado(false); }}>
          <div className="bg-[#111] max-w-4xl w-full rounded-2xl overflow-hidden border border-white/10 relative"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setProdutoSelecionado(null); setCopiado(false); }}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white transition">✕</button>
            <div className="aspect-[16/9] overflow-hidden">
              <img src={produtoSelecionado.imagem} className="w-full h-full object-cover" />
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-light">{produtoSelecionado.nome}</h2>
                <p className="text-white/60 mt-2">{produtoSelecionado.descricao}</p>
                <p className="mt-4 text-xl">{formatarPreco(produtoSelecionado.preco)}</p>
                <button onClick={() => copiarFicha(produtoSelecionado)}
                  className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                    copiado ? "bg-green-600 border-green-600 text-white" : "border-white/20 text-white/70 hover:bg-white/10"}`}>
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
            <button onClick={() => setEditandoProduto(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white/60 hover:text-white transition">✕</button>
            <h2 className="mb-4 text-lg font-light">Editar produto</h2>
            {Object.keys(editandoProduto).map((key) =>
              key !== "id" && (
                <input key={key} value={editandoProduto[key] || ""}
                  onChange={(e) => setEditandoProduto({ ...editandoProduto, [key]: e.target.value })}
                  className="w-full mb-2 p-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm"
                  placeholder={key} />
              )
            )}
            <div className="flex justify-between mt-4">
              <button onClick={() => setEditandoProduto(null)} className="px-4 py-2 rounded-full border border-white/10 text-white/50 hover:text-white text-sm transition">Cancelar</button>
              <button onClick={salvarEdicao} className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition">Salvar alterações</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SOFIA — dourado premium, multi-tenant, tom interno para todos */}
      {role !== null && user && (
        <ChatbotSOFIA
          userEmail={user.email}
          produtos={produtosFiltradosPorEmpresa}
          config={configEmpresa}
        />
      )}
    </div>
  );
}