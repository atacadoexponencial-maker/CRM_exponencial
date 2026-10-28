# B47-07: Variáveis das automações sem perda e em linguagem simples

**Tipo:** Correção
**Página:** Configurações → Automações → editor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-10**, **M-11**, **B-16** e **B-19**
**Gravidade:** Médio

## Descrição

O exemplo do campo ensina a digitar `{{primeiro_nome}}`, que dá erro de "texto reserva". Clicar numa variável e salvar sem "Inserir" descarta a variável em silêncio. Os erros vêm juntos numa frase, meio cobertos pelo painel, e um texto diz "regra".

## Pronto quando

O exemplo não tem chaves, a variável pendente não some ao salvar, os erros aparecem um por linha e o texto diz "automação".

## Critérios de aceite

- **CA-B47-16** (automática) — Exemplo sem chaves. Dado o campo de texto do lembrete e o da mensagem no editor, quando estão vazios, então o exemplo não tem `{{` e diz para clicar no botão do nome
- **CA-B47-17** (automática) — Variável pendente não some ao salvar. Dado o campo do lembrete com "Ligar para " e a caixa do "Primeiro nome" aberta, sem "Inserir", quando se clica em Salvar, então a variável é inserida com o texto reserva da caixa (ou "cliente", se vazio) antes de salvar, e o lembrete fica "Ligar para {primeiro nome}"
- **CA-B47-18** (automática) — Erros do editor um por linha. Dado uma automação sem nome, com um bloco incompleto e sem ação ligada, quando se clica em Salvar, então os três problemas aparecem em três linhas, numa área que o painel lateral não cobre

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B47-03 | A variável pendente é inserida ao salvar, em vez de bloquear o Salvar (CA-B47-17) | confirmada | Luan, 27/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O campo do lembrete e o da mensagem mostram um exemplo sem chaves, que diz para clicar em "Primeiro nome".
2. A pessoa clica em "Primeiro nome", não escreve o reserva e clica em Salvar: a variável entra com o reserva "cliente" antes de salvar.
3. Salvar uma automação sem nome, com bloco incompleto e sem ação ligada mostra os problemas numa lista, um por linha, no canto esquerdo do desenho, longe do painel do bloco, que abre à direita.

### Edge Cases
- Reserva escrito e sem "Inserir": entra o reserva escrito.
- "Cancelar" e Esc continuam desistindo da variável, sem inserir.
- Um problema só: a frase sozinha, como antes.
- O mesmo componente serve à campanha e às mensagens rápidas: lá também a variável não some.
- Os critérios da B38 continuam: o botão "Inserir" fica desligado sem reserva, e a variável digitada à mão sem reserva continua apontada.

### Cenário de Erro
- Sem mudança de servidor: o Salvar continua recusando a variável sem reserva escrita à mão.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B47-16 | automática | `src/test/variaveis-sem-perda.test.tsx` | O exemplo do lembrete e o da mensagem não têm `{{` e dizem "clique em Primeiro nome" |
| CA-B47-17 | automática | `src/test/variaveis-sem-perda.test.tsx` | Sair da caixa do reserva para o Salvar deixa "Ligar para {{primeiro_nome\|cliente}}" (ou o reserva escrito); Cancelar não insere |
| CA-B47-18 | automática | `src/test/variaveis-sem-perda.test.tsx` | Os problemas do Salvar saem em itens de lista, o primeiro "Dê um nome à automação", no painel da esquerda |

## Arquivos

- **Modificar:** `src/components/shared/texto-com-variaveis.tsx` — sair da caixa do reserva insere a variável com o reserva escrito ou "cliente".
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — exemplos sem chaves.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — problemas em lista, avisos no canto esquerdo.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — "automação" no lugar de "regra".
- **Criar:** `src/test/variaveis-sem-perda.test.tsx` — testes do CA-B47-16 ao CA-B47-18.

## Checklist

- [x] Exemplos sem chaves
- [x] Variável pendente entra ao sair da caixa
- [x] Problemas do Salvar um por linha, longe do painel
- [x] "automação" no lugar de "regra"
- [x] Testes do CA-B47-16 ao CA-B47-18 e os das automações, campanhas e variáveis passando, tsc e lint
