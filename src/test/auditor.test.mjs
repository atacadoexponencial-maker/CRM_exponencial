// Testes do auditor do fluxo com prova (F1-02).
// Cada teste monta um projeto de mentira numa pasta temporária e audita a issue
// com o resultado dos testes injetado, sem rodar o Vitest de dentro do Vitest.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CONFIG_PADRAO,
  SAIDA,
  auditarIssue,
  codigosNosTestes,
  confirmarManual,
  executarSerie,
  listarAbertas,
  resultadosDoJson,
} from '../../.claude/skills/auditor/scripts/auditor.mjs'

const cfg = { ...CONFIG_PADRAO, aprovadores: ['Marcelle', 'Luan'] }

const SPEC = `# Spec: Exemplo

> série: EX1
> estado: aprovada

### Novo contato

#### CA-EX1-01 — Aviso aparece · prova: automática

- **Dado** x
- **Quando** y
- **Então** z

#### CA-EX1-02 — Salvar é recusado · prova: automática

- **Dado** x
- **Quando** y
- **Então** z

#### CA-EX1-03 — Link abre o contato · prova: manual

- **Dado** x
- **Quando** y
- **Então** z

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
`

const ISSUE = `# EX1-01: Aviso de número repetido

**Tipo:** Implementação

## Critérios de aceite

- **CA-EX1-01** (automática) — Aviso aparece. Dado x, quando y, então z.
- **CA-EX1-02** (automática) — Salvar é recusado. Dado x, quando y, então z.
- **CA-EX1-03** (manual) — Link abre o contato. Dado x, quando y, então z.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-EX1-01 | Lixeira não conta. | confirmada | Marcelle, 10/10/2026 |

## Perguntas em aberto

Nenhuma.

### Roteiro manual — CA-EX1-03
1. Clicar no nome do contato.
2. O perfil abre em outra aba.
`

const TESTE = `import { it } from 'vitest'
it('CA-EX1-01: avisa quando o telefone já existe', () => {})
it('CA-EX1-02: recusa salvar número repetido', () => {})
`

let raiz
let caminhoIssue

function escrever(relativo, conteudo) {
  const arquivo = path.join(raiz, relativo)
  fs.mkdirSync(path.dirname(arquivo), { recursive: true })
  fs.writeFileSync(arquivo, conteudo)
  return arquivo
}

function auditar(resultados = { 'CA-EX1-01': ['passed'], 'CA-EX1-02': ['passed'] }) {
  return auditarIssue({
    raiz,
    cfg,
    caminho: caminhoIssue,
    testes: codigosNosTestes(raiz, cfg),
    resultados: resultados === null ? null : new Map(Object.entries(resultados)),
  })
}

function codigos(relatorio) {
  return relatorio.problemas.map((p) => `${p.codigo}:${p.alvo}`)
}

beforeEach(() => {
  raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'auditor-teste-'))
  escrever('pre-desenvolvimento/spec-exemplo.md', SPEC)
  caminhoIssue = escrever('pre-desenvolvimento/issues/EX1-01-aviso.md', ISSUE)
  escrever('src/test/exemplo.test.ts', TESTE)
})

afterEach(() => {
  fs.rmSync(raiz, { recursive: true, force: true })
})

