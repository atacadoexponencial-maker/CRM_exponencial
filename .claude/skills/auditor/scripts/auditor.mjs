// Auditor do fluxo com prova.
//
// Confere, sem julgamento do agente, se uma issue (ou uma série inteira) está
// alinhada: cada critério de aceite automático tem teste com o código dele e o
// teste passou; suposições e perguntas estão fechadas; as seções obrigatórias
// existem. Roda sempre a partir da RAIZ do projeto:
//
//   node .claude/skills/auditor/scripts/auditor.mjs issue <id|caminho> [--sem-rodar] [--json]
//   node .claude/skills/auditor/scripts/auditor.mjs serie <série> [--sem-rodar] [--json]
//   node .claude/skills/auditor/scripts/auditor.mjs suposicoes
//   node .claude/skills/auditor/scripts/auditor.mjs confirmar <id> <CA-...> --por <nome> [--dia dd/mm/aaaa]
//   node .claude/skills/auditor/scripts/auditor.mjs regras
//   node .claude/skills/auditor/scripts/auditor.mjs licao listar | adicionar | recorreu | remover
//
// Sem dependências: só o Node do ambiente.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const CONFIG_PADRAO = {
  pastaIssues: 'pre-desenvolvimento/issues',
  pastaSpecs: 'pre-desenvolvimento',
  pastaSpecsArquivadas: 'docs/specs-arquivadas',
  pastasTestes: ['src/test'],
  sufixosTeste: ['.test.ts', '.test.tsx', '.test.js', '.test.mjs'],
  comandoTeste: 'npx vitest run {arquivos} --reporter=json --outputFile={saida}',
  // Quem pode aprovar exceção. Lista vazia = qualquer nome preenchido.
  aprovadores: [],
  // Arquivos que nunca contam como "fora da issue" (documentos do próprio fluxo).
  foraDoEscopo: ['pre-desenvolvimento/**'],
  arquivoLicoes: 'pre-desenvolvimento/licoes.md',
}

export const SAIDA = { ALINHADA: 0, NAO_ALINHADA: 1, USO: 2, MANUAL_PENDENTE: 10, NAO_RODADO: 11 }

const NOMES = {
  CRITERIO_SEM_TESTE: 'critério sem teste',
  CRITERIO_SEM_PROVA: 'critério sem prova',
  TESTE_ORFAO: 'teste órfão',
  CRITERIO_FORA_DE_ISSUE: 'critério fora de issue',
  CRITERIO_EM_DUAS_ISSUES: 'critério em duas issues',
  CRITERIO_FORA_DA_SPEC: 'critério fora da spec',
  SUPOSICAO_ABERTA: 'suposição aberta',
  PERGUNTA_ABERTA: 'pergunta aberta',
  SECAO_AUSENTE: 'seção ausente',
  SPEC_NAO_ENCONTRADA: 'spec não encontrada',
  EXCECAO_INVALIDA: 'exceção inválida',
  TESTE_MANUAL_PENDENTE: 'teste manual pendente',
  FORMATO_ANTIGO: 'issue no formato antigo',
  PROVA_NAO_CONFERIDA: 'prova não conferida',
  ARQUIVO_FORA_DA_ISSUE: 'arquivo fora da issue',
  ARQUIVO_NAO_TOCADO: 'arquivo não tocado',
  CHECKLIST_INCOMPLETO: 'checklist incompleto',
  REGRA_VIOLADA: 'regra violada',
  REGRA_DESLIGADA_SEM_MOTIVO: 'regra desligada sem motivo',
  REGRA_SEM_ARQUIVOS: 'regra que não confere nenhum arquivo',
  ESCOPO_NAO_CONFERIDO: 'escopo não conferido',
}

const RE_CODIGO_CA = /CA-[A-Z0-9]+-\d+/g
const RE_DIA = /^\d{2}\/\d{2}\/\d{4}$/

// ---------------------------------------------------------------- leitura

function ler(arquivo) {
  return fs.readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n')
}

function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function pastaDestaSkill() {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
}

// Onde procurar um arquivo de configuração, do mais geral ao mais específico:
// a skill onde este script mora (pode ser a da pasta pessoal), a skill
// versionada no projeto e o `.claude/` do projeto. O mais específico vence.
function arquivosDeConfig(raiz, pastaDaSkill, nomeNaSkill, nomeNoProjeto) {
  const candidatos = [
    path.join(pastaDaSkill, nomeNaSkill),
    path.join(raiz, '.claude', 'skills', 'auditor', nomeNaSkill),
    path.join(raiz, '.claude', nomeNoProjeto),
  ].map((a) => path.resolve(a))
  return [...new Set(candidatos)].filter((a) => fs.existsSync(a))
}

export function carregarConfig(raiz, pastaDaSkill = pastaDestaSkill()) {
  return arquivosDeConfig(raiz, pastaDaSkill, 'auditor.json', 'auditor.json').reduce(
    (cfg, arquivo) => ({ ...cfg, ...JSON.parse(ler(arquivo)) }),
    { ...CONFIG_PADRAO }
  )
}

