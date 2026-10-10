# Spec: Fluxo com prova

> Estado: aprovada pela Marcelle em 10/10/2026, com as quatro perguntas respondidas
> e as sete suposições confirmadas.
> Esta spec já usa duas das seções que ela propõe: **Suposições** e **Perguntas em
> aberto**, no fim do arquivo.

## Visão Geral

O fluxo de hoje (`/triagem` → `/spec` → `/break` → `/plan` → `/execute` → testes →
`/revisildo`) funciona, mas o "está pronto" depende de leitura: o `/revisildo` lê o
código e julga se a issue foi cumprida. Quatro coisas ficam soltas:

1. **Não há ligação entre o que foi pedido e o teste que prova.** A issue tem cenários
   em texto; os testes vinham de um plano de testes por módulo, que as séries novas
   (B9 em diante) não têm mais.
2. **O que foi assumido sem confirmar se perde.** Fica na conversa ou na memória do
   agente, não na spec nem na issue.
3. **As regras do `CLAUDE.md` são conferidas por leitura**, mesmo as que um script
   conferiria sozinho.
4. **O que deu errado numa série não chega à próxima.**

Esta mudança traz quatro elementos da skill `onp-spec-driven` para dentro do fluxo que
já existe, sem trocar de fluxo:

1. **Prova mecânica:** cada critério de aceite tem um código, cada teste carrega o
   código do critério que prova, e um auditor confere a ligação.
2. **Suposições e perguntas registradas**, com status, na spec e na issue.
3. **Regras conferidas por script**, as que dão para conferir sozinhas.
4. **Lições aprendidas**, só as que nasceram de uma falha real.

**O que não muda:**

- A `/triagem` continua decidindo a marcha. Sonda e delimitada seguem sem spec, sem
  issue e sem auditor.
- A spec continua descrevendo **a mudança** e sendo arquivada quando entra no ar.
- Uma issue continua sendo uma entrega que dá para ver funcionando.
- "Só mexa nos arquivos listados" e "pare e pergunte" continuam valendo.
- O `/revisildo` continua lendo o código para o que script não enxerga (lógica de
  negócio no frontend, autorização no cliente).

**Para quem:** a Marcelle e o Luan no CRM, e a Marcelle nos outros projetos dela.

**Onde vale:** nos comandos e skills do repositório do CRM e nos da pasta pessoal da
Marcelle, que valem nos outros projetos.

## Vocabulário

| Código | Nome | O que é |
|---|---|---|
| `CA-<série>-<nn>` | critério de aceite | Resultado que dá para observar e conferir. Ex.: `CA-B23-04` |
| `SUP-<série>-<nn>` | suposição | Lacuna preenchida sem confirmação de quem decide |
| `PER-<série>-<nn>` | pergunta em aberto | Decisão que falta alguém tomar |

Os códigos são únicos no projeto e nunca são reaproveitados, nem depois de a spec ser
arquivada. Na conversa, o agente usa sempre o nome por extenso; o código vai entre
parênteses.

## Módulos

### 1. Spec (`/spec`)

**Descrição:** A spec passa a carregar critérios de aceite com código, suposições e
perguntas em aberto.

**Componentes:**
- Critérios de aceite: sob cada comportamento, um ou mais critérios no formato
  Dado / Quando / Então, cada um com código e com o **tipo de prova**: `automática`
  (um teste confere) ou `manual` (só uma pessoa confere, como teste com chip real).
- Seção **Suposições**: tabela com código, suposição, status (`aberta`, `confirmada`,
  `invalidada`) e resolução.
- Seção **Perguntas em aberto**: tabela com código, pergunta, status (`aberta`,
  `respondida`) e resposta.
- Seção **Fora de escopo**: o que a mudança não faz.

**Comportamentos:**
- Ler as lições do projeto antes de escrever a spec.
- Escrever ao menos um critério de aceite para cada comportamento.
- Marcar cada critério como de prova automática ou manual.
- Registrar como suposição tudo o que foi preenchido sem confirmação.
- Registrar como pergunta em aberto tudo o que depende de decisão de alguém.
- Perguntar na hora, quando a pessoa está presente, e gravar a resposta com o status
  atualizado.
- Escrever "Nenhuma." na seção quando não houver suposição ou pergunta; a seção nunca
  fica ausente.
