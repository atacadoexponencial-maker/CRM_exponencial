// @vitest-environment node
// B20-04 — fotos por link só da internet pública (auditoria de 06/10/2026).
// Antes, `http://[::ffff:169.254.169.254]/` passava: o `new URL` reescreve o IPv4 mapeado
// como `::ffff:a9fe:a9fe`, e a regra antiga comparava texto.

import { describe, it, expect } from "vitest"
import { baixarFoto, ipPermitido } from "@/lib/catalogo/baixar-foto"

const NAO_PERMITIDO = { ok: false, motivo: "não abriu (endereço não permitido)" }

describe("B20-04 — Fotos por link só da internet pública", { timeout: 30_000 }, () => {
  it("should reject IPs internos e reservados escritos de qualquer forma", () => {
    const internos = [
      "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.0.10", "169.254.169.254", "100.64.0.1",
      "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "192.0.2.1",
      "::1", "::", "fe80::1", "fc00::1", "fd12::1", "ff02::1",
      "::ffff:169.254.169.254", "::ffff:a9fe:a9fe", "::ffff:7f00:1", "::ffff:10.0.0.1",
      "64:ff9b::a9fe:a9fe", "2002:a9fe:a9fe::1", "2001:db8::1",
    ]
    for (const ip of internos) expect(ipPermitido(ip), ip).toBe(false)
  })

  it("should aceitar IPs públicos", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "2001:4860:4860::8888"]) {
      expect(ipPermitido(ip), ip).toBe(true)
    }
  })

  it("should reject links que apontam para a rede interna, inclusive disfarçados", async () => {
    const links = [
      "http://[::ffff:169.254.169.254]/latest/meta-data/",
      "http://[::ffff:a9fe:a9fe]/",
      "http://[::ffff:127.0.0.1]:3000/",
      "http://[64:ff9b::a9fe:a9fe]/",
      "http://127.1/",
      "http://2130706433/",
      "http://0x7f000001/",
      "http://localhost/foto.png",
      "file:///etc/passwd",
    ]
    for (const link of links) expect(await baixarFoto(link), link).toEqual(NAO_PERMITIDO)
  })

  it("should reject nome público que resolve para IP interno, na hora de conectar", async () => {
    // localtest.me é um nome de DNS público que resolve para 127.0.0.1.
    expect(await baixarFoto("http://localtest.me/foto.png")).toEqual(NAO_PERMITIDO)
  })
})
