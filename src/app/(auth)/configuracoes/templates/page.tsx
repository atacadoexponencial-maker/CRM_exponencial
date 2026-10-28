import Link from "next/link"
import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { motivoDoRecursoIndisponivel, recursosDoCanal } from "@/lib/whatsapp"
import type { CanalWhatsApp } from "@/lib/whatsapp"
import { listarTemplates } from "./actions"
import { TemplatesClient } from "./templates-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Templates" }

export default async function TemplatesPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  // B7-02: template de mensagem só existe na API Oficial. Quem tem apenas
  // número do canal direto não deve ver uma gestão que não se aplica a ele — e
  // quem tem os dois precisa saber que ela vale só para o número da Meta.
  const { data: conexoes } = await supabase
    .from("whatsapp_connections")
    .select("canal, phone_number")
    .eq("workspace_id", perfil.workspace_id)

  const canais = (conexoes ?? []).map((c) => (c.canal ?? "meta") as CanalWhatsApp)
  const comTemplates = canais.filter((canal) => recursosDoCanal(canal).templates)
  const semTemplates = canais.filter((canal) => !recursosDoCanal(canal).templates)

  const nenhumNumeroSuportaTemplates = canais.length > 0 && comTemplates.length === 0

  // QA M28 (06/10): sem número, a tela só avisava no fim ("Sem permissão ou WhatsApp não
  // conectado"). Agora diz logo o que falta e aonde ir.
  if (canais.length === 0) {
    return (
      <div className={CLASSE_DA_PAGINA}>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-2">Templates de mensagem</h1>
        <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          Nenhum número de WhatsApp conectado. Os templates valem para o número da API Oficial:{" "}
          <Link href="/configuracoes/whatsapp" className="underline text-foreground">conecte um número</Link> para gerenciá-los.
        </p>
      </div>
    )
  }

  if (nenhumNumeroSuportaTemplates) {
    return (
      <div className={CLASSE_DA_PAGINA}>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-2">Templates de mensagem</h1>
        <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          {motivoDoRecursoIndisponivel("templates", semTemplates[0])}
        </p>
      </div>
    )
  }

  const templates = await listarTemplates()

  return (
    <div className={CLASSE_DA_PAGINA}>
      {semTemplates.length > 0 && comTemplates.length > 0 && (
        <p className="mb-5 rounded-lg border border-aviso/30 bg-aviso-fundo p-4 text-sm">
          Esta empresa tem número no canal direto e número na API Oficial. Os templates
          abaixo valem <strong>apenas para o número da API Oficial</strong> — no canal direto
          qualquer texto pode ser enviado, sem template.
        </p>
      )}
      <TemplatesClient templates={templates} />
    </div>
  )
}
