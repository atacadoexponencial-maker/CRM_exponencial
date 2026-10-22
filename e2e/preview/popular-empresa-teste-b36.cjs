/* eslint-disable @typescript-eslint/no-require-imports */
// B36-14: dá conteúdo a todas as telas da empresa de teste, para a aprovação visual do
// tema claro no preview — conversas (com e sem resposta), tarefas da Agenda, cards no
// funil de Recompra, mensagens rápidas, uma sequência, uma campanha em rascunho e uma
// automação pausada. Pode rodar de novo: apaga o que ele mesmo criou antes.
// Só mexe na empresa cujo nome começa com "[TESTE]". Não envia nada pelo WhatsApp.
// Uso: node e2e/preview/popular-empresa-teste-b36.cjs

const { lerEnv, bancoDeServico, conferirEmpresaDeTeste } = require("./comum.cjs")

const MARCA = "[B36]"
const minutosAtras = (m) => new Date(Date.now() - m * 60000).toISOString()
const horasDaqui = (h) => new Date(Date.now() + h * 3600000).toISOString()

const CONVERSAS = [
  { status: "em_atendimento", naoLidas: 2, mensagens: [["recebida", 95, "Bom dia! Chegou a coleção de verão?"], ["enviada", 90, "Bom dia! Chegou sim, te mando o link da loja agora."], ["recebida", 42, "Vocês têm a calça wide leg no 44?"], ["recebida", 41, "Pode fechar a grade do 38 ao 46 junto?"]] },
  { status: "em_espera", naoLidas: 1, mensagens: [["recebida", 18, "Pode mandar o catálogo atualizado?"]] },
  { status: "em_atendimento", naoLidas: 0, mensagens: [["recebida", 70, "Fechou, pode separar as 3 grades"], ["enviada", 65, "Perfeito! Separando e já te mando o Pix."]] },
  { status: "em_espera", naoLidas: 1, mensagens: [["recebida", 6, "Qual o pedido mínimo pra Goiânia?"]] },
  { status: "em_atendimento", naoLidas: 0, mensagens: [["enviada", 60 * 20, "Segue a chave Pix: atacado@exemplo.com"], ["recebida", 60 * 19, "Pago! Obrigada"], ["enviada", 60 * 19 - 5, "Recebido, o pedido sai amanhã."]] },
  { status: "resolvida", naoLidas: 0, mensagens: [["recebida", 60 * 30, "Chegou tudo certinho!"], ["enviada", 60 * 29, "Que ótimo, obrigada pela compra!"]] },
  { status: "em_atendimento", naoLidas: 0, mensagens: [["enviada", 60 * 26, "Amanhã te mando a grade nova."], ["recebida", 60 * 3, "Ainda está de pé a promoção?"]] },
  { status: "em_espera", naoLidas: 3, mensagens: [["recebida", 33, "Oi, vi o anúncio"], ["recebida", 32, "Vocês vendem para revenda?"], ["recebida", 31, "Sou de Fortaleza"]] },
]

