"use server"

// Configurações do catálogo (B16-07). Conferência de papel aqui; o RLS repete.

import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { enderecoDeLojaValido } from "@/lib/catalogo/regras"
import { normalizarWhatsapp } from "@/app/loja/components/pedido"
import type { ConfigCatalogo } from "../components/form-configuracoes"

async function exigirGestor() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { ok: false as const, erro: "Sessão expirada. Entre de novo." }
  if (perfil.role !== "admin" && perfil.role !== "gerente") return { ok: false as const, erro: "Só Admin e Gerente mexem no catálogo." }
  return { ok: true as const, supabase, perfil }
}

/** Número gravado (55 + DDD + número) como a pessoa digita: (21) 99999-0000. */
function numeroParaExibir(digitos: string | null): string {
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(digitos ?? "")
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : ""
}

const CONFIG_VAZIA: ConfigCatalogo = {
  endereco: "",
  numeroPedidos: "",
  minimo: { tipo: "nenhum", valor: null },
  mensagemFechamento: "",
  publicado: false,
}

export async function carregarConfiguracoes(): Promise<{ config: ConfigCatalogo } | null> {
  const s = await exigirGestor()
  if (!s.ok) return null
  const { data: cfg } = await s.supabase.from("catalog_settings").select("slug, orders_whatsapp, min_type, min_value, closing_message, published").eq("workspace_id", s.perfil.workspace_id).maybeSingle()
  return {
    config: cfg
      ? {
          endereco: cfg.slug ?? "",
          numeroPedidos: numeroParaExibir(cfg.orders_whatsapp),
          minimo: { tipo: cfg.min_type as ConfigCatalogo["minimo"]["tipo"], valor: cfg.min_value === null ? null : Number(cfg.min_value) },
          mensagemFechamento: cfg.closing_message,
          publicado: cfg.published,
        }
      : CONFIG_VAZIA,
  }
}

/** Disponível quando nenhuma outra empresa usa o endereço. */
export async function verificarEndereco(endereco: string): Promise<"disponivel" | "em_uso"> {
  const s = await exigirGestor()
  if (!s.ok || !enderecoDeLojaValido(endereco)) return "em_uso"
  // A busca precisa olhar todas as empresas (o RLS só mostra a própria): chave de serviço,
  // devolvendo só sim/não.
  const { data } = await createServiceClient().from("catalog_settings").select("workspace_id").ilike("slug", endereco).maybeSingle()
  return !data || data.workspace_id === s.perfil.workspace_id ? "disponivel" : "em_uso"
}

export async function salvarConfiguracoes(config: ConfigCatalogo): Promise<{ erro?: string; aviso?: string }> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { supabase, perfil } = s

  const endereco = config.endereco.trim().toLowerCase()
  if (endereco && !enderecoDeLojaValido(endereco)) return { erro: "Endereço inválido: use de 3 a 40 letras minúsculas, números e hífen (sem hífen nas pontas). Alguns nomes são reservados." }
  if (config.minimo.tipo !== "nenhum" && !(config.minimo.valor && config.minimo.valor > 0)) return { erro: "Informe o valor do pedido mínimo, maior que zero." }
  if (config.minimo.tipo === "pecas" && !Number.isInteger(config.minimo.valor)) return { erro: "O mínimo de peças precisa ser um número inteiro." }
  if (config.mensagemFechamento.length > 500) return { erro: "A mensagem de fechamento passa de 500 caracteres." }

  const numeroPedidos = config.numeroPedidos.trim() ? normalizarWhatsapp(config.numeroPedidos) : null
  if (config.numeroPedidos.trim() && !numeroPedidos) return { erro: "Número dos pedidos inválido: informe o WhatsApp com DDD, ex.: (21) 99999-0000." }
  if (config.publicado && (!endereco || !numeroPedidos)) return { erro: "Para publicar, escolha o endereço da loja e informe o número que recebe os pedidos." }
  if (endereco && (await verificarEndereco(endereco)) === "em_uso") return { erro: "Esse endereço já é de outra loja. Escolha outro." }

  const { error } = await supabase.from("catalog_settings").upsert({
    workspace_id: perfil.workspace_id,
    slug: endereco || null,
    orders_whatsapp: numeroPedidos,
    min_type: config.minimo.tipo,
    min_value: config.minimo.tipo === "nenhum" ? null : config.minimo.valor,
    closing_message: config.mensagemFechamento.trim(),
    published: config.publicado,
    updated_at: new Date().toISOString(),
  })
  if (error) return { erro: error.code === "23505" ? "Esse endereço já é de outra loja. Escolha outro." : "Não deu para salvar. Tente de novo." }
  return { aviso: config.publicado ? "Salvo. A loja está publicada no link acima." : "Salvo. A loja está despublicada." }
}
