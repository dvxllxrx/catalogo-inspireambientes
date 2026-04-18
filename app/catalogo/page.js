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
  // mapsUrl: "cole aqui link direto do Google Maps se preferir",
};
// ============================================================

// ============================================================
// 🔍 BUSCA INTELIGENTE NO CATÁLOGO
// ============================================================
function buscarNoCatalogo(input, produtos) {
  const texto = input.toLowerCase();

  // Extrai número de medida da pergunta (ex: 2,50 / 2.50 / 250cm)
  const regexMedida = /(\d+[.,]\d+)\s*(?:cm|m|metro)?|(\d{2,3})\s*cm/gi;
  const medidasEncontradas = [];
  let match;
  while ((match = regexMedida.exec(texto)) !== null) {
    const valor = parseFloat((match[1] || match[2]).replace(",", "."));
    medidasEncontradas.push(valor);
  }

  // Extrai faixa de preço
  const regexPreco = /r?\$?\s*(\d[\d.,]*)/gi;
  const precosEncontrados = [];
  while ((match = regexPreco.exec(texto)) !== null) {
    const valor = parseFloat(match[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(valor) && valor > 100) precosEncontrados.push(valor);
  }

  const contem = (...palavras) => palavras.some((p) => texto.includes(p));

  return produtos.filter((p) => {
    let score = 0;

    // Busca por medida
    if (medidasEncontradas.length > 0 && p.medidas) {
      const medidaProd = parseFloat(p.medidas.replace(",", "."));
      const tolerancia = 0.3;
      if (medidasEncontradas.some((m) => Math.abs(m - medidaProd) <= tolerancia)) score += 5;
    }

    // Busca por preço
    if (precosEncontrados.length > 0) {
      const preco = Number(p.preco);
      if (contem("abaixo", "até", "ate", "menor", "menos")) {
        if (precosEncontrados.some((v) => preco <= v)) score += 4;
      } else if (contem("acima", "mais de", "maior")) {
        if (precosEncontrados.some((v) => preco >= v)) score += 4;
      } else {
        if (precosEncontrados.some((v) => Math.abs(preco - v) < v * 0.2)) score += 3;
      }
    }

    // Busca por cor
    const cores = ["bege", "cinza", "preto", "branco", "off white", "creme", "marrom", "azul", "verde", "caramelo", "fendi"];
    cores.forEach((cor) => {
      if (texto.includes(cor) && p.cor?.toLowerCase().includes(cor)) score += 3;
    });

    // Busca por material
    const materiais = ["couro", "linho", "veludo", "suede", "algodão", "algodao", "courissimo", "ecológico", "ecologico"];
    materiais.forEach((mat) => {
      if (texto.includes(mat) && p.material?.toLowerCase().includes(mat)) score += 3;
    });

    // Busca por tipo de produto
    const tipos = ["sofá", "sofa", "poltrona", "chaise", "estofado", "reclinável", "reclinavel", "canto", "modular"];
    tipos.forEach((tipo) => {
      if (texto.includes(tipo) && (p.nome?.toLowerCase().includes(tipo) || p.categoria?.toLowerCase().includes(tipo))) score += 2;
    });

    // Busca por indústria
    const industrias = ["buriti", "dorigon", "moln", "dalla", "imperial"];
    industrias.forEach((ind) => {
      if (texto.includes(ind) && p.industria?.toLowerCase().includes(ind)) score += 3;
    });

    // Busca por nome direto
    if (p.nome && texto.includes(p.nome.toLowerCase().split(" ")[1]?.toLowerCase() || "")) score += 4;

    // Busca por tipo showroom/encomenda
    if (contem("showroom", "disponível", "disponivel", "em estoque", "tem aqui") && p.tipo === "showroom") score += 2;
    if (contem("encomenda", "encomendar", "prazo") && p.tipo === "encomenda") score += 2;

    return score > 0 ? (p._score = score) && true : false;
  }).sort((a, b) => (b._score || 0) - (a._score || 0));
}

// ============================================================
// 🤖 MOTOR DE RESPOSTAS — ADMIN (interno, direto)
// ============================================================
function respostaAdmin(input, produtos, config) {
  const texto = input.toLowerCase();
  const contem = (...p) => p.some((w) => texto.includes(w));
  const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (contem("oi", "olá", "ola", "bom dia", "boa tarde", "boa noite")) {
    return { texto: `👋 Olá! SOFIA aqui. Pode perguntar sobre qualquer produto do catálogo — medida, cor, material, preço. Estou com acesso completo ao estoque.`, botaoWhats: false, fichas: [] };
  }

  if (contem("obrigado", "obrigada", "valeu")) {
    return { texto: `✅ Disponha! Qualquer consulta é só chamar.`, botaoWhats: false, fichas: [] };
  }

  if (contem("horário", "horario", "funciona", "abre", "fecha")) {
    return { texto: `🕐 Horário: **${config.horario}**`, botaoWhats: false, fichas: [] };
  }

  if (contem("endereço", "endereco", "onde fica")) {
    return { texto: `📍 **${config.endereco}**`, botaoWhats: false, fichas: [] };
  }

  if (contem("quantos", "total", "quantas peças", "quantas pecas", "catalogo", "catálogo")) {
    const total = produtos.length;
    const showroom = produtos.filter((p) => p.tipo === "showroom").length;
    const encomenda = produtos.filter((p) => p.tipo === "encomenda").length;
    return {
      texto: `📦 Catálogo atual:\n\n• **${total} peças** no total\n• **${showroom}** em showroom\n• **${encomenda}** sob encomenda`,
      botaoWhats: false,
      fichas: [],
    };
  }

  if (contem("mais caro", "maior preço", "maior preco", "mais valorizado")) {
    const p = [...produtos].sort((a, b) => Number(b.preco) - Number(a.preco))[0];
    if (p) return { texto: `💰 Produto mais caro:\n\n**${p.nome}**\n${fmt(p.preco)} | ${p.cor || "—"} | ${p.medidas || "—"}`, botaoWhats: false, fichas: [p] };
  }

  if (contem("mais barato", "menor preço", "menor preco")) {
    const p = [...produtos].sort((a, b) => Number(a.preco) - Number(b.preco))[0];
    if (p) return { texto: `💰 Produto mais em conta:\n\n**${p.nome}**\n${fmt(p.preco)} | ${p.cor || "—"} | ${p.medidas || "—"}`, botaoWhats: false, fichas: [p] };
  }

  // Busca por produto específico no catálogo
  const encontrados = buscarNoCatalogo(input, produtos);

  if (encontrados.length > 0) {
    const melhor = encontrados[0];
    const lista = encontrados.slice(0, 5).map((p, i) =>
      `${i + 1}. **${p.nome}** — ${fmt(p.preco)} | ${p.cor || "—"} | ${p.medidas || "—"} | ${p.tipo}`
    ).join("\n");

    return {
      texto: `🔍 Encontrei **${encontrados.length}** resultado${encontrados.length > 1 ? "s" : ""}:\n\n${lista}`,
      botaoWhats: false,
      fichas: [melhor],
      labelFicha: `📋 Copiar ficha: ${melhor.nome}`,
    };
  }

  return {
    texto: `🤔 Não encontrei nenhuma peça com esse critério no catálogo.\n\nTente por: medida (ex: "2,50m"), cor, material, preço ou tipo de produto.`,
    botaoWhats: false,
    fichas: [],
  };
}

// ============================================================
// 🌟 MOTOR DE RESPOSTAS — PÚBLICO (elegante, vendedor premium)
// ============================================================
function respostaPublico(input, produtos, config) {
  const texto = input.toLowerCase();
  const contem = (...p) => p.some((w) => texto.includes(w));
  const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (contem("oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "hello")) {
    return {
      texto: `Olá! Que bom ter você por aqui ✨\n\nSou a SOFIA, assistente virtual da **${config.nome}**. Estou aqui para te ajudar a descobrir a peça perfeita para o seu ambiente — seja pelo estilo, pelo conforto ou pelo material ideal.\n\nComo posso te inspirar hoje?`,
      botaoWhats: false,
      fichas: [],
    };
  }

  if (contem("obrigado", "obrigada", "valeu", "grato", "grata")) {
    return {
      texto: `É sempre um prazer! 😊 Se quiser continuar explorando nosso catálogo ou conversar com um de nossos consultores, estamos à disposição.\n\nAté breve! ✨`,
      botaoWhats: true,
      fichas: [],
    };
  }

  if (contem("endereço", "onde fica", "localização", "localizacao", "como chegar", "visitar", "showroom")) {
    return {
      texto: `Adoraríamos te receber pessoalmente! 🏬\n\nEstamos localizados em:\n📍 **${config.endereco}**\n🕐 **${config.horario}**\n\nNo nosso showroom você pode ver e sentir cada peça de perto — porque um bom estofado se escolhe com os olhos e com o toque. Venha nos visitar!`,
      botaoWhats: true,
      fichas: [],
    };
  }

  if (contem("horário", "horario", "funciona", "abre", "fecha")) {
    return {
      texto: `Estamos esperando por você! 🕐\n\n**${config.horario}**\n\nQualquer dúvida, pode nos chamar no WhatsApp também — respondemos rapidinho. 😊`,
      botaoWhats: true,
      fichas: [],
    };
  }

  if (contem("preço", "preco", "valor", "quanto custa", "investimento", "caro", "barato")) {
    const precos = produtos.map((p) => Number(p.preco)).filter(Boolean);
    if (precos.length > 0) {
      const min = fmt(Math.min(...precos));
      const max = fmt(Math.max(...precos));
      return {
        texto: `Nosso catálogo foi pensado para diferentes momentos e estilos de vida 💛\n\nTemos peças a partir de **${min}**, chegando a criações exclusivas de **${max}** — cada uma com materiais e acabamentos cuidadosamente selecionados.\n\nGostaria que um consultor te apresentasse as opções dentro do seu orçamento?`,
        botaoWhats: true,
        fichas: [],
      };
    }
  }

  if (contem("encomenda", "encomendar", "personalizado", "personalizada", "sob medida", "prazo")) {
    return {
      texto: `Sim, trabalhamos com **encomendas sob medida** ✨\n\nVocê escolhe o tecido, a cor, as medidas — e nós cuidamos de cada detalhe para que a peça seja perfeita para o seu espaço.\n\nOs prazos variam conforme a peça e a indústria. Nossos consultores podem te dar todas as informações com precisão. Que tal conversar?`,
      botaoWhats: true,
      fichas: [],
    };
  }

  if (contem("material", "tecido", "couro", "linho", "veludo", "suede", "fibra")) {
    const materiais = [...new Set(produtos.map((p) => p.material).filter(Boolean))].slice(0, 5);
    return {
      texto: `Trabalhamos com materiais de alto padrão como **${materiais.join(", ")}** e muito mais 🪡\n\nCada tecido foi escolhido pelo conforto, pela durabilidade e pela beleza que traz ao ambiente. Posso te indicar a opção ideal para o seu estilo de vida — é só me dizer um pouco mais sobre o que você procura!`,
      botaoWhats: true,
      fichas: [],
    };
  }

  if (contem("cor", "cores", "bege", "cinza", "preto", "branco", "off white", "creme", "marrom")) {
    const cores = [...new Set(produtos.map((p) => p.cor).filter(Boolean))].slice(0, 5);
    return {
      texto: `Temos uma paleta rica de opções 🎨\n\nEntre as disponíveis: **${cores.join(", ")}** — além de outras cores para encomenda, conforme o tecido escolhido.\n\nCores neutras como off white e bege são as queridinhas para ambientes sofisticados. Quer uma indicação personalizada?`,
      botaoWhats: true,
      fichas: [],
    };
  }

  if (contem("sofá", "sofa", "poltrona", "chaise", "estofado", "tem", "vocês têm", "voces tem", "produto")) {
    const total = produtos.length;
    const categorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].slice(0, 4);
    return {
      texto: `Nosso showroom reúne **${total} peças exclusivas** 🛋️\n\n${categorias.length > 0 ? `Entre elas: ${categorias.join(", ")} e muito mais.` : ""}\n\nCada peça foi escolhida para transformar ambientes comuns em espaços que inspiram. Quer conhecer melhor algum estilo ou material específico?`,
      botaoWhats: true,
      fichas: [],
    };
  }

  if (contem("contato", "whatsapp", "falar", "atendimento", "consultor", "vendedor")) {
    return {
      texto: `Nossos consultores estão prontos para te atender com toda a atenção que você merece 😊\n\nClique abaixo e inicie uma conversa — vai ser um prazer apresentar nossas peças para você!`,
      botaoWhats: true,
      fichas: [],
    };
  }

  // Busca por produto no catálogo para o público
  const encontrados = buscarNoCatalogo(input, produtos);
  if (encontrados.length > 0) {
    const p = encontrados[0];
    const preco = fmt(p.preco);
    return {
      texto: `Encontrei algo que pode te encantar ✨\n\n🛋️ **${p.nome}**\n${p.descricao ? `\n_${p.descricao}_\n` : ""}\n• Material: ${p.material || "—"}\n• Cor: ${p.cor || "—"}\n• Medidas: ${p.medidas || "—"}\n• Investimento: **${preco}**\n\nQuer saber mais sobre essa peça ou conhecer outras opções similares?`,
      botaoWhats: true,
      fichas: [],
    };
  }

  // Fallback elegante
  return {
    texto: `Que ótima pergunta! 😊 Deixa eu conectar você com um de nossos consultores — eles vão poder te dar uma resposta completa e personalizada.\n\nPosso também te ajudar com:\n• Nossos produtos e estilos disponíveis\n• Materiais e acabamentos\n• Encomendas sob medida\n• Localização e horários`,
    botaoWhats: true,
    fichas: [],
  };
}
// ============================================================

// ============================================================
// COMPONENTE CHATBOT SOFIA
// ============================================================
function ChatbotSOFIA({ role, produtos, config }) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [copiados, setCopiados] = useState({});
  const bottomRef = useRef(null);

  const whatsappLink = `https://wa.me/55${config.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(config.mensagemWhats)}`;
  const mapsLink = config.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.endereco)}`;

  const perguntasAdmin = ["Tem sofá de 2,50m?", "Produto mais caro?", "Quantos em showroom?", "Sofás de couro?"];
  const perguntasPublico = ["Que produtos vocês têm?", "Como funciona encomenda?", "Qual o horário?", "Têm sofás de linho?"];
  const perguntas = role === "admin" ? perguntasAdmin : perguntasPublico;

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
      const bv = role === "admin"
        ? `👋 Olá! SOFIA aqui. Pode perguntar sobre qualquer produto — medida, cor, material, preço. Acesso completo ao catálogo.`
        : `Olá! Que bom ter você por aqui ✨\n\nSou a **SOFIA**, assistente virtual da ${config.nome}. Estou aqui para te ajudar a encontrar a peça perfeita para o seu ambiente.\n\nComo posso te inspirar hoje?`;
      setMessages([{ tipo: "sofia", texto: bv, botaoWhats: false, fichas: [] }]);
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
      const resp = role === "admin"
        ? respostaAdmin(mensagem, produtos, config)
        : respostaPublico(mensagem, produtos, config);
      setMessages([...novas, { tipo: "sofia", ...resp }]);
      setDigitando(false);
    }, 600);
  };

  const formatarMsg = (texto) =>
    texto.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
         .replace(/\*(.*?)\*/g, "<em>$1</em>")
         .replace(/\n/g, "<br/>");

  return (
    <>
      <button
        onClick={() => setAberto(!aberto)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          aberto ? "bg-white/10 border border-white/20" : "bg-gradient-to-br from-cyan-500 to-purple-600 hover:scale-110"
        }`}
      >
        <span className="text-white text-xl">{aberto ? "✕" : "💬"}</span>
      </button>

      {aberto && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[600px] flex flex-col rounded-2xl border border-white/10 bg-[#111] shadow-2xl overflow-hidden">

          {/* HEADER */}
          <div className="px-5 py-4 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">S</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">SOFIA</p>
              <p className="text-white/40 text-xs truncate">{role === "admin" ? "Assistente interna · Catálogo completo" : config.nome}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          </div>

          {/* ABAS */}
          <div className="flex border-b border-white/10 shrink-0">
            <button onClick={() => setAba("chat")}
              className={`flex-1 py-2.5 text-xs font-medium transition ${aba === "chat" ? "text-white border-b-2 border-cyan-500" : "text-white/40 hover:text-white/70"}`}>
              💬 Chat
            </button>
            <button onClick={() => setAba("info")}
              className={`flex-1 py-2.5 text-xs font-medium transition ${aba === "info" ? "text-white border-b-2 border-cyan-500" : "text-white/40 hover:text-white/70"}`}>
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
                          ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white rounded-br-sm"
                          : "bg-white/5 border border-white/10 text-white/85 rounded-bl-sm"
                      }`}
                      dangerouslySetInnerHTML={{ __html: formatarMsg(msg.texto) }}
                    />

                    {/* BOTÃO COPIAR FICHA — admin */}
                    {msg.tipo === "sofia" && msg.fichas?.length > 0 && (
                      <button
                        onClick={() => copiarFicha(msg.fichas[0], i)}
                        className={`mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          copiados[i]
                            ? "bg-green-600 border-green-600 text-white"
                            : "border-white/20 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {copiados[i] ? "✅ Ficha copiada!" : (msg.labelFicha || "📋 Copiar ficha")}
                      </button>
                    )}

                    {/* BOTÃO WHATSAPP — público */}
                    {msg.tipo === "sofia" && msg.botaoWhats && (
                      <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition">
                        💬 Falar com consultor no WhatsApp
                      </a>
                    )}
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
                  {perguntas.map((p, i) => (
                    <button key={i} onClick={() => enviar(p)}
                      className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/5 transition text-left">
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
                  placeholder={role === "admin" ? "Ex: tem sofá de 2,50m bege?" : "Como posso te ajudar?"}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition"
                />
                <button onClick={() => enviar()} disabled={!input.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white hover:opacity-90 disabled:opacity-30 transition">
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
                <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-600/30 transition">
                  🗺️ Abrir no Google Maps
                </a>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📱</span>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">WhatsApp</p>
                    <p className="text-white text-sm">{config.whatsapp.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, "+$1 ($2) $3-$4")}</p>
                  </div>
                </div>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition">
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

              <p className="text-center text-white/30 text-xs pt-2">Ficou com dúvida? Pergunte para a SOFIA no chat 💬</p>
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

  useEffect(() => { buscarProdutos(); }, []);

  const buscarProdutos = async () => {
    const { data } = await supabase.from("produtos").select("*");
    setProdutos(data || []);
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
      const { error } = await supabase.from("produtos").insert([{ ...novoProduto, preco: Number(novoProduto.preco), imagem: imageUrl }]);
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

  const produtosFiltrados = produtos
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
          <button onClick={handleLogout} className="text-sm px-4 py-2 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 transition">Sair</button>
        )}
      </div>

      <div className="flex gap-2 mb-8">
        {["showroom", "encomenda"].map((tipo) => (
          <button key={tipo} onClick={() => setAba(tipo)}
            className={`px-4 py-2 rounded-full text-sm transition border ${aba === tipo ? "bg-white text-black border-white" : "border-white/10 text-white/60 hover:text-white"}`}>
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>

      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produtos..."
        className="w-full mb-4 px-4 py-3 rounded-xl bg-white/5 border border-white/10" />

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

      {role === "admin" && (
        <button onClick={() => setMostrarForm(!mostrarForm)} className="mb-8 px-5 py-2 bg-white text-black rounded-full">
          + Adicionar produto
        </button>
      )}

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

      <div className="grid md:grid-cols-3 gap-6">
        {produtosFiltrados.map((p) => (
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

      {role !== null && <ChatbotSOFIA role={role} produtos={produtos} config={configEmpresa} />}
    </div>
  );
}