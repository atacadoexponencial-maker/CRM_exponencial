// Pedido feito pela vitrine (B16-09). Só no servidor: a cliente não tem login, então tudo
// é conferido aqui, com dados do banco — preços, estoque e mínimo do navegador nunca valem.

import { createServiceClient } from "@/integrations/supabase/service"
import { buscarEGuardarFotoDoContato } from "@/lib/whatsapp/foto-de-perfil"
import { chaveCombinacao, combinacoes, type TipoVariacao } from "./combinacoes"
import { carregarLojaPublica } from "./loja-publica"
import { chaveDoTelefoneNaLoja, liberarTentativa, reservarTentativa } from "@/lib/limite-de-tentativas"
import { aplicarDesconto, blocoDaCombinacao, descontoAlcancado, detalheDaGrade, faixaAlcancada, faixasDoBanco, gradeDoBanco, opcaoDaCombinacao, pacotesDoBloco, unitarioDaGrade, type FaixaPreco } from "./regras-de-venda"
import { faltaParaMinimo, linkWhatsapp, montarMensagemPedido, normalizarWhatsapp, totaisDoPedido, type GradeNoPedido, type ItemPedido } from "@/app/loja/components/pedido"

/** Mesmo WhatsApp, mesma loja: um pedido a cada 2 minutos. */
export const INTERVALO_ENTRE_PEDIDOS_MS = 2 * 60 * 1000

export interface ItemSolicitado {
  produtoId: string
  combinacao: string
  quantidade: number
  /** Preço que a cliente viu no carrinho. Se mudou, o pedido não sai: ela confere o novo antes (QA A9). */
  preco?: number
}

export interface PrecoNovo {
  produtoId: string
  /** Preço base de hoje. */
  preco: number
  /** Faixas de hoje (B31-01): o carrinho recalcula o unitário com elas. */
  faixas: FaixaPreco[]
}

export interface ItemSemEstoque {
  produtoId: string
  combinacao: string
  disponivel: number
}

export type ResultadoPedido =
  | { ok: true; numero: number; mensagem: string; link: string }
  | { ok: false; erro: string; semEstoque?: ItemSemEstoque[]; precosNovos?: PrecoNovo[] }

/**
 * Formas do mesmo celular brasileiro: o WhatsApp às vezes entrega o número sem o nono
 * dígito (55 + DDD + 8 dígitos), e a cliente digita com ele (55 + DDD + 9 + 8 dígitos).
 */
export function formasDoNumero(whatsapp: string): string[] {
  const m = /^55(\d{2})(9?)(\d{8})$/.exec(whatsapp)
  if (!m) return [whatsapp]
  const [, ddd, , resto] = m
  return [`55${ddd}9${resto}`, `55${ddd}${resto}`]
}

async function acharOuCriarContato(workspaceId: string, whatsapp: string, nome: string): Promise<string> {
  const svc = createServiceClient()
  const { data: existentes } = await svc
    .from("contacts")
    .select("id, phone_number")
    .eq("workspace_id", workspaceId)
    .in("phone_number", formasDoNumero(whatsapp))
  // Com as duas formas cadastradas, fica a que a cliente digitou.
  const existente = existentes?.find((c) => c.phone_number === whatsapp) ?? existentes?.[0]
  // B21-07: contato que já existe só recebe o pedido. Quem pede pela loja não tira o
  // contato da lixeira (a empresa vê o pedido e decide se restaura) nem escreve o nome dele.
  if (existente) return existente.id
  const { data: criado, error } = await svc.from("contacts").insert({ workspace_id: workspaceId, phone_number: whatsapp, name: nome }).select("id").single()
  if (error || !criado) throw new Error(`Não foi possível criar o contato: ${error?.message ?? "sem detalhe"}`)
  return criado.id
}

const AVISO_ESPERE_PARA_PEDIR = "Você acabou de fazer um pedido. Espere 2 minutos para enviar outro."

