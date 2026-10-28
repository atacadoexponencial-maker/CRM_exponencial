# B47-08: Automação nova nasce desligada

**Tipo:** Correção
**Página:** Configurações → Automações (editor e lista)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **A-01**
**Gravidade:** Alto

## Descrição

Salvar uma automação nova grava com `ativa: true`, e ela já age sobre contatos de verdade. Decidido na PER-B47-01: nasce desligada.

## Pronto quando

Automação nova salva desligada; "Salvar e ativar" liga; editar uma ligada não desliga.

## Critérios de aceite

- **CA-B47-19** (automática) — Salvar automação nova grava desligada. Dado uma automação nova, com o fluxo completo, quando se clica em Salvar, então ela é gravada com `ativa` falso e a lista mostra a chave desligada
- **CA-B47-20** (automática) — "Salvar e ativar" liga. Dado a mesma automação nova, quando se clica em "Salvar e ativar", então ela é gravada ligada, passando pela mesma conferência do botão da lista
- **CA-B47-21** (automática) — Editar automação ligada mantém ligada. Dado uma automação ligada, quando se muda o nome e salva, então ela continua ligada

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B47-01 | A automação nova deve nascer desligada, com "Salvar e ativar" à parte? Hoje nasce ligada (B47-08) | respondida | Sim, nasce desligada. Luan, 27/10/2026 |

## Cenários

### Happy Path
1. O Admin monta uma automação nova e clica em **Salvar**: ela é gravada desligada, e o aviso diz "Automação salva, desligada. Use “Salvar e ativar” para ligar."
2. Ou clica em **Salvar e ativar**: o editor salva, depois liga pela `alternarRegra` (a mesma da chave da lista, que confere as escolhas), e o aviso diz "Automação salva e ligada".

### Edge Cases
- Automação já ligada: o editor mostra só "Salvar", e salvar não mexe em `ativa`.
- Automação desligada que já existia: o editor mostra "Salvar" e "Salvar e ativar".
- O Salvar que passa pelos avisos (repetição em toda mensagem, esperas canceladas) guarda qual botão foi clicado.
- A cópia de uma automação já nascia desligada: não muda.

### Cenário de Erro
- A conferência recusa ligar (escolha apagada depois): a automação fica salva e desligada, e a mensagem diz "A automação foi salva, mas continua desligada." seguida do motivo.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B47-19 | automática | `src/test/automacao-nasce-desligada.test.ts` | O insert da regra nova grava `ativa: false` |
| CA-B47-20 | automática | `src/test/automacao-salvar-e-ativar.test.tsx` | "Salvar e ativar" chama `salvarRegra` e depois `alternarRegra(id, true)`; recusa da conferência mostra "salva, mas continua desligada" |
| CA-B47-21 | automática | `src/test/automacao-nasce-desligada.test.ts` | Salvar uma regra que existe faz update sem o campo `ativa`; a regra ligada não mostra "Salvar e ativar" |

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — insert com `ativa: false`; `RegraDoEditor` com `ativa`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/editor-client.tsx` — "Salvar e ativar" pela `alternarRegra`, endereço `?salva=ativa`.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/[id]/page.tsx` — aviso do primeiro salvamento pelo `?salva=`.
- **Criar:** `src/app/(auth)/configuracoes/automacoes/[id]/avisos-do-salvar.ts` — textos dos avisos, fora do componente de cliente.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — botão "Salvar e ativar" quando a regra está desligada.
- **Criar:** `src/test/automacao-nasce-desligada.test.ts` — CA-B47-19 e CA-B47-21 no servidor.
- **Criar:** `src/test/automacao-salvar-e-ativar.test.tsx` — CA-B47-19 a CA-B47-21 no editor.
- **Modificar:** `src/test/automacao-perfil-rfv-protecoes.integration.test.ts` — liga a regra depois de salvar.
- **Modificar:** `src/test/funis-nas-automacoes.integration.test.ts` — liga a regra depois de salvar.
- **Modificar:** `src/test/pipeline-mais-na-etapa.integration.test.ts` — liga a regra depois de salvar.

Reuso: `alternarRegra`, que já confere as escolhas antes de ligar (B22-27).

## Checklist

- [x] Insert com `ativa: false`
- [x] "Salvar e ativar" no editor, pela `alternarRegra`
- [x] Avisos do Salvar e do primeiro salvamento
- [x] Testes do CA-B47-19 a CA-B47-21 passando
- [x] Testes de integração que contavam com a regra ligada ajustados e passando
- [x] Testes das automações (L-05), tsc (L-07) e lint
