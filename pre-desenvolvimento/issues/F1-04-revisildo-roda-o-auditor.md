# F1-04: /revisildo roda o auditor antes de ler o código

**Tipo:** Implementação
**Página:** Fluxo de desenvolvimento (`/revisildo`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-fluxo-com-prova.md`

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
