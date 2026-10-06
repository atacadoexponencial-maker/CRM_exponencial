// @vitest-environment node
// B19-05 — arquivos sem listagem e sem gravação por fora (auditoria de 06/10/2026).
// Bate no Storage real do Supabase.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0))
let empresa = "", usuario = ""
const pasta = `b19-05-${ts}`
const arquivos = { "catalog-images": `${pasta}/produtos/foto.png`, "chat-attachments": `${pasta}/conversa/anexo.png` }

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `Arquivos B19 ${ts}` }).select("id").single()).data!.id
  const { data } = await service.auth.admin.createUser({ email: `b19-05-${ts}@teste.com`, password: SENHA, email_confirm: true })
  usuario = data.user!.id
  await service.from("profiles").insert({ id: usuario, workspace_id: empresa, name: "Admin", role: "admin" })
  for (const [bucket, caminho] of Object.entries(arquivos)) {
    await service.storage.from(bucket).upload(caminho, PNG, { contentType: "image/png" })
  }
}, 30_000)

afterAll(async () => {
  for (const [bucket, caminho] of Object.entries(arquivos)) await service.storage.from(bucket).remove([caminho])
  await service.storage.from("chat-attachments").remove([`${pasta}/intruso.png`])
  await service.from("profiles").delete().eq("id", usuario)
  await service.auth.admin.deleteUser(usuario)
  await service.from("workspaces").delete().eq("id", empresa)
}, 30_000)

describe("B19-05 — Arquivos guardados sem listagem e sem gravação por fora", { timeout: 30_000 }, () => {
  for (const [bucket, caminho] of Object.entries(arquivos)) {
    it(`should continuar abrindo o arquivo de ${bucket} pelo link`, async () => {
      const { data: { publicUrl } } = service.storage.from(bucket).getPublicUrl(caminho)
      const resposta = await fetch(publicUrl)
      expect(resposta.status).toBe(200)
    })

    it(`should not listar as pastas de ${bucket} para anônimo`, async () => {
      const anon = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: raiz } = await anon.storage.from(bucket).list("")
      const { data: dentro } = await anon.storage.from(bucket).list(caminho.split("/").slice(0, -1).join("/"))
      expect(raiz ?? []).toHaveLength(0)
      expect(dentro ?? []).toHaveLength(0)
      // Controle: o arquivo existe — a chave de serviço o vê.
      const { data: comServico } = await service.storage.from(bucket).list(caminho.split("/").slice(0, -1).join("/"))
      expect(comServico!.length).toBeGreaterThan(0)
    })
  }

  it("should reject usuário logado gravando direto na pasta de anexos do chat", async () => {
    const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    await navegador.auth.signInWithPassword({ email: `b19-05-${ts}@teste.com`, password: SENHA })
    const { error } = await navegador.storage.from("chat-attachments").upload(`${pasta}/intruso.png`, PNG, { contentType: "image/png" })
    expect(error).not.toBeNull()
  })
})