// Conteúdo de uma seção `## Título`, até a próxima `## `. null se não existe.
export function secao(texto, titulo) {
  const linhas = texto.split('\n')
  const alvo = semAcento(titulo)
  const inicio = linhas.findIndex((l) => /^##\s+/.test(l) && semAcento(l.replace(/^##\s+/, '')) === alvo)
  if (inicio === -1) return null
  let fim = linhas.findIndex((l, i) => i > inicio && /^##\s+/.test(l))
  if (fim === -1) fim = linhas.length
  return linhas.slice(inicio + 1, fim).join('\n')
}

// Linhas de dados de uma tabela markdown (sem cabeçalho nem separador).
export function linhasDaTabela(texto) {
  if (!texto) return []
  const linhas = texto.split('\n').filter((l) => l.trim().startsWith('|'))
  return linhas
    .slice(1)
    .filter((l) => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
    .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()))
}

function vazio(celula) {
  return !celula || celula === '—' || celula === '-'
}

export function serieDoCodigo(codigo) {
  const m = /^[A-Z]+-([A-Z0-9]+)-\d+$/.exec(codigo)
  return m ? m[1] : null
}

function serieDaIssue(caminho) {
  const m = /^([A-Za-z]+\d+)-\d+/.exec(path.basename(caminho))
  return m ? m[1].toUpperCase() : null
}

// Apaga o conteúdo dos blocos de código (``` ... ```), mantendo as linhas. Um
// exemplo de formato dentro de um bloco não é critério nem suposição de verdade.
export function semBlocosDeCodigo(texto) {
  let dentro = false
  return texto
    .split('
')
    .map((linha) => {
      const cerca = /^s*(```|~~~)/.test(linha)
      if (cerca) dentro = !dentro
      return cerca || dentro ? '' : linha
    })
    .join('
')
}

export function lerIssue(caminho) {
  const bruto = ler(caminho)
  const texto = semBlocosDeCodigo(bruto)
  const titulo = (/^#\s+(.+)$/m.exec(texto) || [])[1] || path.basename(caminho)
  const secCriterios = secao(texto, 'Critérios de aceite')
  const criterios = []
  if (secCriterios !== null) {
    const re = /^- \*\*(CA-[A-Z0-9]+-\d+)\*\*\s*\(([^)]+)\)\s*(?:—|-)?\s*(.*)$/gm
    let m
    while ((m = re.exec(secCriterios))) {
      criterios.push({ codigo: m[1], prova: semAcento(m[2]) === 'manual' ? 'manual' : 'automatica', texto: m[3] })
    }
  }
  const roteiros = {}
  const reRoteiro = /^###\s+Roteiro manual\s*(?:—|-)\s*(CA-[A-Z0-9]+-\d+)\s*\n([\s\S]*?)(?=\n#{2,3}\s|(?![\s\S]))/gm
  let r
  while ((r = reRoteiro.exec(texto))) roteiros[r[1]] = r[2].trim()

  return {
    caminho,
    texto: bruto,
    titulo,
    serie: serieDaIssue(caminho),
    formatoAntigo: secCriterios === null,
    criterios,
    roteiros,
    suposicoes: registros(secao(texto, 'Suposições'), 'SUP'),
    perguntas: registros(secao(texto, 'Perguntas em aberto'), 'PER'),
    temSuposicoes: secao(texto, 'Suposições') !== null,
    temPerguntas: secao(texto, 'Perguntas em aberto') !== null,
    // null = a issue ainda não passou pelo /plan (sem a seção Arquivos).
    arquivos:
      secao(texto, 'Arquivos') === null
        ? null
        : [...secao(texto, 'Arquivos').matchAll(/^- \*\*[^*]+:\*\*\s*`([^`]+)`/gm)].map((m) => m[1]),
    checklistAbertos: [...(secao(texto, 'Checklist') || '').matchAll(/^- \[ \]\s*(.+)$/gm)].map((m) => m[1]),
    manuais: linhasDaTabela(secao(texto, 'Testes manuais')).map(([codigo, por, dia]) => ({ codigo, por, dia })),
    excecoes: linhasDaTabela(secao(texto, 'Exceções')).map(([problema, alvo, motivo, por, dia]) => ({
      problema,
      alvo,
      motivo,
      por,
      dia,
    })),
  }
}

function registros(sec, prefixo) {
  return linhasDaTabela(sec)
    .filter(([id]) => id && id.startsWith(`${prefixo}-`))
    .map(([id, texto, status, resolucao]) => ({ id, texto, status: semAcento(status || ''), resolucao }))
}

export function lerSpec(caminho) {
  const texto = semBlocosDeCodigo(ler(caminho))
  const criterios = []
  const re = /^#{3,5}\s+(CA-[A-Z0-9]+-\d+)\b(.*)$/gm
  let m
  while ((m = re.exec(texto))) {
    const prova = /prova:\s*manual/i.test(m[2]) ? 'manual' : 'automatica'
    criterios.push({ codigo: m[1], prova })
  }
  return {
    caminho,
    serie: ((/^>\s*s[ée]rie:\s*([A-Za-z0-9]+)/m.exec(texto) || [])[1] || '').toUpperCase() || null,
    criterios,
    suposicoes: registros(secao(texto, 'Suposições'), 'SUP'),
    perguntas: registros(secao(texto, 'Perguntas em aberto'), 'PER'),
    temSuposicoes: secao(texto, 'Suposições') !== null,
    temPerguntas: secao(texto, 'Perguntas em aberto') !== null,
  }
}

function arquivosMd(pasta) {
  if (!fs.existsSync(pasta)) return []
  return fs
    .readdirSync(pasta, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(pasta, e.name))
}

// Spec da série: em andamento ou já arquivada.
export function acharSpec(raiz, cfg, serie) {
  const pastas = [cfg.pastaSpecs, cfg.pastaSpecsArquivadas].map((p) => path.join(raiz, p))
  for (const pasta of pastas) {
    for (const arquivo of arquivosMd(pasta)) {
      if (!path.basename(arquivo).startsWith('spec')) continue
      const spec = lerSpec(arquivo)
      if (spec.serie === serie) return spec
    }
  }
  return null
}

// Issues abertas (soltas na pasta) e, se pedido, as das subpastas de concluídas.
export function listarIssues(raiz, cfg, { comConcluidas = false } = {}) {
  const pasta = path.join(raiz, cfg.pastaIssues)
  const soltas = arquivosMd(pasta).filter((a) => path.basename(a) !== 'README.md')
  if (!comConcluidas || !fs.existsSync(pasta)) return soltas
  const subpastas = fs.readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory())
  return soltas.concat(subpastas.flatMap((s) => arquivosMd(path.join(pasta, s.name))))
}

export function acharIssue(raiz, cfg, idOuCaminho) {
  const direto = path.resolve(raiz, idOuCaminho)
  if (idOuCaminho.endsWith('.md') && fs.existsSync(direto)) return direto
  const prefixo = `${idOuCaminho.toUpperCase()}-`
  return (
    listarIssues(raiz, cfg, { comConcluidas: true }).find((a) =>
      path.basename(a).toUpperCase().startsWith(prefixo)
    ) || null
  )
}

// ------------------------------------------------------- códigos nos testes

function arquivosDeTeste(raiz, cfg) {
  const achados = []
  const andar = (pasta) => {
    if (!fs.existsSync(pasta)) return
    for (const e of fs.readdirSync(pasta, { withFileTypes: true })) {
      const caminho = path.join(pasta, e.name)
      if (e.isDirectory()) andar(caminho)
      else if (cfg.sufixosTeste.some((s) => e.name.endsWith(s))) achados.push(caminho)
    }
  }
  cfg.pastasTestes.forEach((p) => andar(path.join(raiz, p)))
  return achados
}

// Mapa código → [{ arquivo, linha, titulo, pulado }]. Só vale código no nome de
// um `it`/`test`; no `describe` não conta.
export function codigosNosTestes(raiz, cfg) {
  const mapa = new Map()
  const re = /\b(x?it|test)((?:\.\w+)*)\s*\(\s*(["'`])((?:\\.|(?!\3).)*)\3/g
  for (const arquivo of arquivosDeTeste(raiz, cfg)) {
    ler(arquivo)
      .split('\n')
      .forEach((linha, i) => {
        re.lastIndex = 0
        let m
        while ((m = re.exec(linha))) {
          const pulado = m[1] === 'xit' || /\.(skip|todo)\b/.test(m[2])
          for (const codigo of m[4].match(RE_CODIGO_CA) || []) {
            if (!mapa.has(codigo)) mapa.set(codigo, [])
            mapa.get(codigo).push({ arquivo: path.relative(raiz, arquivo).split(path.sep).join('/'), linha: i + 1, titulo: m[4], pulado })
          }
        }
      })
  }
  return mapa
}

// Resultado do Vitest (JSON) → mapa código → [status].
export function resultadosDoJson(json) {
  const mapa = new Map()
  for (const arquivo of json.testResults || []) {
    for (const caso of arquivo.assertionResults || []) {
      for (const codigo of new Set((caso.title || '').match(RE_CODIGO_CA) || [])) {
        if (!mapa.has(codigo)) mapa.set(codigo, [])
        mapa.get(codigo).push(caso.status)
      }
    }
  }
  return mapa
}

export function rodarTestes(raiz, cfg, arquivos) {
  if (arquivos.length === 0) return { resultados: new Map() }
  const saida = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'auditor-')), 'resultado.json')
  const comando = cfg.comandoTeste
    .replace('{arquivos}', arquivos.map((a) => `"${a.split(path.sep).join('/')}"`).join(' '))
    .replace('{saida}', `"${saida}"`)
  const proc = spawnSync(comando, { cwd: raiz, shell: true, encoding: 'utf8' })
  if (!fs.existsSync(saida)) {
    const fim = `${proc.stdout || ''}\n${proc.stderr || ''}`.trim().split('\n').slice(-15).join('\n')
    return { resultados: new Map(), erro: fim || 'o comando de teste não gerou resultado' }
  }
  return { resultados: resultadosDoJson(JSON.parse(ler(saida))) }
}

// ------------------------------------------------- escopo e regras por script

// Glob simples (`**`, `*`, `{a,b}`) → expressão regular.
export function globParaRegex(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*'
      i += glob[i + 2] === '/' ? 2 : 1
    } else if (c === '*') re += '[^/]*'
    else if (c === '{') re += '(?:'
    else if (c === '}') re += ')'
    else if (c === ',') re += '|'
    else re += c.replace(/[.+?^$()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

function casa(globs, arquivo) {
  return (globs || []).some((g) => globParaRegex(g).test(arquivo))
}

function git(raiz, args) {
  const proc = spawnSync('git', args, { cwd: raiz, encoding: 'utf8' })
  return proc.status === 0 ? proc.stdout : null
}

// O que mudou desde o último commit: [{ arquivo, estado: 'A' | 'M' | 'D', linhas }].
// `linhas` são as linhas acrescentadas (null = o arquivo inteiro é novo).
// Devolve null fora de um repositório git.
export function mudancasDoGit(raiz) {
  const status = git(raiz, ['status', '--porcelain=v1', '-uall'])
  if (status === null) return null
  return status
    .split('\n')
    .filter(Boolean)
    .map((linha) => {
      const xy = linha.slice(0, 2)
      const arquivo = linha.slice(3).split(' -> ').pop().replace(/^"|"$/g, '')
      const estado = xy.includes('D') ? 'D' : xy === '??' || xy.includes('A') ? 'A' : 'M'
      return { arquivo, estado, linhas: estado === 'M' ? linhasAcrescentadas(raiz, arquivo) : null }
    })
}

function linhasAcrescentadas(raiz, arquivo) {
  const diff = git(raiz, ['diff', '-U0', 'HEAD', '--', arquivo]) || ''
  const linhas = new Set()
  for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const inicio = Number(m[1])
    const quantas = m[2] === undefined ? 1 : Number(m[2])
    for (let i = 0; i < quantas; i++) linhas.add(inicio + i)
  }
  return linhas
}

// Regras por script, nos mesmos lugares da configuração. Regra com o mesmo
// `id` em um lugar mais específico substitui a mais geral.
export function carregarRegras(raiz, pastaDaSkill = pastaDestaSkill()) {
  const porId = new Map()
  for (const arquivo of arquivosDeConfig(raiz, pastaDaSkill, 'regras.json', 'auditor-regras.json')) {
    for (const regra of JSON.parse(ler(arquivo))) porId.set(regra.id, regra)
  }
  return [...porId.values()]
}

// Confere as regras nos arquivos mudados. Regra de conteúdo olha só as linhas
// acrescentadas; regra "intocavel" acusa arquivo modificado ou apagado.
export function conferirRegras({ raiz, regras, mudancas }) {
  const problemas = []
  const desligadas = []
  const mudados = mudancas.map((m) => m.arquivo)
  for (const regra of regras) {
    for (const m of mudancas) {
      if (!casa(regra.arquivos, m.arquivo) || casa(regra.excluir, m.arquivo)) continue
      const local = path.join(raiz, m.arquivo)
      const texto = m.estado !== 'D' && fs.existsSync(local) ? ler(local) : ''

      const desliga = new RegExp(`auditor-desligar\\s+${regra.id}\\b[ \\t]*:?[ \\t]*(.*)`).exec(texto)
      if (desliga) {
        const motivo = desliga[1].replace(/\*\/|-->/g, '').trim()
        if (motivo) desligadas.push({ regra: regra.id, arquivo: m.arquivo, motivo })
        else {
          problemas.push(
            problema(
              'REGRA_DESLIGADA_SEM_MOTIVO',
              m.arquivo,
              `a regra "${regra.nome}" foi desligada neste arquivo sem dizer por quê`,
              `escreva o motivo: auditor-desligar ${regra.id}: <motivo>`
            )
          )
        }
        continue
      }

      if (regra.tipo === 'intocavel') {
        if (m.estado === 'A') continue
        if (regra.salvoSeMudar && mudados.some((a) => casa(regra.salvoSeMudar, a))) continue
        problemas.push(
          problema('REGRA_VIOLADA', m.arquivo, `${regra.nome} (regra ${regra.id}; vem de: ${regra.origem})`, regra.oQueFazer)
        )
        continue
      }

      if (m.estado === 'D') continue
      if (regra.somenteSe && !new RegExp(regra.somenteSe, 'm').test(texto)) continue
      const padrao = new RegExp(regra.padrao)
      texto.split('\n').forEach((linha, i) => {
        if (m.linhas && !m.linhas.has(i + 1)) return
        if (!padrao.test(linha)) return
        problemas.push(
          problema(
            'REGRA_VIOLADA',
            m.arquivo,
            `linha ${i + 1}: ${regra.nome} (regra ${regra.id}; vem de: ${regra.origem})\n${linha.trim().slice(0, 160)}`,
            regra.oQueFazer
          )
        )
      })
    }
  }
  return { problemas, desligadas }
}

// Roda todas as regras no projeto inteiro, para ver o que cada uma acha hoje
// e avisar a que não confere nenhum arquivo.
export function conferirProjetoInteiro(raiz, regras) {
  const lista = git(raiz, ['ls-files'])
  const arquivos = (lista || '').split('\n').filter(Boolean)
  return regras.map((regra) => {
    const alvos = arquivos.filter((a) => casa(regra.arquivos, a) && !casa(regra.excluir, a))
    const mudancas = alvos.map((arquivo) => ({ arquivo, estado: 'A', linhas: null }))
    const { problemas, desligadas } =
      regra.tipo === 'intocavel' ? { problemas: [], desligadas: [] } : conferirRegras({ raiz, regras: [regra], mudancas })
    return { regra, arquivos: alvos.length, problemas, desligadas }
  })
}

function conferirEscopo({ issue, rel, cfg, mudancas, problemas }) {
  for (const item of issue.checklistAbertos) {
    problemas.push(problema('CHECKLIST_INCOMPLETO', rel, item, 'conclua o item e marque [x]'))
  }
  if (issue.arquivos === null) return
  const mexidos = (mudancas || []).filter((m) => m.arquivo !== rel && !casa(cfg.foraDoEscopo, m.arquivo))
  if (mexidos.length === 0) {
    problemas.push(
      problema(
        'ESCOPO_NAO_CONFERIDO',
        rel,
        'nada mudou desde o último commit; não dá para comparar com a seção Arquivos',
        'rode o auditor antes de commitar para conferir o escopo',
        false
      )
    )
    return
  }
  for (const m of mexidos) {
    if (issue.arquivos.includes(m.arquivo)) continue
    problemas.push(
      problema(
        'ARQUIVO_FORA_DA_ISSUE',
        m.arquivo,
        'foi mexido e não está na seção Arquivos da issue',
        'desfaça a mudança, ou pare e pergunte antes de incluir o arquivo na issue'
      )
    )
  }
  for (const declarado of issue.arquivos) {
    if (mexidos.some((m) => m.arquivo === declarado)) continue
    problemas.push(
      problema(
        'ARQUIVO_NAO_TOCADO',
        declarado,
        'está na seção Arquivos e não foi mexido',
        'implemente o que falta ou tire o arquivo da issue'
      )
    )
  }
}

// ---------------------------------------------------------------- auditoria

function problema(codigo, alvo, detalhe, oQueFazer, trava = true) {
  return { codigo, nome: NOMES[codigo], alvo, detalhe, oQueFazer, trava }
}

function registrosAbertos(dono, problemas) {
  for (const s of dono.suposicoes) {
    if (!['confirmada', 'invalidada'].includes(s.status)) {
      problemas.push(
        problema('SUPOSICAO_ABERTA', s.id, s.texto, 'confirme ou invalide com quem decide e atualize o status')
      )
    }
  }
  for (const p of dono.perguntas) {
    if (p.status !== 'respondida') {
      problemas.push(problema('PERGUNTA_ABERTA', p.id, p.texto, 'pergunte a quem decide e grave a resposta'))
    }
  }
}

function secoesAusentes(dono, onde, problemas) {
  if (!dono.temSuposicoes) {
    problemas.push(
      problema('SECAO_AUSENTE', onde, 'falta a seção Suposições', 'acrescente a seção; sem nenhuma, escreva "Nenhuma."')
    )
  }
  if (!dono.temPerguntas) {
    problemas.push(
      problema(
        'SECAO_AUSENTE',
        onde,
        'falta a seção Perguntas em aberto',
        'acrescente a seção; sem nenhuma, escreva "Nenhuma."'
      )
    )
  }
}

function validarExcecao(e, cfg) {
  if (!NOMES[e.problema]) return `"${e.problema}" não é um código de problema do auditor`
  if (vazio(e.alvo)) return 'falta o alvo (código do critério, da suposição ou o arquivo)'
  if (vazio(e.motivo)) return 'falta o motivo'
  if (vazio(e.por)) return 'falta quem aprovou'
  if (cfg.aprovadores.length && !cfg.aprovadores.some((a) => semAcento(a) === semAcento(e.por))) {
    return `"${e.por}" não pode aprovar exceção (só ${cfg.aprovadores.join(' ou ')})`
  }
  if (!RE_DIA.test(e.dia || '')) return 'falta o dia, no formato dd/mm/aaaa'
  return null
}

// Audita uma issue. `resultados` é o mapa código → [status] dos testes já
// rodados, ou null quando os testes não foram rodados.
// `mudancas` é o que mudou desde o último commit (veja mudancasDoGit); sem ele,
// escopo e regras não são conferidos.
export function auditarIssue({ raiz, cfg, caminho, testes, resultados, erroDosTestes, mudancas, regras = [] }) {
  const issue = lerIssue(caminho)
  const rel = path.relative(raiz, caminho).split(path.sep).join('/')
  const base = { issue: rel, titulo: issue.titulo, problemas: [], excecoes: [], manuaisPendentes: [], regrasDesligadas: [] }

  if (issue.formatoAntigo) {
    base.problemas.push(
      problema(
        'FORMATO_ANTIGO',
        rel,
        'a issue não tem a seção Critérios de aceite; a prova mecânica não se aplica',
        'revise do jeito antigo',
        false
      )
    )
    return { ...base, veredito: 'formato antigo', saida: SAIDA.ALINHADA }
  }

  const problemas = base.problemas
  secoesAusentes(issue, rel, problemas)
  registrosAbertos(issue, problemas)

  const spec = issue.serie ? acharSpec(raiz, cfg, issue.serie) : null
  const naSpec = new Set(spec ? spec.criterios.map((c) => c.codigo) : [])
  if (!spec) {
    problemas.push(
      problema(
        'SPEC_NAO_ENCONTRADA',
        issue.serie || rel,
        'nenhuma spec com esta série foi encontrada, em andamento ou arquivada',
        'confira a linha "> série:" no topo da spec'
      )
    )
  }

  let naoRodado = false
  for (const c of issue.criterios) {
    if (spec && !naSpec.has(c.codigo)) {
      problemas.push(
        problema(
          'CRITERIO_FORA_DA_SPEC',
          c.codigo,
          'o critério está na issue e não está na spec',
          'acrescente-o à spec ou tire-o da issue'
        )
      )
    }
    if (c.prova === 'manual') {
      const conf = issue.manuais.find((m) => m.codigo === c.codigo && !vazio(m.por) && RE_DIA.test(m.dia || ''))
      if (!conf) {
        problemas.push(
          problema(
            'TESTE_MANUAL_PENDENTE',
            c.codigo,
            c.texto,
            `faça o teste e registre com: confirmar ${path.basename(caminho).split('-').slice(0, 2).join('-')} ${c.codigo} --por <nome>`,
            false
          )
        )
        base.manuaisPendentes.push({ codigo: c.codigo, texto: c.texto, roteiro: issue.roteiros[c.codigo] || null })
      }
      continue
    }
    const marcados = testes.get(c.codigo) || []
    if (marcados.length === 0) {
      problemas.push(
        problema(
          'CRITERIO_SEM_TESTE',
          c.codigo,
          c.texto,
          `escreva um teste com "${c.codigo}" no nome do it/test`
        )
      )
      continue
    }
    const onde = marcados.map((t) => `${t.arquivo}:${t.linha}`).join(', ')
    if (marcados.some((t) => t.pulado)) {
      problemas.push(
        problema('CRITERIO_SEM_PROVA', c.codigo, `teste pulado em ${onde}`, 'teste pulado não é prova: tire o skip/todo')
      )
      continue
    }
    if (resultados === null) {
      naoRodado = true
      continue
    }
    const status = resultados.get(c.codigo) || []
    if (status.length === 0 || status.some((s) => s !== 'passed')) {
      const motivo = status.length === 0 ? 'o teste não rodou' : `resultado: ${[...new Set(status)].join(', ')}`
      problemas.push(
        problema('CRITERIO_SEM_PROVA', c.codigo, `${motivo} (${onde})`, 'faça o teste passar; não enfraqueça o teste')
      )
    }
  }

  // Teste com código desta série que não existe na spec.
  if (spec) {
    for (const [codigo, marcados] of testes) {
      if (serieDoCodigo(codigo) !== issue.serie || naSpec.has(codigo)) continue
      const onde = marcados.map((t) => `${t.arquivo}:${t.linha}`).join(', ')
      problemas.push(
        problema(
          'TESTE_ORFAO',
          codigo,
          `teste aponta para um critério que não existe na spec (${onde})`,
          'a spec mudou: atualize o código do teste ou remova o teste'
        )
      )
    }
  }

  if (erroDosTestes) {
    problemas.push(
      problema('CRITERIO_SEM_PROVA', rel, `o comando de teste falhou antes de dar resultado:\n${erroDosTestes}`, 'corrija a execução dos testes')
    )
  }
  if (naoRodado) {
    problemas.push(
      problema('PROVA_NAO_CONFERIDA', rel, 'os testes não foram rodados (--sem-rodar)', 'rode sem --sem-rodar', false)
    )
  }

  if (mudancas !== undefined) {
    conferirEscopo({ issue, rel, cfg, mudancas, problemas })
    const mexidos = (mudancas || []).filter((m) => !casa(cfg.foraDoEscopo, m.arquivo))
    const conferidas = conferirRegras({ raiz, regras, mudancas: mexidos })
    problemas.push(...conferidas.problemas)
    base.regrasDesligadas = conferidas.desligadas
  }

  // Exceções: inválida trava; válida tira o problema correspondente da conta.
  for (const e of issue.excecoes) {
    const erro = validarExcecao(e, cfg)
    if (erro) {
      problemas.push(problema('EXCECAO_INVALIDA', e.alvo || rel, erro, 'complete a linha da exceção ou remova-a'))
      continue
    }
    // Uma exceção cobre todas as ocorrências do problema naquele alvo.
    let usada = false
    for (let i = problemas.length - 1; i >= 0; i--) {
      if (problemas[i].codigo !== e.problema || problemas[i].alvo !== e.alvo) continue
      problemas.splice(i, 1)
      usada = true
    }
    if (usada && e.problema === 'TESTE_MANUAL_PENDENTE') {
      base.manuaisPendentes = base.manuaisPendentes.filter((m) => m.codigo !== e.alvo)
    }
    base.excecoes.push({ ...e, usada })
  }

  return { ...base, ...veredito(problemas, base.manuaisPendentes, naoRodado) }
}

function veredito(problemas, manuaisPendentes, naoRodado) {
  if (problemas.some((p) => p.trava)) return { veredito: 'não alinhada', saida: SAIDA.NAO_ALINHADA }
  if (naoRodado) return { veredito: 'estrutura conferida, testes não rodados', saida: SAIDA.NAO_RODADO }
  if (manuaisPendentes.length) {
    return { veredito: 'alinhada com teste manual pendente', saida: SAIDA.MANUAL_PENDENTE }
  }
  return { veredito: 'alinhada', saida: SAIDA.ALINHADA }
}

function arquivosDosCodigos(raiz, testes, codigos) {
  const arquivos = new Set()
  for (const codigo of codigos) {
    for (const t of testes.get(codigo) || []) arquivos.add(path.join(raiz, t.arquivo))
  }
  return [...arquivos]
}

export function executarIssue(raiz, cfg, caminho, { semRodar = false } = {}) {
  const issue = lerIssue(caminho)
  const testes = codigosNosTestes(raiz, cfg)
  const automaticos = issue.criterios.filter((c) => c.prova === 'automatica').map((c) => c.codigo)
  const execucao = semRodar
    ? { resultados: null }
    : rodarTestes(raiz, cfg, arquivosDosCodigos(raiz, testes, automaticos).map((a) => path.relative(raiz, a)))
  return auditarIssue({
    raiz,
    cfg,
    caminho,
    testes,
    resultados: execucao.resultados,
    erroDosTestes: execucao.erro,
    mudancas: mudancasDoGit(raiz),
    regras: carregarRegras(raiz),
  })
}

export function executarSerie(raiz, cfg, serie, { semRodar = false } = {}) {
  serie = serie.toUpperCase()
  const caminhos = listarIssues(raiz, cfg, { comConcluidas: true }).filter((a) => serieDaIssue(a) === serie)
  const testes = codigosNosTestes(raiz, cfg)
  const issues = caminhos.map(lerIssue)
  const automaticos = issues.flatMap((i) => i.criterios.filter((c) => c.prova === 'automatica').map((c) => c.codigo))
  const execucao = semRodar
    ? { resultados: null }
    : rodarTestes(raiz, cfg, arquivosDosCodigos(raiz, testes, automaticos).map((a) => path.relative(raiz, a)))

  const relatorios = caminhos.map((caminho) =>
    auditarIssue({ raiz, cfg, caminho, testes, resultados: execucao.resultados, erroDosTestes: execucao.erro })
  )

  const problemas = []
  const spec = acharSpec(raiz, cfg, serie)
  // Série inteira no formato antigo: a spec não tem a linha da série, e tudo bem.
  const serieAntiga = !spec && issues.length > 0 && issues.every((i) => i.formatoAntigo)
  if (serieAntiga) {
    return { serie, problemas, issues: relatorios, veredito: 'formato antigo', saida: SAIDA.ALINHADA }
  }
  if (!spec) {
    problemas.push(
      problema('SPEC_NAO_ENCONTRADA', serie, 'nenhuma spec com esta série foi encontrada', 'confira a linha "> série:" da spec')
    )
  } else {
    const relSpec = path.relative(raiz, spec.caminho).split(path.sep).join('/')
    secoesAusentes(spec, relSpec, problemas)
    registrosAbertos(spec, problemas)
    for (const c of spec.criterios) {
      const donas = issues.filter((i) => i.criterios.some((x) => x.codigo === c.codigo))
      if (donas.length === 0) {
        problemas.push(
          problema('CRITERIO_FORA_DE_ISSUE', c.codigo, 'nenhuma issue entrega este critério', 'inclua-o em uma issue')
        )
      } else if (donas.length > 1) {
        problemas.push(
          problema(
            'CRITERIO_EM_DUAS_ISSUES',
            c.codigo,
            `aparece em ${donas.map((d) => path.basename(d.caminho)).join(' e ')}`,
            'cada critério é entregue por uma única issue'
          )
        )
      }
    }
  }

  const todos = problemas.concat(relatorios.flatMap((r) => r.problemas))
  const pendentes = relatorios.flatMap((r) => r.manuaisPendentes)
  const naoRodado = relatorios.some((r) => r.saida === SAIDA.NAO_RODADO)
  return { serie, problemas, issues: relatorios, ...veredito(todos, pendentes, naoRodado) }
}

// Suposições e perguntas abertas das specs em andamento e das issues abertas.
export function listarAbertas(raiz, cfg) {
  const fontes = arquivosMd(path.join(raiz, cfg.pastaSpecs))
    .filter((a) => path.basename(a).startsWith('spec'))
    .map(lerSpec)
    .concat(listarIssues(raiz, cfg).map(lerIssue))
  const vistos = new Set()
  const abertas = []
  for (const fonte of fontes) {
    const problemas = []
    registrosAbertos(fonte, problemas)
    for (const p of problemas) {
      if (vistos.has(p.alvo)) continue
      vistos.add(p.alvo)
      abertas.push({ ...p, onde: path.relative(raiz, fonte.caminho).split(path.sep).join('/') })
    }
  }
  return abertas
}

function hoje() {
  const d = new Date()
  const dois = (n) => String(n).padStart(2, '0')
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`
}

// Grava a confirmação de um teste manual na issue. Devolve mensagem de erro ou null.
export function confirmarManual(caminho, codigo, por, dia = hoje()) {
  const issue = lerIssue(caminho)
  const criterio = issue.criterios.find((c) => c.codigo === codigo)
  if (!criterio) return `${codigo} não é um critério desta issue`
  if (criterio.prova !== 'manual') return `${codigo} é de prova automática; quem prova é o teste`
  if (vazio(por)) return 'diga quem conferiu: --por <nome>'
  if (!RE_DIA.test(dia)) return 'o dia deve estar no formato dd/mm/aaaa'
  if (issue.manuais.some((m) => m.codigo === codigo)) return `${codigo} já está confirmado nesta issue`

  const linha = `| ${codigo} | ${por} | ${dia} |`
  let texto = issue.texto.replace(/\n+$/, '')
  if (secao(texto, 'Testes manuais') === null) {
    texto += `\n\n## Testes manuais\n\n| Critério | Conferido por | Dia |\n|---|---|---|\n${linha}`
  } else {
    const linhas = texto.split('\n')
    const inicio = linhas.findIndex((l) => /^##\s+Testes manuais\s*$/.test(l))
    let fim = inicio + 1
    for (let i = inicio + 1; i < linhas.length && !/^##\s+/.test(linhas[i]); i++) {
      if (linhas[i].trim().startsWith('|')) fim = i + 1
    }
    linhas.splice(fim, 0, linha)
    texto = linhas.join('\n')
  }
  fs.writeFileSync(caminho, `${texto}\n`)
  return null
}

// ------------------------------------------------------------------- lições

const MAX_LICOES_POR_ISSUE = 2
const MAX_LICOES_LIDAS = 10
// Falhas que o auditor não registra sozinho; pedem a evidência por escrito.
const FALHAS_SEM_SINAL = ['revisildo', 'teste-manual']

function idDaIssue(caminhoOuId) {
  const m = /^([A-Za-z]+\d+-\d+)/.exec(path.basename(caminhoOuId))
  return m ? m[1].toUpperCase() : null
}

// Dentro da pasta do git, onde nunca é versionado nem aparece como arquivo
// mexido. Fora de um repositório, cai em `.claude/`.
function arquivoDeSinais(raiz) {
  const pastaDoGit = (git(raiz, ['rev-parse', '--git-dir']) || '').trim()
  return pastaDoGit
    ? path.resolve(raiz, pastaDoGit, 'auditor-sinais.json')
    : path.join(raiz, '.claude', 'auditor-sinais.json')
}

export function lerSinais(raiz) {
  const arquivo = arquivoDeSinais(raiz)
  return fs.existsSync(arquivo) ? JSON.parse(ler(arquivo)) : []
}

// Guarda os problemas que travaram uma issue. É o lastro das lições: só vira
// lição o que o auditor de fato acusou. Fica fora do versionamento.
export function registrarSinais(raiz, relatorio) {
  const issue = idDaIssue(relatorio.issue)
  const travas = relatorio.problemas.filter((p) => p.trava)
  if (!issue || travas.length === 0) return
  const sinais = lerSinais(raiz)
  for (const p of travas) {
    if (sinais.some((s) => s.issue === issue && s.codigo === p.codigo && s.alvo === p.alvo)) continue
    sinais.push({ issue, codigo: p.codigo, alvo: p.alvo, dia: hoje() })
  }
  fs.mkdirSync(path.dirname(arquivoDeSinais(raiz)), { recursive: true })
  fs.writeFileSync(arquivoDeSinais(raiz), `${JSON.stringify(sinais, null, 2)}\n`)
}

export function lerLicoes(raiz, cfg) {
  const arquivo = path.join(raiz, cfg.arquivoLicoes)
  if (!fs.existsSync(arquivo)) return []
  return linhasDaTabela(ler(arquivo))
    .filter(([id]) => /^L-\d+$/.test(id || ''))
    .map(([id, texto, origem, falha, recorrencias]) => ({
      id,
      texto,
      origem,
      falha,
      recorrencias: recorrencias && recorrencias !== '—' ? recorrencias.split(',').map((r) => r.trim()) : [],
    }))
}

function gravarLicoes(raiz, cfg, licoes) {
  const linhas = licoes.map(
    (l) => `| ${l.id} | ${l.texto} | ${l.origem} | ${l.falha} | ${l.recorrencias.length ? l.recorrencias.join(', ') : '—'} |`
  )
  const texto = [
    '# Lições aprendidas',
    '',
    'Regras que nasceram de uma falha real em uma issue. O `/spec` e o `/plan` leem as dez',
    'primeiras, as recorrentes na frente. Este arquivo é escrito pelo auditor',
    '(`auditor.mjs licao ...`); não edite à mão.',
    '',
    '| ID | Lição | Origem | Falha | Voltou a acontecer em |',
    '|---|---|---|---|---|',
    ...linhas,
    '',
  ].join('\n')
  const arquivo = path.join(raiz, cfg.arquivoLicoes)
  fs.mkdirSync(path.dirname(arquivo), { recursive: true })
  fs.writeFileSync(arquivo, texto)
}

// Recorrentes primeiro, depois as mais novas; no máximo dez.
export function licoesParaLer(raiz, cfg) {
  return lerLicoes(raiz, cfg)
    .map((l, i) => ({ ...l, ordem: i }))
    .sort((a, b) => b.recorrencias.length - a.recorrencias.length || b.ordem - a.ordem)
    .slice(0, MAX_LICOES_LIDAS)
}

// Devolve { erro } ou { licao }. `sinais` é injetável para teste.
export function adicionarLicao(raiz, cfg, { issue, falha, texto, evidencia }, sinais = lerSinais(raiz)) {
  const id = idDaIssue(issue || '')
  if (!id) return { erro: 'diga a issue de origem (ex.: B23-02)' }
  if (vazio(texto)) return { erro: 'escreva a lição em uma frase: --texto "..."' }
  if (vazio(falha)) {
    return { erro: 'lição sem falha de origem é recusada: diga --falha <código do auditor | revisildo | teste-manual>' }
  }
  let origemDaFalha
  if (FALHAS_SEM_SINAL.includes(falha)) {
    if (vazio(evidencia)) return { erro: `falha "${falha}" precisa da evidência: --evidencia "o que deu errado"` }
    origemDaFalha = `${falha}: ${evidencia}`
  } else {
    const sinal = sinais.find((s) => s.issue === id && s.codigo === falha)
    if (!sinal) {
      return {
        erro: `o auditor não registrou "${falha}" na issue ${id}; lição sem falha real é recusada. Caminho limpo não gera lição.`,
      }
    }
    origemDaFalha = `${NOMES[falha] || falha} em ${sinal.alvo}`
  }
  const licoes = lerLicoes(raiz, cfg)
  if (licoes.filter((l) => l.origem === id).length >= MAX_LICOES_POR_ISSUE) {
    return { erro: `a issue ${id} já tem ${MAX_LICOES_POR_ISSUE} lições, que é o máximo` }
  }
  const numero = Math.max(0, ...licoes.map((l) => Number(l.id.slice(2)))) + 1
  const licao = {
    id: `L-${String(numero).padStart(2, '0')}`,
    texto: texto.replace(/\|/g, '/').trim(),
    origem: id,
    falha: origemDaFalha.replace(/\|/g, '/'),
    recorrencias: [],
  }
  gravarLicoes(raiz, cfg, [...licoes, licao])
  return { licao }
}

// Marca que a falha de uma lição voltou a acontecer, em outra série.
export function marcarRecorrencia(raiz, cfg, idLicao, issue) {
  const licoes = lerLicoes(raiz, cfg)
  const licao = licoes.find((l) => l.id === idLicao)
  const id = idDaIssue(issue || '')
  if (!licao) return { erro: `lição ${idLicao} não existe` }
  if (!id) return { erro: 'diga a issue em que a falha voltou (ex.: B24-01)' }
  const serie = (x) => x.split('-')[0]
  if ([licao.origem, ...licao.recorrencias].some((x) => serie(x) === serie(id))) {
    return { erro: `a série ${serie(id)} já está contada nesta lição; recorrência é a mesma falha em outra série` }
  }
  licao.recorrencias.push(id)
  gravarLicoes(raiz, cfg, licoes)
  return { licao }
}

export function removerLicao(raiz, cfg, idLicao) {
  const licoes = lerLicoes(raiz, cfg)
  if (!licoes.some((l) => l.id === idLicao)) return { erro: `lição ${idLicao} não existe` }
  gravarLicoes(raiz, cfg, licoes.filter((l) => l.id !== idLicao))
  return {}
}

// ---------------------------------------------------------------- relatório

function imprimirProblemas(problemas, escrever) {
  for (const p of problemas) {
    escrever(`  ${p.trava ? '✘' : '•'} ${p.nome} (${p.codigo}) — ${p.alvo}`)
    if (p.detalhe) p.detalhe.split('\n').forEach((l) => escrever(`      ${l}`))
    escrever(`      o que fazer: ${p.oQueFazer}`)
  }
}

export function imprimirIssue(rel, escrever = console.log) {
  escrever(`Issue: ${rel.titulo}`)
  escrever(`Arquivo: ${rel.issue}`)
  imprimirProblemas(rel.problemas, escrever)
  for (const m of rel.manuaisPendentes) {
    if (!m.roteiro) continue
    escrever(`  Roteiro manual — ${m.codigo}:`)
    m.roteiro.split('\n').forEach((l) => escrever(`      ${l}`))
  }
  for (const e of rel.excecoes) {
    const uso = e.usada ? '' : ' (não usada: o problema não existe mais)'
    escrever(`  ⚑ exceção: ${e.problema} em ${e.alvo} — ${e.motivo}. Aprovada por ${e.por} em ${e.dia}${uso}`)
  }
  for (const d of rel.regrasDesligadas || []) {
    escrever(`  ⚑ regra desligada: ${d.regra} em ${d.arquivo} — ${d.motivo}`)
  }
  escrever(`Veredito: ${rel.veredito}`)
}

function erroDeUso(mensagem) {
  console.error(`erro: ${mensagem}`)
  console.error('uso: auditor.mjs issue <id|caminho> | serie <série> | suposicoes | regras | licao ... | confirmar <id> <CA-...> --por <nome>')
  return SAIDA.USO
}

function opcao(args, nome) {
  const i = args.indexOf(nome)
  return i === -1 ? undefined : args[i + 1]
}

export function principal(args, raiz = process.cwd()) {
  const cfg = carregarConfig(raiz)
  const [comando, ...resto] = args
  const semRodar = resto.includes('--sem-rodar')
  const json = resto.includes('--json')
  const comValor = ['--por', '--dia', '--falha', '--texto', '--evidencia']
  const posicionais = resto.filter((a, i) => !a.startsWith('--') && !comValor.includes(resto[i - 1]))

  if (comando === 'issue') {
    if (!posicionais[0]) return erroDeUso('diga qual issue')
    const caminho = acharIssue(raiz, cfg, posicionais[0])
    if (!caminho) return erroDeUso(`issue "${posicionais[0]}" não encontrada em ${cfg.pastaIssues}`)
    const rel = executarIssue(raiz, cfg, caminho, { semRodar })
    registrarSinais(raiz, rel)
    if (json) console.log(JSON.stringify(rel, null, 2))
    else imprimirIssue(rel)
    return rel.saida
  }

  if (comando === 'serie') {
    if (!posicionais[0]) return erroDeUso('diga qual série')
    const rel = executarSerie(raiz, cfg, posicionais[0], { semRodar })
    if (rel.issues.length === 0 && rel.problemas.length === 0) return erroDeUso(`nenhuma issue da série ${rel.serie}`)
    if (json) {
      console.log(JSON.stringify(rel, null, 2))
      return rel.saida
    }
    console.log(`Série: ${rel.serie}`)
    imprimirProblemas(rel.problemas, console.log)
    for (const issue of rel.issues) {
      console.log('')
      imprimirIssue(issue)
    }
    console.log(`\nVeredito da série: ${rel.veredito}`)
    return rel.saida
  }

  if (comando === 'suposicoes') {
    const abertas = listarAbertas(raiz, cfg)
    if (json) console.log(JSON.stringify(abertas, null, 2))
    else if (abertas.length === 0) console.log('Nenhuma suposição ou pergunta em aberto.')
    else abertas.forEach((a) => console.log(`${a.nome} — ${a.alvo}: ${a.detalhe}\n    em ${a.onde}`))
    return SAIDA.ALINHADA
  }

  if (comando === 'regras') {
    const resultado = conferirProjetoInteiro(raiz, carregarRegras(raiz))
    if (json) {
      console.log(JSON.stringify(resultado, null, 2))
      return SAIDA.ALINHADA
    }
    if (resultado.length === 0) console.log('Nenhuma regra por script neste projeto.')
    for (const r of resultado) {
      const achados = r.regra.tipo === 'intocavel' ? 'só confere arquivo modificado' : `${r.problemas.length} ocorrência(s) hoje`
      console.log(`${r.regra.id} — ${r.regra.nome}`)
      console.log(`    vem de: ${r.regra.origem}`)
      console.log(`    confere ${r.arquivos} arquivo(s); ${achados}`)
      if (r.arquivos === 0) console.log(`    ✘ ${NOMES.REGRA_SEM_ARQUIVOS}: provavelmente o caminho da regra está escrito errado`)
      r.problemas.slice(0, 5).forEach((p) => console.log(`      ${p.alvo} — ${p.detalhe.split('\n')[0]}`))
      if (r.problemas.length > 5) console.log(`      ... e mais ${r.problemas.length - 5}`)
      r.desligadas.forEach((d) => console.log(`      ⚑ desligada em ${d.arquivo} — ${d.motivo}`))
    }
    return resultado.some((r) => r.arquivos === 0) ? SAIDA.NAO_ALINHADA : SAIDA.ALINHADA
  }

  if (comando === 'licao') {
    const [acao, alvo, alvo2] = posicionais
    if (acao === 'listar') {
      const licoes = licoesParaLer(raiz, cfg)
      if (json) console.log(JSON.stringify(licoes, null, 2))
      else if (licoes.length === 0) console.log('Nenhuma lição registrada.')
      else {
        licoes.forEach((l) => {
          const voltou = l.recorrencias.length ? ` — RECORRENTE (voltou em ${l.recorrencias.join(', ')})` : ''
          console.log(`${l.id}: ${l.texto}\n    origem: ${l.origem}, ${l.falha}${voltou}`)
        })
      }
      return SAIDA.ALINHADA
    }
    let resultado
    if (acao === 'adicionar') {
      resultado = adicionarLicao(raiz, cfg, {
        issue: alvo,
        falha: opcao(resto, '--falha'),
        texto: opcao(resto, '--texto'),
        evidencia: opcao(resto, '--evidencia'),
      })
    } else if (acao === 'recorreu') resultado = marcarRecorrencia(raiz, cfg, alvo, alvo2)
    else if (acao === 'remover') resultado = removerLicao(raiz, cfg, alvo)
    else return erroDeUso('use: licao listar | adicionar <issue> --falha <...> --texto "..." | recorreu <L-nn> <issue> | remover <L-nn>')
    if (resultado.erro) return erroDeUso(resultado.erro)
    console.log(resultado.licao ? `Lição ${resultado.licao.id} gravada em ${cfg.arquivoLicoes}.` : `Lição ${alvo} removida.`)
    return SAIDA.ALINHADA
  }

  if (comando === 'confirmar') {
    const [id, codigo] = posicionais
    if (!id || !codigo) return erroDeUso('diga a issue e o critério')
    const caminho = acharIssue(raiz, cfg, id)
    if (!caminho) return erroDeUso(`issue "${id}" não encontrada em ${cfg.pastaIssues}`)
    const erro = confirmarManual(caminho, codigo, opcao(resto, '--por'), opcao(resto, '--dia'))
    if (erro) return erroDeUso(erro)
    console.log(`Teste manual de ${codigo} confirmado por ${opcao(resto, '--por')}.`)
    return SAIDA.ALINHADA
  }

  return erroDeUso(comando ? `comando desconhecido: ${comando}` : 'faltou o comando')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv.slice(2))
}
