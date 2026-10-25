import { NextRequest, NextResponse } from "next/server"
import { seguirEsperasVencidas } from "@/lib/automacoes/esperas"
import { assinaturaHmacValida } from "@/lib/webhooks/assinatura"

// B28-02: relógio das automações. Segue as esperas de tempo vencidas do bloco
// "esperar". Quem chama, a cada 15 segundos, é o whatsapp-gateway (B28-05): os
// crons da Vercel neste plano são diários.
//
// A chamada vem assinada como os webhooks do gateway, com o mesmo segredo
// (PER-B28-09): HMAC-SHA256 do corpo em `x-gateway-signature-256`. Sem o segredo
// configurado, recusa: a rota roda ações de verdade, então nunca fica aberta.
// Duas chamadas juntas não seguem a mesma espera (`reivindicar_esperas_vencidas`).

const HEADER_ASSINATURA = "x-gateway-signature-256"

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const corpoBruto = await request.text()
  const segredo = process.env.GATEWAY_WEBHOOK_SECRET
  if (!segredo || !assinaturaHmacValida({ corpoBruto, assinatura: request.headers.get(HEADER_ASSINATURA), segredo })) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 })
  }

  try {
    const seguidas = await seguirEsperasVencidas()
    return NextResponse.json({ status: "ok", seguidas })
  } catch {
    // As esperas vencidas continuam lá e seguem na próxima chamada
    return NextResponse.json({ error: "erro ao seguir as esperas" }, { status: 500 })
  }
}
