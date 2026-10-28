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
- **CA-B49-12** (automática) — Anexo de campanha continua preso à empresa. Dado uma campanha cujo anexo aponta para um arquivo de outra empresa, ou de fora da pasta de campanhas, no formato antigo ou no novo, quando ela é salva ou chega a hora do envio, então salvar é recusado e o envio é interrompido, como na B47.
- **CA-B49-14** (automática) — Apagar da lixeira leva os arquivos junto. Dado um contato na lixeira com mídias gravadas no formato antigo e no novo, quando ele é apagado de vez, então os arquivos das mensagens dele somem do armazenamento, e os de campanha ficam.
- **CA-B49-15** (automática) — A limpeza das automações não apaga arquivo em uso. Dado uma automação que usa um arquivo, gravado no formato novo, e um arquivo que nenhuma automação usa, quando a limpeza roda, então só o arquivo sem uso some.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B49-01 | A Meta e o gateway baixam o arquivo logo depois de receber o pedido de envio, dentro de 1 hora; um link de 1 hora basta para eles | aberta | — |
| SUP-B49-02 | Mensagens já gravadas com o endereço público não precisam ser regravadas: o CRM tira do endereço antigo o caminho do arquivo e gera o link novo (não há clientes reais ainda) | confirmada | Marcelle aprovou a spec em 28/10/2026 com esta suposição exposta; vale a regra dela de não tratar dado antigo enquanto não há clientes reais. O CA-B49-06 prova que as mensagens antigas abrem |

## Perguntas em aberto

Nenhuma.
