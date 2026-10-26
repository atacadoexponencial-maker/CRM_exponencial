import { listarMensagensRapidas } from "./actions"
import { MensagensRapidasClient } from "./mensagens-rapidas-client"
import { listarCamposDaEmpresa } from "../../contatos/campos-personalizados"
import { VARIAVEIS_DA_MENSAGEM } from "../automacoes/components/variaveis-mensagem"
import { chaveDaVariavel } from "@/lib/variaveis-mensagem"

export const metadata = { title: "Mensagens rápidas" }

export default async function MensagensRapidasPage() {
  // B38-05: as variáveis que o envio pela automação preenche, com os campos da empresa
  const [mensagens, campos] = await Promise.all([listarMensagensRapidas(), listarCamposDaEmpresa()])
  const variaveis = [...VARIAVEIS_DA_MENSAGEM, ...campos.map((c) => ({ chave: chaveDaVariavel(c.nome), rotulo: c.nome }))]

  return <MensagensRapidasClient mensagensIniciais={mensagens} variaveis={variaveis} />
}