- Recusar critério que não dá para observar ("deve ser rápido") e pedir um que dê
  ("responde em menos de 2 segundos").

### 2. Quebra em issues (`/break`)

**Descrição:** Cada issue passa a dizer quais critérios de aceite ela entrega.

**Componentes:**
- Seção **Critérios de aceite** da issue: a lista dos códigos que a issue entrega, com
  o texto e o tipo de prova copiados da spec.
- Seção **Pronto quando**: continua existindo, como a descrição em uma frase do que dá
  para ver funcionando.

**Comportamentos:**
- Distribuir todos os critérios de aceite da spec entre as issues, sem deixar nenhum
  de fora.
- Entregar cada critério em uma única issue.
- Avisar quando um critério não couber em nenhuma entrega, em vez de criar uma issue só
  para ele.
- Levar para a issue as suposições e perguntas da spec que afetam aquela entrega.
- Criar issue de protótipo sem critérios de prova automática.

### 3. Plano da issue (`/plan`)

**Descrição:** O plano passa a dizer, para cada critério, qual teste vai prová-lo e em
qual arquivo.

**Componentes:**
- Tabela **Prova**: uma linha por critério de aceite da issue, com o tipo de prova, o
  arquivo de teste e o que o teste confere. Critério manual traz o roteiro do teste
  manual no lugar do arquivo.
- Seções **Suposições** e **Perguntas em aberto** da issue, no mesmo formato da spec.
- As seções de hoje continuam: Cenários, Banco de Dados, Arquivos, Dependências
  Externas e Checklist.

**Comportamentos:**
- Ler as lições do projeto antes de planejar.
- Preencher a tabela Prova para todos os critérios da issue.
- Incluir os arquivos de teste na seção Arquivos.
- Registrar como suposição o que a pesquisa no código não confirmou.
- Parar e perguntar quando houver pergunta em aberto que muda a implementação.
- Substituir o plano de testes por módulo: a tabela Prova passa a ser a fonte dos
  testes da issue.

### 4. Execução (`/execute`)

**Descrição:** A execução continua igual, com uma regra a mais sobre suposições.

**Comportamentos:**
- Registrar na issue, como suposição aberta, qualquer decisão tomada durante a
  implementação que a issue não previa e que não justificava parar.
- Continuar parando e perguntando quando precisar de arquivo fora da lista.

### 5. Testes

**Descrição:** Os testes passam a nascer da tabela Prova da issue, e cada um carrega o
código do critério que prova.

**Comportamentos:**
- Escrever ao menos um teste para cada critério de prova automática da issue.
- Colocar o código do critério no nome do teste.
- Conferir no teste o resultado descrito no critério, não o formato do código.
- Rodar os testes da issue e não avançar com teste falhando.
- Nunca pular, enfraquecer ou apagar um teste para a issue passar.
- Informar que não há teste a escrever quando a issue só tem critérios manuais ou é de
  protótipo.
- Seguir o plano de testes por módulo quando a issue estiver no formato antigo.

### 6. Auditor (novo)

**Descrição:** Um conferidor que roda sozinho, sem julgamento do agente, e responde
"esta issue está alinhada?" com uma lista de problemas ou com nenhum. É a peça que
torna o "pronto" uma coisa verificada.

**Componentes:**
- Relatório da issue: cada problema com o nome legível, o código do critério ou o
  arquivo e a linha, e o que fazer.
- Veredito: **alinhada**, **alinhada com teste manual pendente** ou **não alinhada**.
- Catálogo de problemas:

| Problema | O que significa | Trava |
|---|---|---|
| critério sem teste | critério automático sem teste com o código dele | sim |
| critério sem prova | o teste existe, mas falhou ou foi pulado | sim |
| teste órfão | teste carrega código de critério que não existe em nenhuma spec, ativa ou arquivada | sim |
| critério fora de issue | critério da spec que nenhuma issue entrega | sim |
| suposição aberta | suposição ainda sem confirmação | sim |
| pergunta aberta | pergunta ainda sem resposta | sim |
| seção ausente | spec ou issue sem Critérios, Suposições ou Perguntas | sim |
| arquivo fora da issue | arquivo mexido que não está na seção Arquivos | sim |
| arquivo não tocado | arquivo listado que não foi mexido | sim |
| checklist incompleto | item ainda desmarcado | sim |
| regra violada | uma regra por script foi quebrada (módulo 7) | sim |
| teste manual pendente | critério manual ainda sem confirmação de uma pessoa | não |
| issue no formato antigo | issue sem critérios com código; a prova mecânica não se aplica | não |

