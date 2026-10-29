# B49-02: Envio e limpeza não dependem mais do link aberto

**Tipo:** Implementação
**Página:** Chat, Campanhas e Automações
**Spec:** `pre-desenvolvimento/spec-anexos-do-chat-privados.md`

## Descrição

O envio pelo chat, a campanha e a automação passam à Meta e ao gateway um link gerado
na hora de cada envio, em vez do endereço aberto guardado. A regra da B47 sobre anexo
de campanha, a lixeira e a limpeza dos arquivos de automação passam a reconhecer o
formato novo, sem deixar de reconhecer o antigo.

## Pronto quando

Mandar mídia pelo chat, disparar uma campanha com anexo e rodar uma automação com
arquivo funcionam sem depender do endereço aberto. Apagar contato da lixeira e limpar
arquivos sem uso continuam achando os arquivos.

## Critérios de aceite

- **CA-B49-09** (automática) — O envio pelo chat entrega um link que abre. Dado o atendente mandando foto, áudio, vídeo ou documento pelo chat, quando o CRM passa o arquivo para a Meta ou para o gateway, então o link passado abre sem login (é o que a Meta e o gateway baixam).
- **CA-B49-10** (automática) — Campanha manda um link novo na hora de cada envio. Dado uma campanha com anexo, criada mais de 1 hora antes do envio, quando o envio de um destinatário acontece, então o link passado abre (é gerado nesse momento, não o da criação).
- **CA-B49-11** (automática) — Automação manda um link novo na hora de executar. Dado uma automação com o bloco de enviar arquivo, configurada mais de 1 hora antes, quando ela executa para um contato, então o link passado abre (é gerado nesse momento).
- **CA-B49-12** (automática) — Anexo de campanha continua preso à empresa. Dado uma campanha cujo anexo aponta para um arquivo de outra empresa, ou de fora da pasta de campanhas, no endereço gravado ou num link assinado (o que a tela passou a receber), quando ela é salva ou chega a hora do envio, então salvar é recusado e o envio é interrompido, como na B47.
- **CA-B49-14** (automática) — Apagar da lixeira leva os arquivos junto. Dado um contato na lixeira com mídias recebidas e enviadas, inclusive enviadas depois da mudança, quando ele é apagado de vez, então os arquivos das mensagens dele somem do armazenamento, e os de campanha ficam.
- **CA-B49-15** (automática) — A limpeza das automações não apaga arquivo em uso. Dado uma automação que usa um arquivo subido pelo editor depois da mudança, e um arquivo que nenhuma automação usa, quando a limpeza roda, então só o arquivo sem uso some.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B49-01 | A Meta e o gateway baixam o arquivo logo depois de receber o pedido de envio, dentro de 1 hora; um link de 1 hora basta para eles | invalidada | O gateway guarda o pedido na fila e só baixa o arquivo quando a mensagem sai (whatsapp-gateway, src/envio/enviador.ts); campanha grande leva dias. Virou a PER-B49-03 (Claude, conferido no código em 29/10/2026) |
| SUP-B49-02 | Mensagens já gravadas com o endereço público não precisam ser regravadas: o CRM tira do endereço antigo o caminho do arquivo e gera o link novo (não há clientes reais ainda) | confirmada | Marcelle aprovou a spec em 28/10/2026 com esta suposição exposta; vale a regra dela de não tratar dado antigo enquanto não há clientes reais. O CA-B49-06 prova que as mensagens antigas abrem |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B49-03 | Quanto vale o link entregue à fila do gateway, que só baixa o arquivo quando a mensagem sai? | respondida | 30 dias, só para o gateway; a tela e a Meta continuam com 1 hora (Marcelle, 29/10/2026) |

## Cenários

### Happy Path
1. Chat: o arquivo sobe para o bucket como hoje e a mensagem grava o endereço de sempre. A Meta ou o gateway recebem `linkParaEnvio`: um link assinado, com 1 hora na Meta e 30 dias no gateway.
2. Automação (`enviarWhatsAppComMotivo`, usado por `enviarArquivo`): o endereço guardado no fluxo vira um link assinado no momento da execução.
3. Campanha: para cada destinatário, logo antes do envio, o endereço gravado na campanha vira um link assinado (`processarCampanha`).
4. A conferência do anexo da campanha (`anexoDaEmpresa`, B47), a lixeira e a limpeza das automações seguem lendo o endereço gravado, que não mudou de formato.

