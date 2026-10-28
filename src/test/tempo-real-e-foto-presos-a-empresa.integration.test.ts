// @vitest-environment node
// B47-02 — o canal pessoal de tempo real é só de conta ativa, e o link da foto do contato
// só sai para o caminho da foto do próprio contato. No banco de teste.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "node:crypto"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { BUCKET_FOTOS, caminhoDaFoto, urlAssinadaDaFoto, urlsAssinadasDasFotos } from "@/lib/whatsapp/foto-de-perfil"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const semSessao = { auth: { autoRefreshToken: false, persistSession: false } }
const servico = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, semSessao)

/** Entra no canal privado e devolve como terminou: SUBSCRIBED, CHANNEL_ERROR ou TIMED_OUT. */
function entrarNoCanal(cliente: SupabaseClient, topico: string): Promise<string> {
  return new Promise((resolver) => {
    const canal = cliente.channel(topico, { config: { private: true } })
    const fim = setTimeout(() => resolver("TIMED_OUT"), 20_000)
    canal.subscribe((status) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(fim)
        void cliente.removeChannel(canal)
        resolver(status)
      }
    })
  })
}

describe("B47-02 — tempo real e foto do contato presos à empresa", () => {
  describe("canal pessoal", () => {
    let ws: string
    let usuario: string
    let token: string

    beforeAll(async () => {
      ws = (await servico.from("workspaces").insert({ name: `B47 canal ${Date.now()}` }).select("id").single()).data!.id
      const email = `b47-canal-${Date.now()}@example.com`
      const senha = `Senha-${randomUUID()}`
      usuario = (await servico.auth.admin.createUser({ email, password: senha, email_confirm: true })).data.user!.id
      await servico.from("profiles").insert({ id: usuario, workspace_id: ws, name: "Atendente B47", role: "atendente", status: "active" })
      const login = await createClient(URL, ANON, semSessao).auth.signInWithPassword({ email, password: senha })
      token = login.data.session!.access_token
    }, 60_000)

    afterAll(async () => {
      await servico.from("profiles").delete().eq("id", usuario)
      await servico.auth.admin.deleteUser(usuario)
      await servico.from("workspaces").delete().eq("id", ws)
    }, 60_000)

    it("CA-B47-05: should recusar o canal pessoal para a conta desativada, com o acesso ainda válido", async () => {
      const comAcesso = () => {
        const c = createClient(URL, ANON, { ...semSessao, global: { headers: { Authorization: `Bearer ${token}` } } })
        c.realtime.setAuth(token)
        return c
      }

      expect(await entrarNoCanal(comAcesso(), `usuario:${usuario}`)).toBe("SUBSCRIBED")

      await servico.from("profiles").update({ status: "inactive" }).eq("id", usuario)
      expect(await entrarNoCanal(comAcesso(), `usuario:${usuario}`)).not.toBe("SUBSCRIBED")

      await servico.from("profiles").update({ status: "active" }).eq("id", usuario)
      expect(await entrarNoCanal(comAcesso(), `usuario:${usuario}`)).toBe("SUBSCRIBED")
    }, 90_000)
  })

  describe("link da foto do contato", () => {
    const wsVitima = randomUUID()
    const contatoVitima = randomUUID()
    const wsIntruso = randomUUID()
    const contatoIntruso = randomUUID()
    const caminhoVitima = caminhoDaFoto(wsVitima, contatoVitima)

    beforeAll(async () => {
      const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9])
      const { error } = await servico.storage.from(BUCKET_FOTOS).upload(caminhoVitima, jpg, { contentType: "image/jpeg", upsert: true })
      expect(error).toBeNull()
    })

    afterAll(async () => {
      await servico.storage.from(BUCKET_FOTOS).remove([caminhoVitima])
    })

    it("CA-B47-07: should not assinar a foto de outra empresa gravada no caminho de um contato, e assinar a do próprio contato", async () => {
      // O intruso gravou no próprio contato o caminho da foto da vítima
      expect(await urlAssinadaDaFoto(servico, wsIntruso, contatoIntruso, caminhoVitima)).toBeNull()
      const lista = await urlsAssinadasDasFotos(servico, [{ workspaceId: wsIntruso, contactId: contatoIntruso, caminho: caminhoVitima }])
      expect(lista.get(contatoIntruso)).toBeUndefined()

      // A foto do próprio contato continua saindo, e abre
      const propria = await urlAssinadaDaFoto(servico, wsVitima, contatoVitima, caminhoVitima)
      expect(propria).toMatch(/^https:\/\//)
      expect((await fetch(propria!)).status).toBe(200)
      const daLista = await urlsAssinadasDasFotos(servico, [{ workspaceId: wsVitima, contactId: contatoVitima, caminho: caminhoVitima }])
      expect(daLista.get(contatoVitima)).toMatch(/^https:\/\//)
    }, 60_000)
  })
})
