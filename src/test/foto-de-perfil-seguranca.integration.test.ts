// @vitest-environment node
// B29-02 — a cópia da foto de perfil é só para quem é da empresa. Bate no Storage
// real: sobe um arquivo no bucket `contact-photos` com a chave de serviço e
// confere quem consegue abrir.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { BUCKET_FOTOS, caminhoDaFoto, urlAssinadaDaFoto } from "@/lib/whatsapp/foto-de-perfil"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const service = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const ts = Date.now()
const BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])

let wsDona = "", wsOutra = "", userOutra = "", caminho = ""

beforeAll(async () => {
  wsDona = (await service.from("workspaces").insert({ name: `[TESTE] Foto dona ${ts}` }).select("id").single()).data!.id
  wsOutra = (await service.from("workspaces").insert({ name: `[TESTE] Foto outra ${ts}` }).select("id").single()).data!.id
  const { data: auth } = await service.auth.admin.createUser({ email: `foto-outra-${ts}@teste.local`, password: SENHA, email_confirm: true })
  userOutra = auth.user!.id
  await service.from("profiles").insert({ id: userOutra, workspace_id: wsOutra, name: "Outra", role: "admin", status: "active" })

  caminho = caminhoDaFoto(wsDona, `contato-${ts}`)
  const { error } = await service.storage.from(BUCKET_FOTOS).upload(caminho, BYTES, { contentType: "image/jpeg", upsert: true })
  if (error) throw new Error(`upload: ${error.message}`)
}, 30_000)

afterAll(async () => {
  await service.storage.from(BUCKET_FOTOS).remove([caminho])
  await service.from("profiles").delete().eq("id", userOutra)
  await service.auth.admin.deleteUser(userOutra)
  await service.from("workspaces").delete().in("id", [wsDona, wsOutra])
})

describe("B29-02 — a foto é só para quem é da empresa", { timeout: 30_000 }, () => {
  it("CA-B29-12: o endereço público da foto não abre para ninguém, e outra empresa não baixa; o endereço assinado abre", async () => {
    // Anônimo, pelo endereço público do bucket: o bucket é privado.
    const publico = await fetch(`${URL}/storage/v1/object/public/${BUCKET_FOTOS}/${caminho}`)
    expect(publico.status).not.toBe(200)

    // Usuário logado de outra empresa, pelo cliente do navegador: nenhuma política deixa ler.
    const outra = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error: erroLogin } = await outra.auth.signInWithPassword({ email: `foto-outra-${ts}@teste.local`, password: SENHA })
    expect(erroLogin).toBeNull()
    const { data, error } = await outra.storage.from(BUCKET_FOTOS).download(caminho)
    expect(data).toBeNull()
    expect(error).not.toBeNull()

    // O endereço assinado pelo servidor abre, e entrega a imagem.
    const assinado = await urlAssinadaDaFoto(service, caminho)
    expect(assinado).toBeTruthy()
    const resposta = await fetch(assinado!)
    expect(resposta.status).toBe(200)
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(BYTES)
  })
})
