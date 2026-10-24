import { NextRequest, NextResponse } from "next/server"
import { rodarRotinaPerfilRfv } from "@/lib/automacoes/perfil-rfv"

// B43-03: gatilho "Entrou no perfil RFV". A Vercel chama esta rota uma vez em cada
// hora do dia (24 rotinas diárias no vercel.json: o plano Hobby só aceita rotina
// diária, e cada uma roda dentro da hora marcada). Cada chamada faz a conferência do
// dia, se já passou das 3h, e o disparo das automações desta hora.
//
// Recusa sem CRON_SECRET, como a da lixeira: ela manda mensagem para clientes.
// (Padrão da documentação da Vercel: docs/cron-jobs/manage-cron-jobs.)

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const resultado = await rodarRotinaPerfilRfv()
  return NextResponse.json({ status: "ok", ...resultado })
}