**Comportamentos:**
- Auditar uma issue.
- Auditar uma série inteira, antes de arquivar a spec.
- Rodar os testes dos critérios da issue e usar o resultado como prova.
- Não aceitar teste pulado como prova.
- Mostrar cada problema com arquivo, linha ou código, e com o que fazer.
- Dizer com clareza quando uma issue está no formato antigo, em vez de passar em
  silêncio.
- Listar os testes manuais pendentes da issue, com o roteiro de cada um.
- Registrar a confirmação de um teste manual: quem conferiu e em que dia.
- Aceitar uma exceção escrita na issue para um problema específico, com o motivo, quem
  aprovou (Marcelle ou Luan) e o dia.
- Mostrar no relatório toda exceção aceita, para ela nunca ficar escondida.
- Recusar exceção sem motivo, sem aprovador ou sem data.
- Responder "o que estamos assumindo?" listando as suposições abertas do projeto.
- Responder "qual critério não tem teste?" para a issue ou a série.

### 7. Regras por script

**Descrição:** As regras do projeto que um script consegue conferir sozinho saem da
leitura do `/revisildo` e passam a ser conferidas pelo auditor. Cada projeto tem a sua
lista.

**Componentes:**
- Lista de regras do projeto: cada regra com nome, o que confere, em quais arquivos e
  de qual regra do `CLAUDE.md` ela vem.
- Lista inicial do CRM:
  - segredo ou chave de servidor em arquivo que roda no navegador;
  - edição à mão do arquivo de tipos gerado do banco;
  - edição dos componentes prontos de interface que não devem ser modificados;
  - uso de variante de tema claro/escuro que nunca ativa, porque o tema é sempre escuro.
- Lista inicial dos outros projetos: só a regra de segredo no frontend.

**Comportamentos:**
- Conferir as regras nos arquivos que a issue mexeu.
- Apontar a violação com arquivo e linha.
- Acrescentar uma regra nova à lista do projeto.
- Desligar uma regra em um arquivo específico, com o motivo escrito ao lado.
- Avisar quando uma regra não confere nenhum arquivo, porque provavelmente está
  escrita errado.

### 8. Revisão (`/revisildo`)

**Descrição:** O `/revisildo` passa a rodar o auditor primeiro e a ler o código só para
o que o auditor não enxerga.

**Comportamentos:**
- Rodar o auditor da issue e mostrar a saída dele.
- Traduzir a saída em uma ou duas frases simples.
- Ler os arquivos mexidos procurando lógica de negócio no frontend e autorização só no
  cliente.
- Dizer, no resultado, o que foi conferido por script e o que foi conferido por
  leitura.
- Responder "✅ Tudo certo. Pode commitar." só quando o auditor disser **alinhada** ou
  **alinhada com teste manual pendente** e a leitura não achar problema.
- Listar os testes manuais pendentes junto do "pode commitar", quando houver.
- Parar e apresentar os problemas à pessoa quando o mesmo problema persistir depois de
  três tentativas de correção, em vez de contornar o auditor.
- Revisar issue no formato antigo do jeito de hoje, avisando que foi sem prova
  mecânica.

### 9. Fechamento e lições (`/issue`)

**Descrição:** A issue só vai para a pasta de concluídas quando os testes manuais dela
foram confirmados. Ao fechar, o que deu errado no caminho pode virar lição.

**Componentes:**
- Arquivo de lições do projeto, versionado no repositório. Cada lição tem: a regra em
  uma frase, a issue de origem, a falha que a originou e quantas vezes voltou a
  acontecer.

**Comportamentos:**
- Manter a issue aberta enquanto houver teste manual pendente, mesmo com o código no ar.
- Mover a issue para concluídas quando o auditor disser **alinhada**.
- Registrar no máximo duas lições por issue.
- Aceitar lição somente quando ela cita uma falha real daquela issue: problema apontado
  pelo auditor, teste que falhou, problema do `/revisildo` ou erro achado em teste
  manual.
