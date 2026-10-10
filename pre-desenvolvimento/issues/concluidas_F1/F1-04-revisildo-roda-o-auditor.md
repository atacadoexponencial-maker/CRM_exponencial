# F1-04: /revisildo roda o auditor antes de ler o código

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (`/revisildo`)
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-fluxo-com-prova.md`

## Descrição

O `/revisildo` passa a rodar o auditor da issue, mostrar a saída, traduzi-la em uma ou
duas frases e só então ler os arquivos mexidos, procurando o que script não enxerga
(lógica de negócio no frontend, autorização só no cliente). O resultado diz o que foi
conferido por script e o que foi por leitura. "✅ Tudo certo. Pode commitar." só sai com
o auditor em **alinhada** ou **alinhada com teste manual pendente**; nesse segundo caso,
os testes manuais pendentes vêm listados junto. Depois de três tentativas de correção do
mesmo problema, para e apresenta à pessoa. Issue no formato antigo é revisada como hoje,
com o aviso de que foi sem prova mecânica.

Cobre o módulo 8 da spec.

Depende de F1-03.

## Pronto quando

Rodando `/revisildo` em uma issue de exemplo no formato novo: com tudo certo, a resposta
traz a saída do auditor e o "pode commitar"; com um critério sem teste, não libera e
aponta o critério; com teste manual pendente, libera e lista o roteiro. Rodando na
B13-05 (formato antigo), revisa como hoje e avisa que foi sem prova mecânica.

## O que a pesquisa achou

- O `/revisildo` de hoje é só leitura: seis passos, quatro categorias (Escopo, Checklist,
  Spec, Arquitetura). Escopo, checklist e segredo no frontend passaram para o auditor na
  F1-03; sobram para a leitura a lógica de negócio no frontend e a autorização no cliente.
- O auditor tem um ponto cego que só a leitura cobre: um teste vazio com o código certo
  no nome passa como prova. A leitura ganha um item novo, "teste que não confere o
  critério".
- O auditor compara com o último commit, então o `/revisildo` precisa rodar **antes** do
  commit, como já é a regra do fluxo.
- Na máquina da Marcelle roda a cópia pessoal do `/revisildo`; esta issue muda só a do
  repositório. A pessoal muda na F1-06.

## Cenários

### Happy Path
1. Roda `auditor.mjs issue <id>`, cola a saída e a traduz em uma ou duas frases.
2. Lê os arquivos mexidos procurando só lógica de negócio no frontend, autorização no
   cliente, teste que não confere o critério e tipo de prova trocado.
3. Auditor em **alinhada** e leitura limpa: "✅ Tudo certo. Pode commitar.", dizendo o que
   foi conferido por script e o que foi por leitura.

### Edge Cases
- **Alinhada com teste manual pendente:** libera o commit e lista os testes manuais com o
  roteiro; a issue continua aberta.
- **Formato antigo:** revisa por leitura, como hoje, e diz que foi sem prova mecânica.
- **Testes não rodados** (`--sem-rodar`): não libera.

### Cenário de Erro
- Mesmo problema na terceira tentativa de correção: para e apresenta à pessoa, sem
  contornar o auditor.

## Banco de Dados

Sem mudança.

## Arquivos

- **Modificar:** `.claude/skills/revisildo/SKILL.md` — auditor primeiro, leitura só para o
  que script não enxerga, tabela de decisão, formato antigo, regra das três tentativas.

## Dependências Externas

Nenhuma.

## Prova

Só muda texto de skill; não há teste automático. O comando que a skill manda rodar foi
exercitado nas issues F1-02 e F1-03 (formato novo de exemplo e formato antigo real).

## Checklist

- [x] `/revisildo` roda o auditor e mostra a saída
- [x] Leitura reduzida ao que script não enxerga, com o item "teste que não confere o critério"
- [x] Tabela de decisão com os cinco casos
- [x] Seção "Issue no formato antigo" com os passos de hoje
- [x] Regra das três tentativas
