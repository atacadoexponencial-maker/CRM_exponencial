"use client"

// Protótipo da B11-01: a lista e o editor novos, com dados fixos e em memória.
// Salvar e simular são falsos; a B11-05 troca por actions do servidor e apaga
// esta pasta.

import { useState } from "react"
import Link from "next/link"
import { EditorFluxo, type RegraEditada } from "../components/editor-fluxo"
import { ListaRegras } from "../components/lista-regras"
import { CONTATOS_TESTE, OPCOES_EXEMPLO, REGRAS_EXEMPLO, simularExemplo, type RegraExemplo } from "./dados-exemplo"

function regraNova(id: string): RegraExemplo {
  return {
    id,
    nome: "",
    ativa: false,
    repeticao: { modo: "uma_vez_por_contato" },
    execucoes7dias: 0,
    ultimaExecucao: null,
    fluxo: {
      blocos: [{ id: crypto.randomUUID(), tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao: { x: 0, y: 0 } }],
      ligacoes: [],
    },
  }
}

export function PrototipoClient({ vazio }: { vazio: boolean }) {
  const [regras, setRegras] = useState<RegraExemplo[]>(vazio ? [] : REGRAS_EXEMPLO)
  const [editando, setEditando] = useState<RegraExemplo | null>(null)

  function duplicar(id: string) {
    setRegras((atuais) => {
      const i = atuais.findIndex((r) => r.id === id)
      if (i < 0) return atuais
      const copia: RegraExemplo = {
        ...atuais[i],
        id: crypto.randomUUID(),
        nome: `${atuais[i].nome} (cópia)`,
        ativa: false,
        execucoes7dias: 0,
        ultimaExecucao: null,
      }
      return [...atuais.slice(0, i + 1), copia, ...atuais.slice(i + 1)]
    })
  }

  async function salvar(regra: RegraEditada) {
    if (!editando) return {}
    const salva: RegraExemplo = { ...editando, ...regra }
    setRegras((atuais) =>
      atuais.some((r) => r.id === salva.id) ? atuais.map((r) => (r.id === salva.id ? salva : r)) : [...atuais, salva]
    )
    return { aviso: "Protótipo: a mudança vale só nesta tela. Nada foi gravado." }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm text-amber-200">
        <strong>Protótipo (B11-01):</strong> dados de exemplo, nada é gravado.{" "}
        {vazio ? (
          <Link href="?" className="underline">
            Ver com regras
          </Link>
        ) : (
          <Link href="?vazio=1" className="underline">
            Ver a lista vazia
          </Link>
        )}
      </div>

      {editando ? (
        <EditorFluxo
          key={editando.id}
          regraInicial={editando}
          opcoes={OPCOES_EXEMPLO}
          contatosTeste={CONTATOS_TESTE}
          salvar={salvar}
          simular={simularExemplo}
          onVoltar={() => setEditando(null)}
        />
      ) : (
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
          <ListaRegras
            regras={regras}
            opcoes={OPCOES_EXEMPLO}
            historicoDisponivel={false}
            onNova={() => setEditando(regraNova(crypto.randomUUID()))}
            onEditar={(id) => setEditando(regras.find((r) => r.id === id) ?? null)}
            onAlternar={(id, ativa) => setRegras((atuais) => atuais.map((r) => (r.id === id ? { ...r, ativa } : r)))}
            onDuplicar={duplicar}
            onVerHistorico={() => {}}
            onExcluir={async (id) => {
              setRegras((atuais) => atuais.filter((r) => r.id !== id))
              return {}
            }}
          />
        </div>
      )}
    </div>
  )
}
