# B54-03: Escolher o número da campanha na etapa da mensagem

**Tipo:** Implementação
**Página:** Campanhas > editor, etapa 2
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-templates-da-meta.md`

## Descrição

O seletor "Enviar pelo número" sai da etapa 3 e vira o primeiro campo da etapa 2. A gravação, a estimativa e o aviso das 24 horas continuam iguais; a etapa 3 fica só com agendamento e estimativa.

## Pronto quando

Numa campanha, o número é escolhido antes de escrever a mensagem, e a etapa 3 mostra a estimativa para o número escolhido sem o seletor.

## Critérios de aceite

- **CA-B54-11** (automática) — O número é escolhido na etapa da mensagem. Dado uma empresa com dois números conectados, quando o Admin abre a etapa 2 de uma campanha, então "Enviar pelo número" é o primeiro campo dela, a etapa 3 não o tem mais, e o número escolhido fica gravado na campanha e vale para a estimativa da etapa 3 (a mesma gravação de hoje).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-05 | Campanhas em rascunho ou agendadas de antes continuam com o número que já tinham; só o lugar do seletor muda. | confirmada | Marcelle, 30/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Na etapa 2 (Mensagem) do `EditorCampanhaClient`, o primeiro campo é "Enviar pelo número": o mesmo `<select id="camp-numero">` de hoje, com "Usar o número conectado da empresa" e os números da empresa, ligado ao mesmo estado `numeroOrigem`.
2. A etapa 3 (Agendamento) perde o seletor e fica com a avaliação do disparo (aviso, aquecimento e estimativa, B8-01/B26-03), que continua sendo calculada ao entrar na etapa 3 com o número escolhido, e com "Quando enviar".
3. Salvar rascunho e confirmar continuam gravando `whatsappConnectionId` como hoje: nada muda no servidor.

### Edge Cases
- Empresa sem número conectado: o aviso "Nenhum número conectado…" aparece na etapa 2, no lugar do seletor; a etapa 3 não mostra avaliação.
- Campanha antiga com número gravado: o seletor já abre com ele (SUP-B54-05).
- O aviso das 24 horas (B53-06) continua reagindo ao número, agora sem sair da etapa.

### Cenário de Erro
- Nenhum novo: os erros de confirmação do servidor são os de hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B54-11 | automática | `src/test/campanhas-numero-na-etapa-2.test.tsx` | com dois números, a etapa 2 abre com "Enviar pelo número" como primeiro campo (antes de "Tipo de mensagem"); a etapa 3 não tem o seletor; trocar o número na etapa 2 e salvar manda esse `whatsappConnectionId` ao servidor e a avaliação da etapa 3 é pedida para ele |

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — o bloco do seletor sai da etapa 3 e vira o primeiro campo da etapa 2; a avaliação fica na etapa 3
- **Modificar:** `src/test/campanhas-aviso-24h-tela.test.tsx` — o teste CA-B53-11 trocava o número na etapa 3; agora troca na 2
- **Criar:** `src/test/campanhas-numero-na-etapa-2.test.tsx` — teste do critério CA-B54-11

## Checklist

- [x] seletor "Enviar pelo número" como primeiro campo da etapa 2
- [x] etapa 3 sem o seletor, com a avaliação do número escolhido
- [x] teste CA-B54-11 e teste da B53-06 ajustado passando; tsc limpo