### Edge Cases
- Anexo de outra empresa no fluxo da automação ou no envio: nenhum link é gerado, e a ação falha com o motivo "O arquivo não é da empresa ou não pôde ser preparado para envio".
- Um link assinado gravado direto como anexo da campanha: `anexoDaEmpresa` recusa, e a campanha é interrompida.

### Cenário de Erro
- Falha ao assinar no chat: o atendente vê "Não foi possível preparar o arquivo para envio. Tente de novo." e nada é enviado.
- Falha ao assinar na campanha: o destinatário fica como falhou, com o motivo "Não foi possível preparar o anexo para envio", e a campanha segue para o próximo.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B49-09 | automática | `src/test/anexos-do-chat.integration.test.ts` | imagem, documento, vídeo e áudio enviados pelo chat chegam à Meta e ao gateway como link assinado que baixa o arquivo sem login, com 1 hora na Meta e 30 dias no gateway |
| CA-B49-10 | automática | `src/test/anexos-do-envio.test.ts` | numa campanha criada dois dias antes, cada destinatário recebe um link emitido no envio, que baixa o anexo |
| CA-B49-11 | automática | `src/test/anexos-do-chat.integration.test.ts` | o envio da automação passa um link emitido agora, diferente do endereço do fluxo, que baixa o arquivo |
| CA-B49-12 | automática | `src/test/anexos-do-envio.test.ts` | link assinado, arquivo de outra empresa e arquivo fora da pasta de campanhas são recusados por `anexoDaEmpresa`, a mesma conferência do salvar, e a campanha é interrompida sem enviar |
| CA-B49-14 | automática | `src/test/anexos-do-chat.integration.test.ts` | ao apagar da lixeira, somem o arquivo recebido e o enviado depois da mudança, e o de campanha fica |
| CA-B49-15 | automática | `src/test/anexos-limpeza-automacoes.test.ts` | com o endereço que o editor recebe ao subir o arquivo no fluxo, a limpeza apaga só o arquivo sem uso |

## Banco de Dados

Nada muda no banco. Campanhas, fluxos e mensagens continuam gravando o endereço de sempre.

## Arquivos

- **Modificar:** `src/lib/anexos-do-chat.ts` — `linkParaEnvio`, validade de 30 dias para o gateway e o aviso do chat
- **Modificar:** `src/app/(auth)/chat/actions.ts` — os quatro envios de mídia passam o link assinado
- **Modificar:** `src/lib/whatsapp-envio.ts` — o envio de mídia das automações passa o link assinado
- **Modificar:** `src/lib/campanhas.ts` — o link nasce na hora de cada destinatário
- **Modificar:** `src/test/campanhas-envio-reconfere.test.ts` — o CA-B47-04 passa a esperar o link assinado
- **Modificar:** `src/test/automacoes-banco-falso.ts` — o banco falso das automações ganha o link assinado do armazenamento
- **Modificar:** `src/test/automacoes-envio.test.ts` — o envio de documento da automação passa a esperar o link assinado
- **Modificar:** `src/test/chat-envio-seguro.test.ts` — o armazenamento falso devolve o endereço do bucket e assina
- **Modificar:** `src/test/chat-envio-automacoes.test.ts` — o armazenamento falso devolve o endereço do bucket e assina
- **Modificar:** `src/test/anexos-do-chat.integration.test.ts` — testes CA-B49-09, 11 e 14
- **Criar:** `src/test/anexos-do-envio.test.ts` — testes CA-B49-10 e 12
- **Criar:** `src/test/anexos-limpeza-automacoes.test.ts` — teste CA-B49-15

## Checklist

- [x] `linkParaEnvio` em `src/lib/anexos-do-chat.ts` (1 hora na Meta, 30 dias no gateway, só da própria empresa)
- [x] Chat, automação e campanha mandam o link assinado
- [x] CA-B47-04 ajustado ao link assinado
- [x] Testes da tabela Prova passando
- [x] Testes vizinhos rodados (L-05) e tsc sem erro (L-07)