describe('auditor — prova dos critérios', () => {
  it('should dizer "alinhada com teste manual pendente" quando só falta o teste manual', () => {
    const rel = auditar()
    expect(rel.veredito).toBe('alinhada com teste manual pendente')
    expect(rel.saida).toBe(SAIDA.MANUAL_PENDENTE)
    expect(codigos(rel)).toEqual(['TESTE_MANUAL_PENDENTE:CA-EX1-03'])
    expect(rel.manuaisPendentes[0].roteiro).toContain('O perfil abre em outra aba.')
  })

  it('should dizer "alinhada" depois de o teste manual ser confirmado', () => {
    expect(confirmarManual(caminhoIssue, 'CA-EX1-03', 'Marcelle', '12/10/2026')).toBeNull()
    const rel = auditar()
    expect(rel.veredito).toBe('alinhada')
    expect(rel.saida).toBe(SAIDA.ALINHADA)
    expect(fs.readFileSync(caminhoIssue, 'utf8')).toContain('| CA-EX1-03 | Marcelle | 12/10/2026 |')
  })

  it('should acusar critério sem teste quando o código sai do nome do teste', () => {
    escrever('src/test/exemplo.test.ts', TESTE.replace('CA-EX1-02: ', ''))
    const rel = auditar({ 'CA-EX1-01': ['passed'] })
    expect(codigos(rel)).toContain('CRITERIO_SEM_TESTE:CA-EX1-02')
    expect(rel.saida).toBe(SAIDA.NAO_ALINHADA)
  })

  it('should not contar código que está só no describe', () => {
    escrever('src/test/exemplo.test.ts', `describe('CA-EX1-01 e CA-EX1-02', () => { it('funciona', () => {}) })`)
    expect(codigos(auditar({}))).toEqual(
      expect.arrayContaining(['CRITERIO_SEM_TESTE:CA-EX1-01', 'CRITERIO_SEM_TESTE:CA-EX1-02'])
    )
  })

  it('should acusar critério sem prova quando o teste está pulado', () => {
    escrever('src/test/exemplo.test.ts', TESTE.replace("it('CA-EX1-02", "it.skip('CA-EX1-02"))
    expect(codigos(auditar())).toContain('CRITERIO_SEM_PROVA:CA-EX1-02')
  })

  it('should acusar critério sem prova quando o teste falha, foi pulado na execução ou não rodou', () => {
    expect(codigos(auditar({ 'CA-EX1-01': ['passed'], 'CA-EX1-02': ['failed'] }))).toContain(
      'CRITERIO_SEM_PROVA:CA-EX1-02'
    )
    expect(codigos(auditar({ 'CA-EX1-01': ['passed', 'skipped'], 'CA-EX1-02': ['passed'] }))).toContain(
      'CRITERIO_SEM_PROVA:CA-EX1-01'
    )
    expect(codigos(auditar({ 'CA-EX1-01': ['passed'] }))).toContain('CRITERIO_SEM_PROVA:CA-EX1-02')
  })

  it('should acusar teste órfão quando o código não existe na spec da série', () => {
    escrever('src/test/outro.test.ts', `it('CA-EX1-09: sobrou de uma spec antiga', () => {})`)
    const rel = auditar()
    expect(codigos(rel)).toContain('TESTE_ORFAO:CA-EX1-09')
    expect(rel.saida).toBe(SAIDA.NAO_ALINHADA)
  })

  it('should not acusar teste de outra série como órfão', () => {
    escrever('src/test/outro.test.ts', `it('CA-B99-01: de outra série', () => {})`)
    expect(codigos(auditar())).not.toContain('TESTE_ORFAO:CA-B99-01')
  })

  it('should dizer que os testes não foram rodados com --sem-rodar', () => {
    const rel = auditar(null)
    expect(rel.veredito).toBe('estrutura conferida, testes não rodados')
    expect(rel.saida).toBe(SAIDA.NAO_RODADO)
  })

  it('should ler o resultado do Vitest pelo código no nome do teste', () => {
    const mapa = resultadosDoJson({
      testResults: [
        {
          assertionResults: [
            { title: 'CA-EX1-01: avisa', status: 'passed' },
            { title: 'CA-EX1-02: recusa', status: 'failed' },
            { title: 'sem código', status: 'passed' },
          ],
        },
      ],
    })
    expect(mapa.get('CA-EX1-01')).toEqual(['passed'])
    expect(mapa.get('CA-EX1-02')).toEqual(['failed'])
    expect(mapa.size).toBe(2)
  })
})

describe('auditor — suposições, perguntas e seções', () => {
  it('should acusar suposição aberta e pergunta aberta', () => {
    escrever(
      'pre-desenvolvimento/issues/EX1-01-aviso.md',
      ISSUE.replace('| confirmada | Marcelle, 10/10/2026 |', '| aberta | — |').replace(
        '## Perguntas em aberto\n\nNenhuma.',
        '## Perguntas em aberto\n\n| ID | Pergunta | Status | Resposta |\n|---|---|---|---|\n| PER-EX1-01 | Admin pode? | aberta | — |'
      )
    )
    const rel = auditar()
    expect(codigos(rel)).toEqual(expect.arrayContaining(['SUPOSICAO_ABERTA:SUP-EX1-01', 'PERGUNTA_ABERTA:PER-EX1-01']))
    expect(rel.saida).toBe(SAIDA.NAO_ALINHADA)
  })

  it('should tratar status desconhecido como aberto', () => {
    escrever('pre-desenvolvimento/issues/EX1-01-aviso.md', ISSUE.replace('| confirmada |', '| talvez |'))
    expect(codigos(auditar())).toContain('SUPOSICAO_ABERTA:SUP-EX1-01')
  })

  it('should acusar seção ausente quando falta Suposições ou Perguntas', () => {
    escrever('pre-desenvolvimento/issues/EX1-01-aviso.md', ISSUE.replace('## Perguntas em aberto\n\nNenhuma.\n', ''))
    const rel = auditar()
    expect(rel.problemas.find((p) => p.codigo === 'SECAO_AUSENTE').detalhe).toContain('Perguntas em aberto')
  })

  it('should listar as suposições abertas do projeto sem repetir a mesma', () => {
    escrever('pre-desenvolvimento/issues/EX1-01-aviso.md', ISSUE.replace('| confirmada | Marcelle, 10/10/2026 |', '| aberta | — |'))
    escrever(
      'pre-desenvolvimento/spec-exemplo.md',
      SPEC.replace(
        '## Suposições\n\nNenhuma.',
        '## Suposições\n\n| ID | Suposição | Status | Resolução |\n|---|---|---|---|\n| SUP-EX1-01 | Lixeira não conta. | aberta | — |'
      )
    )
    expect(listarAbertas(raiz, cfg).map((a) => a.alvo)).toEqual(['SUP-EX1-01'])
  })
})

