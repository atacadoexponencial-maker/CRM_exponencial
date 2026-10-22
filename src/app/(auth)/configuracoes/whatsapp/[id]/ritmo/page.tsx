import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, TriangleAlert } from "lucide-react"
import { sessaoAtual } from "@/lib/sessao"
import { lerSaude } from "../saude/actions"
import { lerRitmoDoNumero } from "./actions"
import { RitmoClient } from "./ritmo-client"

export const metadata = { title: "Ritmo do número" }

/**
 * Ritmo de envio de um número (B5-01).
 *
 * **Só Admin.** Gerente acompanha a saúde do número, mas afrouxar o ritmo é
 * assumir risco de bloqueio — decisão de quem responde pelo número.
 */
export default async function RitmoDoNumeroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  // O ritmo e a saúde vêm do mesmo gateway, em chamadas diferentes: o perfil
  // sugerido depende da idade do número, que só a saúde conhece. Saúde que
  // falha não impede configurar o ritmo — só deixa a sugestão mais conservadora.
  const [resultado, saude] = await Promise.all([lerRitmoDoNumero(id), lerSaude(id)])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 lg:px-10">
      <Link
        href={`/configuracoes/whatsapp/${id}/saude`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Saúde do número
      </Link>

      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-1">Ritmo de envio</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Quanto mais devagar, menor o risco de o WhatsApp bloquear o número. O sistema não
        permite ultrapassar os limites mostrados ao lado de cada campo.
      </p>

      {resultado.ok ? (
        <RitmoClient
          connectionId={id}
          ritmo={resultado.ritmo}
          diaDeVida={saude.ok ? saude.saude.aquecimento.dia : null}
          emAquecimento={saude.ok ? saude.saude.aquecimento.ativo : false}
        />
      ) : (
        <div className="flex gap-3 rounded-lg border border-aviso/30 bg-aviso-fundo text-aviso p-5 ">
          <TriangleAlert
            className="size-4 shrink-0 mt-0.5 text-aviso"
            aria-hidden
          />
          <div>
            <p className="text-sm font-medium">Não foi possível ler o ritmo deste número</p>
            <p className="text-sm text-muted-foreground mt-0.5">{resultado.erro}</p>
          </div>
        </div>
      )}
    </div>
  )
}