/**
 * B44-09: um pedido por telefone a cada 2 minutos, em cada loja, valendo também para
 * pedidos ao mesmo tempo: a vaga do telefone é reservada antes de gravar (conta e grava
 * de uma vez) e devolvida se o pedido não entrar.
 */
export async function registrarPedido(endereco: string, cliente: { nome: string; whatsapp: string }, solicitados: ItemSolicitado[]): Promise<ResultadoPedido> {
  const whatsapp = normalizarWhatsapp(cliente.whatsapp)
  if (!whatsapp) return registrarPedidoConferido(endereco, cliente, solicitados)

  const vaga = await reservarTentativa("pedido_telefone", chaveDoTelefoneNaLoja(endereco, whatsapp), 1, INTERVALO_ENTRE_PEDIDOS_MS / 60_000)
  if (!vaga.reservada) return { ok: false, erro: AVISO_ESPERE_PARA_PEDIR }
  try {
    const resultado = await registrarPedidoConferido(endereco, cliente, solicitados)
    if (!resultado.ok) await liberarTentativa(vaga.id)
    return resultado
  } catch (erro) {
    await liberarTentativa(vaga.id)
    throw erro
  }
}

async function registrarPedidoConferido(endereco: string, cliente: { nome: string; whatsapp: string }, solicitados: ItemSolicitado[]): Promise<ResultadoPedido> {
  const nome = cliente.nome.trim()
  if (!nome) return { ok: false, erro: "Informe seu nome." }
  if (nome.length > 80) return { ok: false, erro: "O nome passa de 80 caracteres." }
  const whatsapp = normalizarWhatsapp(cliente.whatsapp)
  if (!whatsapp) return { ok: false, erro: "Informe o WhatsApp com DDD, ex.: (21) 99999-0000." }
  if (!Array.isArray(solicitados) || solicitados.length === 0 || solicitados.length > 100) return { ok: false, erro: "Seu carrinho está vazio." }
  if (solicitados.some((i) => !Number.isInteger(i.quantidade) || i.quantidade <= 0 || i.quantidade > 100_000)) return { ok: false, erro: "Quantidade inválida no carrinho." }

  const loja = await carregarLojaPublica(endereco)
  if (!loja) return { ok: false, erro: "A loja não está recebendo pedidos agora." }

  const svc = createServiceClient()

  const desde = new Date(Date.now() - INTERVALO_ENTRE_PEDIDOS_MS).toISOString()
  const { data: recente } = await svc
    .from("catalog_orders")
    .select("id")
    .eq("workspace_id", loja.workspaceId)
    .in("customer_whatsapp", formasDoNumero(whatsapp))
    .gte("created_at", desde)
    .limit(1)
  if (recente?.length) return { ok: false, erro: AVISO_ESPERE_PARA_PEDIR }

  const ids = [...new Set(solicitados.map((i) => i.produtoId))]
  if (ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return { ok: false, erro: "Um produto do carrinho não existe mais. Tire-o e tente de novo." }
  const { data: produtos } = await svc
    .from("catalog_products")
    .select("id, name, price, sku, photos, variant_types, price_tiers, min_quantity, pack_quantities, pack_price, catalog_stock(combination, quantity)")
    .eq("workspace_id", loja.workspaceId)
    .eq("visible", true)
    .in("id", ids)
  const porId = new Map((produtos ?? []).map((p) => [p.id, p]))

  // Somar a mesma combinação que aparecer duas vezes antes de conferir o estoque.
  const agrupados = new Map<string, ItemSolicitado>()
  for (const i of solicitados) {
    const chave = `${i.produtoId}|${i.combinacao}`
    const atual = agrupados.get(chave)
    agrupados.set(chave, atual ? { ...atual, quantidade: atual.quantidade + i.quantidade } : { ...i })
  }

  // B31-01: a faixa de preço e o mínimo contam as peças do produto inteiro, somando as combinações.
  const pecasDoProduto = new Map<string, number>()
  for (const i of agrupados.values()) pecasDoProduto.set(i.produtoId, (pecasDoProduto.get(i.produtoId) ?? 0) + i.quantidade)
  // B31-03: com preço próprio da grade, as faixas não valem e o unitário é o da grade.
  const unitarioDe = (p: { price: number | string; price_tiers: unknown; pack_quantities: unknown; pack_price: unknown; variant_types: unknown }, produtoId: string) => {
    const grade = gradeDoBanco(p.pack_quantities, p.pack_price, p.variant_types)
    const faixa = faixaAlcancada(grade?.preco ? [] : faixasDoBanco(p.price_tiers), pecasDoProduto.get(produtoId) ?? 0)
    const base = faixa?.preco ?? Number(p.price)
    return { preco: grade ? unitarioDaGrade(grade, base) : base, faixaAplicada: faixa?.min ?? null, grade }
  }

  const itens: (ItemPedido & { product_id: string; photo_path: string | null })[] = []
  const semEstoque: ItemSemEstoque[] = []
  for (const i of agrupados.values()) {
    const p = porId.get(i.produtoId)
    if (!p) return { ok: false, erro: "Um produto do carrinho saiu da loja. Tire-o e tente de novo.", semEstoque: [{ produtoId: i.produtoId, combinacao: i.combinacao, disponivel: 0 }] }
    const validas = new Set(combinacoes((p.variant_types as TipoVariacao[]) ?? []).map(chaveCombinacao))
    if (!validas.has(i.combinacao)) return { ok: false, erro: `${p.name}: essa opção não existe mais. Tire-a do carrinho.`, semEstoque: [{ produtoId: i.produtoId, combinacao: i.combinacao, disponivel: 0 }] }
    const disponivel = ((p.catalog_stock as { combination: string; quantity: number }[]) ?? []).find((e) => e.combination === i.combinacao)?.quantity ?? 0
    if (i.quantidade > disponivel) semEstoque.push({ produtoId: i.produtoId, combinacao: i.combinacao, disponivel })
    const unitario = unitarioDe(p, p.id)
    itens.push({
      product_id: p.id,
      nome: p.name,
      codigo: p.sku,
      variacao: i.combinacao,
      quantidade: i.quantidade,
      precoUnitario: unitario.preco,
      faixaAplicada: unitario.faixaAplicada,
      naGrade: !!unitario.grade,
      photo_path: ((p.photos as string[]) ?? [])[0] ?? null,
    })
  }
  if (semEstoque.length) {
    const nomes = semEstoque.map((s) => {
      const p = porId.get(s.produtoId)!
      return `${p.name}${s.combinacao ? ` (${s.combinacao})` : ""}: ${s.disponivel === 0 ? "esgotou" : `só ${s.disponivel}`}`
    })
    return { ok: false, erro: `Algumas peças mudaram de estoque — ${nomes.join("; ")}. Ajuste o carrinho.`, semEstoque }
  }

  // QA A9 (06/10): o carrinho guarda o preço de quando a peça entrou. Mudou no
  // catálogo (o preço base ou a faixa, B31-01), a cliente vê o novo e confirma de novo,
  // em vez de o pedido sair diferente.
  const precosNovos: PrecoNovo[] = []
  for (const i of agrupados.values()) {
    const p = porId.get(i.produtoId)
    if (!p || i.preco === undefined) continue
    const atual = unitarioDe(p, p.id).preco
    if (Math.abs(i.preco - atual) >= 0.005 && !precosNovos.some((n) => n.produtoId === p.id)) {
      precosNovos.push({ produtoId: p.id, preco: Number(p.price), faixas: faixasDoBanco(p.price_tiers) })
    }
  }
  if (precosNovos.length) {
    const nomes = precosNovos.map((n) => porId.get(n.produtoId)!.name)
    return { ok: false, erro: `O preço mudou: ${nomes.join(", ")}. Confira o carrinho e envie de novo.`, precosNovos }
  }

  // B31-03: produto de grade fechada só sai em pacotes inteiros, por bloco (cor).
  const grades: GradeNoPedido[] = []
  for (const produtoId of pecasDoProduto.keys()) {
    const p = porId.get(produtoId)!
    const grade = gradeDoBanco(p.pack_quantities, p.pack_price, p.variant_types)
    if (!grade) continue
    const porBloco = new Map<string, Record<string, number>>()
    for (const i of agrupados.values()) {
      if (i.produtoId !== produtoId) continue
      const bloco = blocoDaCombinacao(i.combinacao)
      const q = porBloco.get(bloco) ?? {}
      q[opcaoDaCombinacao(i.combinacao)] = (q[opcaoDaCombinacao(i.combinacao)] ?? 0) + i.quantidade
      porBloco.set(bloco, q)
    }
    for (const [bloco, quantidades] of porBloco) {
      const pacotes = pacotesDoBloco(grade, quantidades)
      if (!pacotes) return { ok: false, erro: `${p.name}: a grade${bloco ? ` de ${bloco}` : ""} está quebrada. Cada grade tem ${detalheDaGrade(grade)}. Refaça a partir do produto.` }
      const pecas = Object.values(quantidades).reduce((s, q) => s + q, 0)
      grades.push({
        nome: p.name,
        bloco,
        pacotes,
        pecas,
        precoUnitario: unitarioDe(p, produtoId).preco,
        detalhe: Object.keys(grade.quantidades).filter((o) => (quantidades[o] ?? 0) > 0).map((o) => `${o} ${quantidades[o]}`).join(" · "),
      })
    }
  }

  // B31-01: mínimo de peças do produto, somando as combinações, além do mínimo da loja.
  for (const [produtoId, pecas] of pecasDoProduto) {
    const p = porId.get(produtoId)!
    if (p.min_quantity && pecas < p.min_quantity) {
      return { ok: false, erro: `${p.name}: mínimo ${p.min_quantity} ${p.min_quantity === 1 ? "peça" : "peças"}. Você pediu ${pecas}.` }
    }
  }

  const falta = faltaParaMinimo(itens, loja.minimo)
  if (falta) return { ok: false, erro: `${falta}.` }

  // B31-02: desconto da loja pelo total de peças, sobre o subtotal já com as faixas.
  const totais = totaisDoPedido(itens)
  const linhaDesconto = descontoAlcancado(loja.descontos, totais.pecas)
  const desconto = linhaDesconto ? { percent: linhaDesconto.percent, valor: aplicarDesconto(totais.valor, linhaDesconto.percent).desconto } : null

  const contatoId = await acharOuCriarContato(loja.workspaceId, whatsapp, nome)
  const { data, error } = await svc.rpc("registrar_pedido_catalogo", {
    p_workspace: loja.workspaceId,
    p_contato: contatoId,
    p_nome: nome,
    p_whatsapp: whatsapp,
    p_itens: itens.map((i) => ({ product_id: i.product_id, product_name: i.nome, combination: i.variacao, quantity: i.quantidade, unit_price: i.precoUnitario, photo_path: i.photo_path })),
    p_desconto_percent: desconto?.percent ?? 0,
  })
  const registrado = (data as { pedido_id: string; numero: number }[] | null)?.[0]
  if (error || !registrado) return { ok: false, erro: "Não deu para enviar o pedido. Tente de novo." }

  // B29-02: a foto vem pelo canal direto, depois de o pedido estar gravado. Nunca falha.
  await buscarEGuardarFotoDoContato({ svc, workspaceId: loja.workspaceId, contactId: contatoId, telefone: whatsapp })

  const mensagem = montarMensagemPedido({ numero: registrado.numero, nomeCliente: nome, itens, desconto, grades, mensagemFechamento: loja.mensagemFechamento })
  return { ok: true, numero: registrado.numero, mensagem, link: linkWhatsapp(loja.whatsapp, mensagem) }
}
