// Pedido feito pela vitrine (B16-09). Só no servidor: a cliente não tem login, então tudo
// é conferido aqui, com dados do banco — preços, estoque e mínimo do navegador nunca valem.

import { createServiceClient } from "@/integrations/supabase/service"
import { chaveCombinacao, combinacoes, type TipoVariacao } from "./combinacoes"
import { carregarLojaPublica } from "./loja-publica"
import { faltaParaMinimo, linkWhatsapp, montarMensagemPedido, normalizarWhatsapp, type ItemPedido } from "@/app/loja/components/pedido"

/** Mesmo WhatsApp, mesma loja: um pedido a cada 2 minutos. */
export const INTERVALO_ENTRE_PEDIDOS_MS = 2 * 60 * 1000

export interface ItemSolicitado {
  produtoId: string
  combinacao: string
  quantidade: number
}

export interface ItemSemEstoque {
  produtoId: string
  combinacao: string
  disponivel: number
}

export type ResultadoPedido =
  | { ok: true; numero: number; mensagem: string; link: string }
  | { ok: false; erro: string; semEstoque?: ItemSemEstoque[] }

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

export async function registrarPedido(endereco: string, cliente: { nome: string; whatsapp: string }, solicitados: ItemSolicitado[]): Promise<ResultadoPedido> {
  const nome = cliente.nome.trim()
  if (!nome || nome.length > 80) return { ok: false, erro: "Informe seu nome." }
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
  if (recente?.length) return { ok: false, erro: "Você acabou de fazer um pedido. Espere 2 minutos para enviar outro." }

  const ids = [...new Set(solicitados.map((i) => i.produtoId))]
  if (ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) return { ok: false, erro: "Um produto do carrinho não existe mais. Tire-o e tente de novo." }
  const { data: produtos } = await svc
    .from("catalog_products")
    .select("id, name, price, photos, variant_types, catalog_stock(combination, quantity)")
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

  const itens: (ItemPedido & { product_id: string; photo_path: string | null })[] = []
  const semEstoque: ItemSemEstoque[] = []
  for (const i of agrupados.values()) {
    const p = porId.get(i.produtoId)
    if (!p) return { ok: false, erro: "Um produto do carrinho saiu da loja. Tire-o e tente de novo.", semEstoque: [{ produtoId: i.produtoId, combinacao: i.combinacao, disponivel: 0 }] }
    const validas = new Set(combinacoes((p.variant_types as TipoVariacao[]) ?? []).map(chaveCombinacao))
    if (!validas.has(i.combinacao)) return { ok: false, erro: `${p.name}: essa opção não existe mais. Tire-a do carrinho.`, semEstoque: [{ produtoId: i.produtoId, combinacao: i.combinacao, disponivel: 0 }] }
    const disponivel = ((p.catalog_stock as { combination: string; quantity: number }[]) ?? []).find((e) => e.combination === i.combinacao)?.quantity ?? 0
    if (i.quantidade > disponivel) semEstoque.push({ produtoId: i.produtoId, combinacao: i.combinacao, disponivel })
    itens.push({
      product_id: p.id,
      nome: p.name,
      variacao: i.combinacao,
      quantidade: i.quantidade,
      precoUnitario: Number(p.price),
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

  const falta = faltaParaMinimo(itens, loja.minimo)
  if (falta) return { ok: false, erro: `${falta}.` }

  const contatoId = await acharOuCriarContato(loja.workspaceId, whatsapp, nome)
  const { data, error } = await svc.rpc("registrar_pedido_catalogo", {
    p_workspace: loja.workspaceId,
    p_contato: contatoId,
    p_nome: nome,
    p_whatsapp: whatsapp,
    p_itens: itens.map((i) => ({ product_id: i.product_id, product_name: i.nome, combination: i.variacao, quantity: i.quantidade, unit_price: i.precoUnitario, photo_path: i.photo_path })),
  })
  const registrado = (data as { pedido_id: string; numero: number }[] | null)?.[0]
  if (error || !registrado) return { ok: false, erro: "Não deu para enviar o pedido. Tente de novo." }

  const mensagem = montarMensagemPedido({ numero: registrado.numero, nomeCliente: nome, itens, mensagemFechamento: loja.mensagemFechamento })
  return { ok: true, numero: registrado.numero, mensagem, link: linkWhatsapp(loja.whatsapp, mensagem) }
}
