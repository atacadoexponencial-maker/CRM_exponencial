// Opções do editor que vêm do banco: o que aparece nos seletores do painel e o
// que os resumos da lista usam para trocar ids por nomes. Lido pelas páginas
// (server components), com a sessão do admin.

import type { createClient } from "@/integrations/supabase/server"
import { horarioDoBanco } from "@/lib/horario-comercial"
import type { OpcoesEditor } from "./components/catalogo"
import { camposDaEmpresa } from "@/lib/campos-personalizados-servidor"

type ClienteDaSessao = Awaited<ReturnType<typeof createClient>>

export async function carregarOpcoesEditor(supabase: ClienteDaSessao, workspaceId: string): Promise<OpcoesEditor> {
  const [etiquetas, perfis, tags, times, sequencias, rapidas, numeros, horario, funis, campos] = await Promise.all([
    supabase.from("labels").select("id, name, color").eq("workspace_id", workspaceId).order("name"),
    supabase.from("profiles").select("id, name").eq("workspace_id", workspaceId).eq("status", "active").order("name"),
    supabase.from("contact_tags").select("tag").eq("workspace_id", workspaceId),
    supabase.from("teams").select("id, name").eq("workspace_id", workspaceId).order("name"),
    supabase.from("sequences").select("id, nome").eq("workspace_id", workspaceId).order("nome"),
    supabase.from("quick_replies").select("id, title").eq("workspace_id", workspaceId).order("title"),
    supabase.from("whatsapp_connections").select("id, display_name, phone_number").eq("workspace_id", workspaceId),
    supabase.from("business_hours").select("dias, inicio, fim").eq("workspace_id", workspaceId).maybeSingle(),
    // B41-04: funis da empresa e as etapas deles, na ordem
    supabase.from("funis").select("id, nome, created_at, funil_etapas (id, nome, ordem)").eq("workspace_id", workspaceId).order("created_at"),
    // B38-04: campos personalizados da empresa, na ordem dela
    camposDaEmpresa(supabase, workspaceId),
  ])

  const nomesDeTag = [...new Set((tags.data ?? []).map((t) => t.tag))].sort((a, b) => a.localeCompare(b, "pt-BR"))

  return {
    etiquetas: (etiquetas.data ?? []).map((l) => ({ id: l.id, nome: l.name, cor: l.color })),
    atendentes: (perfis.data ?? []).map((p) => ({ id: p.id, nome: p.name })),
    tags: nomesDeTag.map((tag) => ({ id: tag, nome: tag })),
    times: (times.data ?? []).map((t) => ({ id: t.id, nome: t.name })),
    sequencias: (sequencias.data ?? []).map((s) => ({ id: s.id, nome: s.nome })),
    mensagensRapidas: (rapidas.data ?? []).map((q) => ({ id: q.id, nome: q.title })),
    numeros: (numeros.data ?? []).map((n) => ({ id: n.id, nome: n.display_name || n.phone_number || "sem nome" })),
    horarioComercial: horarioDoBanco(horario.data),
    funis: (funis.data ?? []).map((f) => ({
      id: f.id,
      nome: f.nome,
      etapas: [...(f.funil_etapas ?? [])].sort((a, b) => a.ordem - b.ordem).map((e) => ({ id: e.id, nome: e.nome })),
    })),
    camposPersonalizados: campos.map(({ id, nome, tipo, opcoes }) => ({ id, nome, tipo, opcoes })),
  }
}