describe('auditor — formato antigo, exceções e série', () => {
  it('should avisar formato antigo e não travar', () => {
    escrever('pre-desenvolvimento/issues/EX1-01-aviso.md', '# EX1-01: antiga\n\n## Cenários\n\n## Checklist\n- [ ] x\n')
    const rel = auditar()
    expect(rel.veredito).toBe('formato antigo')
    expect(rel.saida).toBe(SAIDA.ALINHADA)
    expect(rel.problemas[0].trava).toBe(false)
  })

  it('should aceitar exceção completa e mostrá-la no relatório', () => {
    escrever(
      'pre-desenvolvimento/issues/EX1-01-aviso.md',
      `${ISSUE}\n## Exceções\n\n| Problema | Alvo | Motivo | Aprovado por | Dia |\n|---|---|---|---|---|\n| CRITERIO_SEM_PROVA | CA-EX1-02 | Chip fora do ar | Luan | 12/10/2026 |\n`
    )
    const rel = auditar({ 'CA-EX1-01': ['passed'], 'CA-EX1-02': ['failed'] })
    expect(codigos(rel)).not.toContain('CRITERIO_SEM_PROVA:CA-EX1-02')
    expect(rel.excecoes).toEqual([expect.objectContaining({ alvo: 'CA-EX1-02', por: 'Luan', usada: true })])
    expect(rel.saida).toBe(SAIDA.MANUAL_PENDENTE)
  })

  it('should recusar exceção sem motivo, sem data ou de quem não pode aprovar', () => {
    const cabecalho = '\n## Exceções\n\n| Problema | Alvo | Motivo | Aprovado por | Dia |\n|---|---|---|---|---|\n'
    for (const linha of [
      '| CRITERIO_SEM_PROVA | CA-EX1-02 | — | Marcelle | 12/10/2026 |',
      '| CRITERIO_SEM_PROVA | CA-EX1-02 | Chip fora do ar | Marcelle | — |',
      '| CRITERIO_SEM_PROVA | CA-EX1-02 | Chip fora do ar | Fulano | 12/10/2026 |',
    ]) {
      escrever('pre-desenvolvimento/issues/EX1-01-aviso.md', `${ISSUE}${cabecalho}${linha}\n`)
      const rel = auditar({ 'CA-EX1-01': ['passed'], 'CA-EX1-02': ['failed'] })
      expect(codigos(rel)).toEqual(expect.arrayContaining(['EXCECAO_INVALIDA:CA-EX1-02', 'CRITERIO_SEM_PROVA:CA-EX1-02']))
    }
  })

  it('should recusar confirmar teste manual de critério automático ou de outra issue', () => {
    expect(confirmarManual(caminhoIssue, 'CA-EX1-01', 'Marcelle')).toContain('prova automática')
    expect(confirmarManual(caminhoIssue, 'CA-EX1-77', 'Marcelle')).toContain('não é um critério desta issue')
    expect(confirmarManual(caminhoIssue, 'CA-EX1-03', undefined)).toContain('--por')
  })

  it('should acusar na série o critério que nenhuma issue entrega e o que está em duas', () => {
    escrever('pre-desenvolvimento/spec-exemplo.md', SPEC.replace('## Suposições', '#### CA-EX1-04 — Sobrou · prova: manual\n\n## Suposições'))
    escrever(
      'pre-desenvolvimento/issues/concluidas_EX1/EX1-02-outra.md',
      '# EX1-02: outra\n\n## Critérios de aceite\n\n- **CA-EX1-03** (manual) — Link abre o contato.\n\n## Suposições\n\nNenhuma.\n\n## Perguntas em aberto\n\nNenhuma.\n'
    )
    const rel = executarSerie(raiz, cfg, 'ex1', { semRodar: true })
    expect(rel.issues).toHaveLength(2)
    expect(rel.problemas.map((p) => `${p.codigo}:${p.alvo}`)).toEqual(
      expect.arrayContaining(['CRITERIO_FORA_DE_ISSUE:CA-EX1-04', 'CRITERIO_EM_DUAS_ISSUES:CA-EX1-03'])
    )
    expect(rel.saida).toBe(SAIDA.NAO_ALINHADA)
  })
})
