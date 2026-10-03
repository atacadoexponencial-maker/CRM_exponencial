import { NextRequest, NextResponse } from "next/server"
import { esvaziarLixeiraVencida } from "@/lib/lixeira"

// B13-06: apaga de vez o que está na lixeira há mais de 30 dias. Chamado pelo
// cron diário da Vercel, que envia `Authorization: Bearer <CRON_SECRET>`.
//
// Diferente das rotas de sequências e campanhas, esta recusa quando o segredo
// não está configurado: ela apaga dados, então nunca pode ficar aberta.
// (Padrão da documentação da Vercel: docs/cron-jobs/manage-cron-jobs.)
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const resultado = await esvaziarLixeiraVencida()
  return NextResponse.json({ status: "ok", ...resultado })
}
