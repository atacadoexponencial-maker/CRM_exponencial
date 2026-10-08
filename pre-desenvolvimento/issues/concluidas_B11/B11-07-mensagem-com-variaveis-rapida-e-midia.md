# B11-07: Ação enviar mensagem com variáveis, mensagem rápida e mídia

**Tipo:** Implementação
**Página:** Editor de fluxo; Motor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacoes-v2.md`
**Depende de:** B11-05

## Descrição

A ação de mensagem ganha três formas: texto com variáveis {{nome_contato}},
{{nome_vendedor}} e {{primeiro_nome}}; uma mensagem rápida cadastrada; ou uma
imagem ou documento escolhido no editor e guardado no armazenamento. O envio
usa o número da conversa do contato e respeita o canal (mídia só onde o canal
suporta; caso contrário a ação falha com motivo no histórico).

## Pronto quando

No preview do branch `b11-automacoes-v2` (o merge no `master` é um só, no fim da
série), uma regra envia "Oi {{primeiro_nome}}, aqui é {{nome_vendedor}}"
com os nomes certos, outra envia a mensagem rápida escolhida, e outra envia
um PDF; o histórico mostra as três como concluídas.

## Plano (08/10/2026)

### Decisões do plano

O registro vai para a seção 14 de `decisoes/B11-automacoes-em-fluxo.md`.

- **Achado:** a ação "Enviar mensagem", disponível desde a B11-02, manda o texto
  como está. O editor anuncia `{{primeiro_nome}}` e as outras variáveis, mas
  elas saem literalmente. Esta issue corrige.
- **Variáveis:**
  - `{{nome_contato}}`: o nome do contato ou, sem nome, o telefone. É a regra das
    sequências e das campanhas (`substituirVariaveis`, em `src/lib/sequencias.ts`,
    reaproveitada).
  - `{{primeiro_nome}}`: a primeira palavra do nome. Sem nome, fica vazio, e não o
    telefone: "Oi 5519…" soa pior que "Oi ,". Os contatos do canal direto nascem
    sem nome, então isso vai acontecer.
  - `{{nome_vendedor}}`: o atendente da conversa. Sem atendente, o do card
    principal do contato (Recompra, senão Entrada; decisões, seção 10.5). Sem
    nenhum, vazio.
  - O banco só é consultado quando o texto tem `{{`.
- **Mensagem rápida:** o texto cadastrado em `quick_replies`, com as mesmas
  variáveis. Mensagem rápida apagada faz a ação falhar, com o motivo.
- **Imagem ou documento:** o admin escolhe o arquivo no editor. Ele sobe na hora
  para o armazenamento, no mesmo bucket das campanhas (`chat-attachments`), na
  pasta `<empresa>/automacoes/`, e a ação guarda o endereço, o nome original e o
  tipo (`arquivo`, `arquivo_nome`, `arquivo_tipo`).
  - Imagem: JPEG, PNG ou WebP. Documento: PDF, Word ou Excel. Até 4 MB, o limite
    de uma requisição na Vercel, como no chat.
  - **O servidor só aceita arquivo da própria empresa,** nessa pasta, ao salvar e
    ao enviar. Sem isso, um fluxo gravado por fora mandaria qualquer endereço
    para o WhatsApp buscar.
  - Sem legenda: a spec não pede.
  - Número que não envia mídia (`suporta("midia")`): a ação falha com o motivo.
    Hoje os dois canais enviam.
- **Por qual número sai:** pela conversa do evento, quando ele tem uma (mensagem
  recebida, conversa criada…), e a mensagem é gravada nela. É o que a issue pede
  ("o número da conversa do contato") e o que a seção 12.3 já faz com as outras
  ações: com dois números, a resposta sai pelo número onde o cliente escreveu.
  Nos outros gatilhos, continua pela conversa aberta do contato e, sem ela, pelo
  número do workspace, criando a conversa.
- **O envio vira um só** em `src/lib/whatsapp-envio.ts`:
  `enviarWhatsAppComMotivo(supabase, empresa, contato, conteúdo, conversa?)`, com
  texto, imagem ou documento. `enviarTextoWhatsApp` e
  `enviarTextoWhatsAppComMotivo` continuam com a mesma assinatura, e as sequências
  não mudam.
- **As três ações ficam num módulo próprio,** `src/lib/automacoes/envio.ts`, para
  `acoes.ts` não crescer mais.

### Cenários

#### Happy Path

1. Regra A: "Oi {{primeiro_nome}}, aqui é {{nome_vendedor}}" sai como "Oi Ana,
   aqui é Admin Teste B11".
2. Regra B: a mensagem rápida escolhida sai com o texto cadastrado.
3. Regra C: o PDF escolhido no editor sai como documento, com o nome original.
4. O histórico mostra as três como concluídas.

#### Edge Cases

- **Contato sem nome:** `{{nome_contato}}` vira o telefone, e `{{primeiro_nome}}`
  fica vazio.
- **Conversa sem atendente:** `{{nome_vendedor}}` é o atendente do card
  principal. Sem nenhum, fica vazio.
- **Texto sem variável:** nada é consultado.
- **Mensagem rápida apagada depois de salvar a regra:** falha, "A mensagem rápida
  não existe mais".
- **Arquivo de outra empresa ou fora da pasta das automações:** recusado ao
  salvar. Num fluxo gravado por fora, a ação falha.
- **Arquivo maior que 4 MB ou de outro tipo:** o editor recusa, com a mensagem.
- **API Oficial fora da janela de 24 horas:** a Meta recusa, e o motivo vai para
  o histórico (seção 6.3).

#### Cenário de Erro

- Falha no upload: o editor mostra o erro, e a ação continua sem arquivo, com a
  pendência "Complete a configuração da ação".
- Falha no envio: a ação falha com o motivo, e o caminho segue, como nas outras
  ações.

### Banco

Nada novo. O arquivo fica no bucket `chat-attachments`, que já existe.

### Arquivos

- **Criar:** `src/lib/automacoes/envio.ts`. As ações de enviar mensagem, mensagem
  rápida e arquivo, e o preenchimento das variáveis (`textoComVariaveis`, pura).
- **Modificar:** `src/lib/whatsapp-envio.ts`. `enviarWhatsAppComMotivo` (texto ou
  mídia, pela conversa quando houver); as duas funções de texto passam a
  chamá-la.
- **Modificar:** `src/lib/automacoes/acoes.ts`. As três ações chamam `envio.ts`.
- **Modificar:** `src/lib/automacoes/referencias.ts`. As mensagens rápidas e os
  arquivos citados, e `arquivoDaAutomacaoValido`.
- **Modificar:** `src/lib/fluxo-automacao.ts`. As duas ações entram em
  `ACOES_DISPONIVEIS`.
- **Modificar nas automações:**
  - `actions.ts`: confere mensagens rápidas e arquivos ao salvar, e a nova
    `enviarArquivoDaAutomacao`.
  - `[id]/editor-client.tsx`, `components/editor-fluxo.tsx` e
    `components/painel-bloco.tsx`: o campo de arquivo sobe o arquivo e guarda os
    três parâmetros.
  - `components/frases-fluxo.ts`: a frase do bloco mostra o nome do arquivo.
- **Reutilizar:** `substituirVariaveis` (`src/lib/sequencias.ts`),
  `resolverProviderDaConversa` e `resolverProviderDoContato`
  (`src/lib/whatsapp`), `conversaDoEvento` (`contexto.ts`).
- **Testes:**
  - Criar `src/test/automacoes-envio.test.ts`: variáveis, mensagem rápida,
    arquivo e a conversa por onde sai.
  - `src/test/automacoes.test.ts` e `src/test/automacoes-acoes.test.ts`, que
    simulavam `enviarTextoWhatsAppComMotivo` e passam a simular
    `enviarWhatsAppComMotivo`.
  - `src/test/chat-envio-automacoes.test.ts`: o envio das automações continua sem
    chamar o motor.
  - `src/test/fluxo-automacao.test.ts`: nenhuma ação fica "em breve".
  - Criar `e2e/preview/roteiro-b11-07.cjs`, que envia 5 mensagens de verdade:
    as 3 desta issue e as partes de mensagem que ficaram abertas na B11-02
    (condição de canal), na B11-08 (ausência) e na B11-09 (entrega em até 30
    segundos). Assim o número fica conectado uma vez só.
  - `e2e/preview/comum.cjs` (`prepararNumeroReal`, que sai do roteiro da B11-05),
    `e2e/preview/roteiro-b11-05.cjs` (passa a usá-la), `e2e/preview/tela.cjs`
    (salvar aceitando o aviso de "responde toda mensagem") e o
    `e2e/preview/README.md`.
- **Documentação:** a seção 14 de `pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md`.

### Checklist

- [x] `enviarWhatsAppComMotivo` com texto e mídia, pela conversa do evento
- [x] Variáveis no texto e na mensagem rápida
- [x] Ações de mensagem rápida e de arquivo no motor
- [x] Upload do arquivo no editor, e conferência ao salvar
- [x] As duas ações na lista de disponíveis
- [x] Testes automatizados e suíte unitária passando; build com código 0
- [x] Roteiro no preview passando (com o chip, combinado com o Luan)
- [x] Registro de decisões (seção 14)

## Execução (08/10/2026)

**Concluída.** O "Pronto quando" passou no preview com envio de verdade: o
número pessoal do Luan conectado como chip da empresa de teste, mandando para o
número de trabalho dele.

**O que ficou diferente do plano:**

- **A action do upload se chama `guardarArquivoDaAutomacao`**, e não
  `enviarArquivoDaAutomacao`. Ela guarda o arquivo; quem envia é a regra.
- **`chat-envio-automacoes.test.ts` não precisou mudar.** Ele já confere que o
  envio das automações (`enviarTextoWhatsAppComMotivo`) não chama o motor, e
  continua passando com o envio unificado por baixo.
- **A verificação da B11-09 no roteiro mudou depois da rodada.** Ela esperava a
  mensagem de ausência chegar ao celular em até 30 segundos. A fila do gateway
  segurou a mensagem por quase uma hora, porque o número estava no primeiro dia
  de aquecimento (4 mensagens por hora). Com o Luan, ficou decidido que os 30
  segundos valem até o CRM entregar a mensagem ao gateway (decisões, seção 15).
  O roteiro com a verificação nova não foi rodado de novo, para não mandar mais
  5 mensagens. O número que ela mede saiu desta rodada: 1,4 segundo.

**Como foi verificado:**

- Suíte unitária com 49 arquivos e 615 testes passando. Os 14 testes de
  `automacoes-envio.test.ts` cobrem as variáveis, a mensagem rápida, o arquivo e
  a conversa por onde sai. Um teste novo em `fluxo-automacao.test.ts` confere
  que todo gatilho e toda ação estão disponíveis. Lint com 0 erros e build com
  código de saída 0.
- **No preview, sem enviar** (commit `3c7c8ca`): o PDF subiu pelo editor para a
  pasta da empresa, com nome e tipo gravados na regra; o seletor de mensagem
  rápida aparece; o roteiro da B11-04 passou de novo em 14 de 14.
- **No preview, com o chip** (mesmo commit), `e2e/preview/roteiro-b11-07.cjs`
  passou em 14 de 15. O item que falhou foi o da B11-09, explicado acima.
  - O histórico mostra as 3 regras como concluídas.
  - "Oi {{primeiro_nome}}, aqui é {{nome_vendedor}}" saiu como "Oi Teste, aqui é
    Admin Teste B11".
  - A mensagem rápida saiu como "Segue nossa tabela, Teste".
  - O PDF saiu como documento, com o nome `tabela-b11-07.pdf`.
- **No celular de trabalho**, conferido pelo Luan, as 3 chegaram. O PDF chegou
  às 18h30 como documento, com o nome original, quando a fila do gateway liberou.
