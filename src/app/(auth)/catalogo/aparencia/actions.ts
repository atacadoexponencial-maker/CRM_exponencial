"use server"

// Aparência da loja (B16-08). Conferência de papel aqui; o RLS repete.

import { randomUUID } from "node:crypto"
import { sessaoAtual } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { BUCKET_CATALOGO, FORMATOS_FOTO, FORMATOS_LOGO, IDS_FONTE, LAYOUTS_VITRINE, TAMANHO_MAX_BANNER, TAMANHO_MAX_LOGO } from "@/lib/catalogo/regras"
import { temaDasConfiguracoes, urlPublicaImagem } from "@/lib/catalogo/loja-publica"
import { corValida, type TemaLoja } from "@/app/loja/components/tema"

async function exigirGestor() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { ok: false as const, erro: "Sessão expirada. Entre de novo." }
  if (perfil.role !== "admin" && perfil.role !== "gerente") return { ok: false as const, erro: "Só Admin e Gerente mexem no catálogo." }
  return { ok: true as const, supabase, perfil }
}

const COLUNAS_TEMA = "store_name, welcome_text, logo_path, banner_path, primary_color, background_color, font_id, layout"

export async function carregarTema(): Promise<TemaLoja | null> {
  const s = await exigirGestor()
  if (!s.ok) return null
  const [{ data: cfg }, { data: empresa }] = await Promise.all([
    s.supabase.from("catalog_settings").select(COLUNAS_TEMA).eq("workspace_id", s.perfil.workspace_id).maybeSingle(),
    s.supabase.from("workspaces").select("name").eq("id", s.perfil.workspace_id).maybeSingle(),
  ])
  return temaDasConfiguracoes(cfg, empresa?.name ?? "Minha loja")
}

export async function prepararEnvioImagemLoja(tipo: "logo" | "banner", arquivo: { tipo: string; tamanho: number }): Promise<{ erro: string } | { token: string; caminho: string; url: string }> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const formatos = tipo === "logo" ? FORMATOS_LOGO : FORMATOS_FOTO
  const extensao = formatos[arquivo.tipo]
  if (!extensao) return { erro: tipo === "logo" ? "Use PNG, JPG, SVG ou WebP." : "Use PNG, JPG ou WebP." }
  if (arquivo.tamanho > (tipo === "logo" ? TAMANHO_MAX_LOGO : TAMANHO_MAX_BANNER)) return { erro: `A imagem passa de ${tipo === "logo" ? 2 : 5} MB.` }
  const caminho = `${s.perfil.workspace_id}/marca/${tipo}-${randomUUID()}.${extensao}`
  const { data, error } = await createServiceClient().storage.from(BUCKET_CATALOGO).createSignedUploadUrl(caminho)
  if (error || !data) return { erro: "Não deu para preparar o envio. Tente de novo." }
  return { token: data.token, caminho, url: urlPublicaImagem(caminho) }
}

/** O caminho no armazenamento a partir do endereço público, se for da pasta da empresa. */
function caminhoDaMarca(url: string | null, workspaceId: string): string | null | false {
  if (!url) return null
  const prefixo = urlPublicaImagem("")
  if (!url.startsWith(prefixo)) return false
  const caminho = url.slice(prefixo.length)
  return caminho.startsWith(`${workspaceId}/marca/`) ? caminho : false
}

export async function salvarAparencia(tema: TemaLoja): Promise<{ erro?: string; aviso?: string }> {
  const s = await exigirGestor()
  if (!s.ok) return { erro: s.erro }
  const { supabase, perfil } = s

  const nome = tema.nomeLoja.trim()
  if (!nome || nome.length > 60) return { erro: "O nome da loja precisa ter de 1 a 60 caracteres." }
  if (tema.boasVindas.length > 140) return { erro: "O texto de boas-vindas passa de 140 caracteres." }
  const principal = tema.corPrincipal.toLowerCase()
  const fundo = tema.corFundo.toLowerCase()
  if (!corValida(principal) || !corValida(fundo)) return { erro: "Use cores no formato #rrggbb." }
  if (!(IDS_FONTE as readonly string[]).includes(tema.fonteId)) return { erro: "Fonte inválida." }
  if (!(LAYOUTS_VITRINE as readonly string[]).includes(tema.layout)) return { erro: "Layout inválido." }
  const logo = caminhoDaMarca(tema.logoUrl, perfil.workspace_id)
  const banner = caminhoDaMarca(tema.bannerUrl, perfil.workspace_id)
  if (logo === false || banner === false) return { erro: "Imagem inválida. Envie de novo." }

  const { data: antes } = await supabase.from("catalog_settings").select("logo_path, banner_path").eq("workspace_id", perfil.workspace_id).maybeSingle()

  const { error } = await supabase.from("catalog_settings").upsert({
    workspace_id: perfil.workspace_id,
    store_name: nome,
    welcome_text: tema.boasVindas.trim(),
    logo_path: logo,
    banner_path: banner,
    primary_color: principal,
    background_color: fundo,
    font_id: tema.fonteId,
    layout: tema.layout,
    updated_at: new Date().toISOString(),
  })
  if (error) return { erro: "Não deu para salvar a aparência. Tente de novo." }

  const trocados = [antes?.logo_path, antes?.banner_path].filter((c): c is string => !!c && c !== logo && c !== banner)
  if (trocados.length) await createServiceClient().storage.from(BUCKET_CATALOGO).remove(trocados).catch(() => {})
  return { aviso: "Salvo. A loja já abre com a aparência nova." }
}
