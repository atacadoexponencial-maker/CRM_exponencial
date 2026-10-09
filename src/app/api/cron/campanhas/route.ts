import { NextRequest, NextResponse } from "next/server"
import { processarCampanhasPendentes } from "@/lib/campanhas"

// Processa campanhas agendadas vencidas e continua envios em andamento.
// Chamado pelo cron da Vercel (diário) e de forma oportunista quando a
// lista de campanhas é aberta.
//
// B21-06: sem CRON_SECRET configurado, recusa (antes, liberava) — mesmo padrão do
// cron da lixeira. As chamadas de dentro do CRM usam a função direto, não esta rota.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const enviadas = await processarCampanhasPendentes()
  return NextResponse.json({ status: "ok", enviadas })
}
