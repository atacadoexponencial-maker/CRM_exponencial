// Protótipo B13-01: dados fixos da lixeira e das variações do diálogo de
// exclusão. Sai do repositório na B13-04.

import type { ItemLixeira } from "../components/lista-lixeira"
import type { FunilDoCard } from "../../components/dialogo-excluir-contato"

export const ITENS_EXEMPLO: ItemLixeira[] = [
  {
    id: "1",
    nome: "Teste Cliente",
    telefone: "+55 21 9999-9999",
    funis: ["entrada"],
    excluidoPor: "Marcelle",
    excluidoEm: "02/10/2026 15:10",
    diasRestantes: 30,
  },
  {
    id: "2",
    nome: "Distribuidora de Alimentos e Bebidas Boa Vista Ltda",
    telefone: "+55 85 99111-0102",
    funis: ["entrada", "recompra"],
    excluidoPor: "Carlos",
    excluidoEm: "20/09/2026 09:42",
    diasRestantes: 18,
  },
  {
    id: "3",
    nome: null,
    telefone: "+55 11 98888-7777",
    funis: [],
    excluidoPor: "Ana",
    excluidoEm: "03/09/2026 17:05",
    diasRestantes: 1,
  },
  {
    id: "4",
    nome: "Mercearia Boa Fé",
    telefone: "+55 21 89001-0009",
    funis: ["recompra"],
    excluidoPor: "Marcelle",
    excluidoEm: "02/09/2026 11:20",
    diasRestantes: 0,
  },
]

export interface VariacaoDialogo {
  id: string
  rotulo: string
  nome: string | null
  telefone: string
  funis: FunilDoCard[]
  funilDeOrigem?: FunilDoCard
  conversas: number
  mensagens: number
  erro?: string
}

export const VARIACOES_DIALOGO: VariacaoDialogo[] = [
  {
    id: "um-card",
    rotulo: "Só um card",
    nome: "Teste Cliente",
    telefone: "+55 21 9999-9999",
    funis: ["entrada"],
    funilDeOrigem: "entrada",
    conversas: 0,
    mensagens: 0,
  },
  {
    id: "dois-cards",
    rotulo: "Dois cards",
    nome: "Mercearia Boa Fé",
    telefone: "+55 21 89001-0009",
    funis: ["entrada", "recompra"],
    funilDeOrigem: "entrada",
    conversas: 1,
    mensagens: 6,
  },
  {
    id: "conversas",
    rotulo: "Com conversas",
    nome: "Empório São Jorge",
    telefone: "+55 41 88012-2345",
    funis: ["recompra"],
    funilDeOrigem: "recompra",
    conversas: 3,
    mensagens: 48,
  },
  {
    id: "erro",
    rotulo: "Erro ao excluir",
    nome: "Teste Cliente",
    telefone: "+55 21 9999-9999",
    funis: ["entrada"],
    funilDeOrigem: "entrada",
    conversas: 0,
    mensagens: 0,
    erro: "Não foi possível excluir. Tente de novo.",
  },
]
