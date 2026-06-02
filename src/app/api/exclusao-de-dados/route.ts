import { createHmac } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/integrations/supabase/service"

function verificarAssinatura(signedRequest: string, appSecret: string): Record<string, unknown> | null {
  const [encodedSig, payload] = signedRequest.split(".")
  if (!encodedSig || !payload) return null

  const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64")
  const expectedSig = createHmac("sha256", appSecret).update(payload).digest()

  if (!sig.equals(expectedSig)) return null

  try {
    return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"))
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return NextResponse.json({ error: "not configured" }, { status: 500 })

  const contentType = request.headers.get("content-type") ?? ""
  let signedRequest: string | null = null

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text()
    const params = new URLSearchParams(text)
    signedRequest = params.get("signed_request")
  } else {
    const body = await request.json().catch(() => null)
    signedRequest = body?.signed_request ?? null
  }

  if (!signedRequest) {
    return NextResponse.json({ error: "signed_request ausente" }, { status: 400 })
  }

  const payload = verificarAssinatura(signedRequest, appSecret)
  if (!payload) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 403 })
  }

  const facebookUserId = payload.user_id as string | undefined
  if (!facebookUserId) {
    return NextResponse.json({ error: "user_id ausente" }, { status: 400 })
  }

  const confirmationCode = `del_${facebookUserId}_${Date.now()}`
  const supabase = createServiceClient()

  await supabase
    .from("data_deletion_requests")
    .insert({
      facebook_user_id: facebookUserId,
      confirmation_code: confirmationCode,
      status: "pending",
    })
    .then(({ error }) => {
      if (error) console.error("[exclusao-de-dados] erro ao salvar:", error.message)
    })

  const statusUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://crm-exponencial.vercel.app"}/exclusao-de-dados/${confirmationCode}`

  return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode })
}
