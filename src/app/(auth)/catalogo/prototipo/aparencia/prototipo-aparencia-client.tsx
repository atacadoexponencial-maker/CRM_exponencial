"use client"

// Protótipo da B16-02: a tela de Aparência com o tema e os produtos de exemplo. Logo e
// banner ficam só no aparelho e salvar não grava nada. A B16-08 troca por actions do
// servidor e apaga esta pasta.

import { AbasCatalogo } from "../../components/abas-catalogo"
import { EditorAparencia } from "../../components/editor-aparencia"
import type { ProdutoVitrine } from "@/app/loja/components/vitrine"
import { CATEGORIAS_EXEMPLO, CONFIG_EXEMPLO, PRODUTOS_EXEMPLO, TEMA_EXEMPLO } from "../dados-exemplo"
import { FaixaPrototipo, HREFS_PROTOTIPO, estoqueTotal } from "../compartilhado"

const PRODUTOS_VITRINE: ProdutoVitrine[] = PRODUTOS_EXEMPLO.filter((p) => p.visivel).map((p) => ({
  id: p.id ?? "",
  nome: p.nome,
  descricao: p.descricao,
  preco: p.preco ?? 0,
  precoDe: p.precoDe,
  fotoUrl: p.fotos[0]?.url ?? null,
  categoriaId: p.categoriaId,
  destaque: p.destaque,
  esgotado: estoqueTotal(p) === 0,
}))

const AVISO_MINIMO = CONFIG_EXEMPLO.minimo.tipo === "pecas" ? `Pedido mínimo: ${CONFIG_EXEMPLO.minimo.valor} peças` : null

export function PrototipoAparenciaClient() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FaixaPrototipo>Logo e banner escolhidos ficam só neste aparelho.</FaixaPrototipo>
      <div className="max-w-7xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Catálogo</h1>
        <AbasCatalogo ativa="aparencia" hrefs={HREFS_PROTOTIPO} />
        <EditorAparencia
          inicial={TEMA_EXEMPLO}
          categorias={CATEGORIAS_EXEMPLO}
          produtos={PRODUTOS_VITRINE}
          avisoMinimo={AVISO_MINIMO}
          onEnviarImagem={async (_tipo, arquivo) => URL.createObjectURL(arquivo)}
          onSalvar={async () => ({ aviso: "Salvo no protótipo: na versão real, a loja passaria a abrir assim." })}
        />
      </div>
    </div>
  )
}