;(async () => {
  const env = lerEnv()
  const ws = env.B11_TESTE_WORKSPACE_ID
  const db = bancoDeServico(env)
  await conferirEmpresaDeTeste(db, ws)
  const feito = async (consulta) => {
    const { data, error } = await consulta
    if (error) throw new Error(error.message)
    return data
  }

  // O admin do login de teste (B11_TESTE_EMAIL): é com ele que a Marcelle entra no preview.
  const { data: usuarios, error: erroUsuarios } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (erroUsuarios) throw new Error(erroUsuarios.message)
  const admin = usuarios.users.find((u) => u.email === env.B11_TESTE_EMAIL)?.id
  if (!admin) throw new Error("o login de teste (B11_TESTE_EMAIL) não foi encontrado")
  const contatos = await feito(db.from("contacts").select("id, name").eq("workspace_id", ws).is("excluido_em", null).order("name"))
  if (contatos.length < CONVERSAS.length) throw new Error("a empresa de teste tem poucos contatos")

  // Limpa o que esta rodada recria.
  const conversasAntigas = (await feito(db.from("conversations").select("id").eq("workspace_id", ws))).map((c) => c.id)
  if (conversasAntigas.length > 0) {
    await feito(db.from("conversation_labels").delete().in("conversation_id", conversasAntigas))
    await feito(db.from("messages").delete().in("conversation_id", conversasAntigas))
    await feito(db.from("conversations").delete().in("id", conversasAntigas))
  }
  await feito(db.from("reminders").delete().eq("workspace_id", ws).like("instrucao", `${MARCA}%`))
  await feito(db.from("quick_replies").delete().eq("workspace_id", ws).like("title", `${MARCA}%`))
  await feito(db.from("automation_flows").delete().eq("workspace_id", ws).like("nome", `${MARCA}%`))
  await feito(db.from("campaigns").delete().eq("workspace_id", ws).like("nome", `${MARCA}%`))
  const seqAntigas = (await feito(db.from("sequences").select("id").eq("workspace_id", ws).like("nome", `${MARCA}%`))).map((s) => s.id)
  if (seqAntigas.length > 0) {
    await feito(db.from("sequence_steps").delete().in("sequence_id", seqAntigas))
    await feito(db.from("sequences").delete().in("id", seqAntigas))
  }

  // Conversas: as primeiras ficam com a última mensagem do cliente (bloco "Esperando resposta").
  const etiqueta = (await feito(db.from("labels").select("id").eq("workspace_id", ws).eq("name", "Interessado")))[0]?.id
  for (const [i, c] of CONVERSAS.entries()) {
    const contato = contatos[i]
    const ultima = c.mensagens[c.mensagens.length - 1]
    const conversa = (await feito(
      db.from("conversations").insert({
        workspace_id: ws, contact_id: contato.id, status: c.status, assigned_to: admin,
        unread_count: c.naoLidas, last_message_at: minutosAtras(ultima[1]), last_message_text: ultima[2],
      }).select("id").single()
    )).id
    await feito(db.from("messages").insert(c.mensagens.map(([direcao, minutos, texto]) => ({
      workspace_id: ws, conversation_id: conversa, direction: direcao, type: "texto", content: texto,
      created_at: minutosAtras(minutos), status: direcao === "enviada" ? "lido" : null,
    }))))
    if (etiqueta && i % 3 === 0) await feito(db.from("conversation_labels").insert({ conversation_id: conversa, label_id: etiqueta }))
  }

  // Agenda do admin: 2 atrasadas, 2 para hoje e 1 para amanhã.
  const tarefas = [
    ["Ligar para confirmar o 2º pedido", minutosAtras(60 * 20)],
    ["Enviar a grade de verão", minutosAtras(90)],
    ["Follow-up do orçamento", horasDaqui(1)],
    ["Mandar fotos da coleção nova", horasDaqui(2)],
    ["Perguntar se a mercadoria chegou", horasDaqui(30)],
  ]
  await feito(db.from("reminders").insert(tarefas.map(([texto, quando], i) => ({
    workspace_id: ws, contact_id: contatos[i].id, atendente_id: admin, instrucao: `${MARCA} ${texto}`,
    due_at: quando, status: "pendente", origem: "avulso",
  }))))

  // Funil de Recompra: clientes que já compraram, um em cada etapa (o reset tira estes cards).
  const comCompra = [...new Set((await feito(db.from("contact_purchases").select("contact_id").eq("workspace_id", ws))).map((c) => c.contact_id))]
  const etapas = ["onboarding", "reposicao", "ativos", "ativos", "ativos_ri", "inativos", "inativos_rp", "perdidos"]
  for (const [i, etapa] of etapas.entries()) {
    const contato = comCompra[i]
    if (!contato) break
    const { data: existe } = await db.from("pipeline_cards").select("id").eq("contact_id", contato).eq("funil", "recompra").maybeSingle()
    if (existe) continue
    await feito(db.from("pipeline_cards").insert({
      workspace_id: ws, contact_id: contato, funil: "recompra", etapa, atendente_id: i % 2 ? admin : null,
      etapa_changed_at: minutosAtras(60 * 24 * (i * 6 + 2)),
    }))
  }

  await feito(db.from("quick_replies").insert([
    { workspace_id: ws, title: `${MARCA} saudacao`, content: "Olá! Tudo bem? Sou do atendimento, como posso ajudar?" },
    { workspace_id: ws, title: `${MARCA} pix`, content: "Segue a chave Pix para pagamento: atacado@exemplo.com" },
    { workspace_id: ws, title: `${MARCA} minimo`, content: "O pedido mínimo é de 12 peças, podendo misturar modelos." },
  ]))

  const sequencia = (await feito(db.from("sequences").insert({ workspace_id: ws, nome: `${MARCA} Pós-compra`, gatilho: "card_lead", ativa: false, predefinida: false }).select("id").single())).id
  await feito(db.from("sequence_steps").insert([
    { sequence_id: sequencia, ordem: 1, tipo: "mensagem", prazo_dias: 0, conteudo: "Obrigada pela compra! Qualquer dúvida, é só chamar." },
    { sequence_id: sequencia, ordem: 2, tipo: "lembrete", prazo_dias: 7, instrucao: "Perguntar se a mercadoria chegou bem" },
  ]))

  await feito(db.from("campaigns").insert({
    workspace_id: ws, nome: `${MARCA} Coleção de verão`, status: "rascunho", tipo_mensagem: "texto",
    conteudo: "Chegou a coleção de verão! Quer receber o catálogo?", segmento: {}, criado_por: admin,
  }))

  await feito(db.from("automation_flows").insert({
    workspace_id: ws, nome: `${MARCA} Tag para interessados`, ativa: false,
    repeticao: { modo: "uma_vez_por_contato" },
    fluxo: {
      blocos: [
        { id: "g", tipo: "gatilho", gatilho: "etiqueta_aplicada", parametros: { label_id: etiqueta ?? "" }, posicao: { x: 0, y: 0 } },
        { id: "a", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "interessado" }, posicao: { x: 0, y: 160 } },
      ],
      ligacoes: [{ de: "g", saida: "proximo", para: "a" }],
    },
  }))

  console.log(`empresa de teste preenchida: ${CONVERSAS.length} conversas, ${tarefas.length} tarefas, cards de Recompra, mensagens rápidas, sequência, campanha e automação`)
})().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
