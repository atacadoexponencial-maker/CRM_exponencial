# B48-18: Rótulos que dizem a mesma coisa do mesmo jeito

**Tipo:** Correção
**Página:** Funis, Pipeline, Contatos, Catálogo, Campos personalizados, Mensagens rápidas, Alertas, Campanhas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **C-02**, **C-03**, **C-12**, **C-18**, **C-26**, **C-27**, **C-29**, **C-33** e **C-35**
**Gravidade:** Clareza

## Descrição

Rótulos diferentes para a mesma coisa, ou que não batem com o estado da tela.

## Pronto quando

Os rótulos listados no CA-B48-45 ficam iguais e claros.

## Critérios de aceite

- **CA-B48-45** (automática) — Rótulos padronizados. Dado as telas com rótulo confuso, quando cada uma é desenhada, então o menu e o Pipeline dizem "Funis" nos dois (C-02); Novo lead e Novo contato pedem nome e depois telefone, os dois com nome obrigatório (C-03); o catálogo publicado mostra "Tirar a loja do ar", e o fora do ar, "Publicar a loja" (C-18); os tipos de campo são "Uma opção" e "Várias opções" (C-26), com exemplo em cinza (C-27); o campo da mensagem rápida é "Atalho (digite / no chat)" (C-29); o X dos alertas é "Dispensar" (C-33); a faixa de filtros salvos se chama "Filtros salvos" e o menu dela diz "Editar" e "Apagar" (C-12); a campanha tem "Ver todos os N" na lista de destinatários (C-35)

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. C-02: o link do Pipeline para a gestão de funis diz "Funis", como o menu.
2. C-03: o Novo lead pede "Nome" e depois "WhatsApp", como o Novo contato. Sem nome, a tela diz "Nome é obrigatório" e o servidor recusa com "Informe o nome do contato.", a mesma mensagem do Novo contato.
3. C-18: com a loja no ar, o botão diz "Tirar a loja do ar"; fora do ar, "Publicar a loja". Vale ao salvar, como o caixa de seleção de antes, e o aviso "Salve para fechar/abrir a loja" continua.
4. C-26/C-27: os tipos são "Uma opção" e "Várias opções"; as opções do campo novo trazem exemplo "Ex.: Varejo", "Ex.: Atacado", em cinza e vazias.
5. C-29: o campo e a coluna da mensagem rápida dizem "Atalho (digite / no chat)" e "Atalho".
6. C-33: o X do alerta vira o botão escrito "Dispensar".
7. C-12: a faixa se chama "Filtros salvos" e o menu de cada filtro diz "Editar" (o que antes era "Renomear") e "Apagar".
8. C-35: a lista de destinatários da campanha mostra os 5 primeiros e "Ver todos os N"; o botão abre a lista inteira.

### Edge Cases
- Com mais destinatários que a amostra (50), "Ver todos" pede a lista inteira ao servidor (`contarDestinatarios(segmento, true)`); com tudo já na amostra, não volta ao servidor.
- Mudar o filtro da campanha volta a lista aos 5 primeiros.
- O teste antigo "lead sem nome: nada muda no contato" (QA C3) passou a esperar a recusa, porque o nome virou obrigatório; o caso "contato existente mantém o nome" continua coberto.

### Cenário de Erro
- Novo lead sem nome: recusado na tela e no servidor, sem criar contato nem card.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-45 | automática | `src/test/rotulos-padronizados.test.tsx` | Os nove rótulos de C-02, C-03, C-12, C-18, C-26, C-27, C-29, C-33 e C-35 na tela; o servidor recusa Novo lead sem nome; "Ver todos" abre a lista e, se preciso, pede tudo ao servidor |

## Arquivos

- **Criar:** `src/test/rotulos-padronizados.test.tsx` — CA-B48-45.
- **Modificar:** `src/app/(auth)/pipeline/components/cabecalho-do-pipeline.tsx` — "Funis".
- **Modificar:** `src/app/(auth)/pipeline/components/modal-novo-lead.tsx` — nome e depois WhatsApp, nome obrigatório.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `criarNovoLead` recusa sem nome.
- **Modificar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — "Tirar a loja do ar" / "Publicar a loja".
- **Modificar:** `src/lib/campos-personalizados.ts` — "Uma opção" e "Várias opções".
- **Modificar:** `src/app/(auth)/configuracoes/campos/actions.ts` — mensagem com os nomes novos dos tipos.
- **Modificar:** `src/app/(auth)/configuracoes/campos/campos-client.tsx` — exemplo "Ex.: …" nas opções.
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — "Atalho (digite / no chat)".
- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — "Dispensar".
- **Modificar:** `src/app/(auth)/contatos/components/faixa-filtros-salvos.tsx` — "Filtros salvos" e "Editar".
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — `contarDestinatarios(segmento, todos)`.
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — 5 primeiros e "Ver todos os N".
- **Modificar:** `src/test/esc-fecha-e-salvar-confirma.test.tsx` — Novo lead com nome.
- **Modificar:** `src/test/pipeline-novo-lead-nome-do-contato.test.ts` — lead sem nome é recusado.
- **Modificar:** `src/test/campos-personalizados-variaveis-tela.test.tsx` — rótulo do atalho.
- **Modificar:** `src/test/campos-personalizados.integration.test.ts` — nomes dos tipos.

## Checklist

- [x] Nove rótulos trocados
- [x] Nome obrigatório no Novo lead, na tela e no servidor
- [x] "Ver todos os N" na campanha
- [x] Testes antigos acompanhando os rótulos novos
- [x] Teste do CA-B48-45 passando, tsc e lint
