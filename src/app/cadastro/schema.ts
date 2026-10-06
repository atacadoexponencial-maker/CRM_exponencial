import { z } from "zod"

export const schema = z.object({
  nomeEmpresa: z.string().min(1, "Nome da empresa é obrigatório"),
  nomeResponsavel: z.string().min(1, "Nome do responsável é obrigatório"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmarSenha: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
})

export type DadosCadastro = z.infer<typeof schema>