- Recusar lição sem falha de origem.
- Não registrar lição quando o caminho foi limpo.
- Marcar a lição como recorrente quando a mesma falha aparece em outra série.
- Entregar ao `/spec` e ao `/plan` no máximo dez lições, as recorrentes primeiro.
- Remover uma lição que se mostrou errada, por decisão da pessoa.

### 10. Cópias alinhadas e documentação

**Descrição:** Os comandos do repositório do CRM e os da pasta pessoal da Marcelle já
divergiram: o `/break` do repositório ainda corta por comportamento, o da pasta pessoal
corta por entrega, e a `/triagem` só existe na pasta pessoal. As duas cópias passam a
ter o mesmo conteúdo.

**Comportamentos:**
- Trazer a `/triagem` para o repositório do CRM, para o Luan recebê-la pelo clone.
- Igualar `/spec`, `/break`, `/plan`, `/execute` e `/revisildo` nas duas cópias,
  diferindo apenas nos caminhos de pasta de cada projeto.
- Criar na pasta pessoal versões genéricas de `testes` e `/issue`, sem as partes
  específicas do CRM (cartão do ClickUp, banco real do Supabase, pastas por módulo).
- Atualizar a seção de fluxo do `CLAUDE.md` do CRM e do `CLAUDE.md` pessoal para
  descrever o fluxo novo.
- Deixar o auditor disponível nos outros projetos sem instalar nada além dos comandos.

## Fora de escopo

- Execução de issues em paralelo. O fluxo continua uma issue por vez.
- Converter issues concluídas para o formato novo.
- Tratar a spec como verdade permanente do sistema. Ela continua sendo arquivada.
- Usar a skill `onp-spec-driven` ou a pasta `.spec/` dela no CRM.
- Um mecanismo que mantenha as duas cópias dos comandos iguais no futuro. O alinhamento
  é feito uma vez.
- Rodar o auditor no servidor a cada envio de código.
- Checar por script "lógica de negócio no frontend". Continua por leitura.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-01 | Tarefa delimitada (sem spec nem issue) não passa pelo auditor nem ganha critérios com código. | confirmada | Marcelle, 10/10/2026: aprovada junto com a spec. |
| SUP-02 | O plano de testes por módulo deixa de ser escrito para séries novas; a tabela Prova da issue o substitui. Os planos antigos ficam onde estão. | confirmada | Marcelle, 10/10/2026: aprovada junto com a spec. |
| SUP-03 | Uma issue no formato antigo nunca trava: o auditor avisa e o `/revisildo` revisa como hoje. Isso mantém os lotes de correção do Luan andando. | confirmada | Marcelle, 10/10/2026: aprovada junto com a spec. |
| SUP-04 | O arquivo de lições e a lista de regras ficam no repositório de cada projeto, versionados, para o Luan receber. | confirmada | Marcelle, 10/10/2026: aprovada junto com a spec. |
| SUP-05 | A lista inicial de regras por script do CRM é a do módulo 7 (quatro regras). | confirmada | Marcelle, 10/10/2026: aprovada junto com a spec. |
| SUP-06 | Os códigos são em português (`CA`, `SUP`, `PER`), não os da skill (`AC`, `ASM`, `Q`). | confirmada | Marcelle, 10/10/2026: aprovada junto com a spec. |
| SUP-07 | Esta mudança é feita num branch próprio a partir do `master`, separada da landing. | confirmada | Marcelle, 10/10/2026: aprovada junto com a spec. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-01 | Teste manual pendente (chip real) trava o quê? | respondida | Marcelle, 10/10/2026: só o fechamento. Commit e deploy seguem; a issue fica aberta e a spec não é arquivada até o teste ser confirmado. |
| PER-02 | Nos outros projetos não existem as etapas `testes` e `/issue`, só no CRM. Como os testes entram lá? | respondida | Marcelle, 10/10/2026: versões genéricas de `testes` e `/issue` na pasta pessoal, sem as partes específicas do CRM. |
| PER-03 | As issues abertas hoje (B13-05, B19-04 e as três da landing) ficam no formato antigo ou são convertidas? | respondida | Marcelle, 10/10/2026: ficam no formato antigo. O formato novo vale da próxima spec em diante. |
| PER-04 | O auditor pode ser contornado com uma exceção escrita na issue? | respondida | Marcelle, 10/10/2026: sim, com registro (motivo, quem aprovou e o dia), e o auditor mostra a exceção no relatório. |
