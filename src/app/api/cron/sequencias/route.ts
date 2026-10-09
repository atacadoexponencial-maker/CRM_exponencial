import { NextRequest, NextResponse } from "next/server"
import { processarSequenciasPendentes } from "@/lib/sequencias"

// Processa as etapas de sequência vencidas. Chamado pelo cron da Vercel
// (diário) e também de forma oportunista quando a Agenda é aberta.
//
// B21-06: sem CRON_SECRET configurado, recusa (antes, liberava) — mesmo padrão do
// cron da lixeira. As chamadas de dentro do CRM usam a função direto, não esta rota.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const processadas = await processarSequenciasPendentes()
  return NextResponse.json({ status: "ok", processadas })
}
