import { describe, it, expect } from "vitest"
import { schema } from "@/app/cadastro/page"

const dadosValidos = {
  nomeEmpresa: "Empresa Ltda",
  nomeResponsavel: "João Silva",
  email: "joao@empresa.com",
  senha: "senha123",
  confirmarSenha: "senha123",
}

describe("Schema de validação do cadastro", () => {
  it("aceita dados válidos completos", () => {
    const result = schema.safeParse(dadosValidos)
    expect(result.success).toBe(true)
  })

  it("rejeita nome da empresa vazio", () => {
    const result = schema.safeParse({ ...dadosValidos, nomeEmpresa: "" })
    expect(result.success).toBe(false)
    const erro = result.error?.issues.find((i) => i.path.includes("nomeEmpresa"))
    expect(erro?.message).toBe("Nome da empresa é obrigatório")
  })

  it("rejeita nome do responsável vazio", () => {
    const result = schema.safeParse({ ...dadosValidos, nomeResponsavel: "" })
    expect(result.success).toBe(false)
    const erro = result.error?.issues.find((i) => i.path.includes("nomeResponsavel"))
    expect(erro?.message).toBe("Nome do responsável é obrigatório")
  })

  it("rejeita e-mail vazio", () => {
    const result = schema.safeParse({ ...dadosValidos, email: "" })
    expect(result.success).toBe(false)
    const erro = result.error?.issues.find((i) => i.path.includes("email"))
    expect(erro?.message).toBeDefined()
  })

  it("rejeita e-mail com formato inválido", () => {
    const result = schema.safeParse({ ...dadosValidos, email: "nao-e-um-email" })
    expect(result.success).toBe(false)
    const erro = result.error?.issues.find((i) => i.path.includes("email"))
    expect(erro?.message).toBe("E-mail inválido")
  })

  it("rejeita senha vazia", () => {
    const result = schema.safeParse({ ...dadosValidos, senha: "" })
    expect(result.success).toBe(false)
    const erro = result.error?.issues.find((i) => i.path.includes("senha"))
    expect(erro?.message).toBeDefined()
  })

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = schema.safeParse({ ...dadosValidos, senha: "abc123" })
    expect(result.success).toBe(false)
    const erro = result.error?.issues.find((i) => i.path.includes("senha"))
    expect(erro?.message).toBe("Senha deve ter pelo menos 8 caracteres")
  })

  it("rejeita quando confirmação de senha não coincide com senha", () => {
    const result = schema.safeParse({ ...dadosValidos, confirmarSenha: "outra-senha" })
    expect(result.success).toBe(false)
    const erro = result.error?.issues.find((i) => i.path.includes("confirmarSenha"))
    expect(erro?.message).toBe("As senhas não coincidem")
  })
})
