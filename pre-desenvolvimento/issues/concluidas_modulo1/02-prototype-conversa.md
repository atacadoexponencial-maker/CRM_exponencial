# 02: Protótipo — Conversa

**Tipo:** Protótipo
**Página:** Conversa

## Descrição

Criar o painel central de chat com cabeçalho da conversa, área de mensagens com balões diferenciados, campo de texto, botões de ação (anexar, áudio, mensagens rápidas, nota interna, enviar) e painel lateral de contato — tudo com dados mock, sem integração backend.

---

## Cenários

### Happy Path
1. Usuário clica em uma conversa na lista → painel direito abre com o histórico de mensagens
2. Histórico exibe balões diferenciados: enviadas à direita, recebidas à esquerda, notas internas em amarelo
3. Mensagens enviadas têm ícone de status (✓ enviado, ✓✓ entregue, ✓✓ azul lido, ⚠ falhou)
4. Usuário digita no campo de texto e pressiona Enter ou clica em Enviar → mensagem aparece no histórico como "enviada"
5. Usuário clica no botão de nota interna → campo muda de modo e mensagem é enviada com visual diferente
6. Usuário clica no nome do contato no cabeçalho → painel lateral desliza com informações básicas
7. Usuário usa busca dentro da conversa → ocorrências ficam destacadas
8. Header exibe status da conversa e dropdown de ações (Atribuir / Transferir / Resolver / Reabrir) conforme o status atual

### Edge Cases
- Conversa sem mensagens → área de mensagens exibe "Nenhuma mensagem ainda"
- Mensagem de reply → exibe trecho da mensagem original acima do texto
- Nenhuma conversa selecionada → painel direito exibe placeholder "Selecione uma conversa para começar"
- Campo de texto vazio → botão de Enviar desabilitado

### Cenário de Erro
Neste protótipo não há integração backend — não há cenários de erro de rede.

---

## Banco de Dados

Não aplicável — dados mock.

---

## Arquivos

- **Criar:** `src/app/(auth)/chat/mock-mensagens.ts` — tipos `Mensagem` e `MOCK_MENSAGENS`: Record de conversaId → Mensagem[]; inclui variedade de tipos (texto, imagem, áudio, documento, nota interna) e direções (enviada/recebida) com status de entrega
- **Criar:** `src/app/(auth)/chat/components/chat-layout.tsx` — Client Component que gerencia `conversaAtivaId` (levantado de `FiltrosCaixa`) e `mensagensLocais` (para envio mock); renderiza sidebar + painel de conversa side-by-side
- **Criar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — Client Component com: cabeçalho (nome, telefone, status badge, dropdown de ações), barra de busca interna (toggle), área de mensagens com scroll automático, barra de input (campo de texto, botões de anexar/áudio/mensagens rápidas/nota interna/enviar), painel lateral de contato (placeholder com nome + telefone, abre ao clicar no nome)
- **Criar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — Client Component para balão individual: direção (esquerda/direita), tipo (texto, imagem, áudio, documento, nota interna), status de entrega, trecho de reply acima quando aplicável
- **Modificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — recebe `conversaAtivaId: string | null` e `onConversaClick: (id: string) => void` como props em vez de gerenciar esse estado internamente
- **Modificar:** `src/app/(auth)/chat/page.tsx` — importa `MOCK_MENSAGENS` e renderiza `<ChatLayout>` passando conversas + mensagens; remove o layout inline atual

---

## Checklist

- [x] Criar `mock-mensagens.ts` com tipo `Mensagem` e `MOCK_MENSAGENS` para todas as 20 conversas
- [x] Criar `chat-layout.tsx` gerenciando `conversaAtivaId` e `mensagensLocais`
- [x] Modificar `filtros-caixa.tsx` para receber `conversaAtivaId` e `onConversaClick` como props
- [x] Modificar `page.tsx` para passar dados ao `ChatLayout`
- [x] Criar `balao-mensagem.tsx` com suporte a todos os tipos e direções
- [x] Criar `painel-conversa.tsx` com cabeçalho, área de mensagens, barra de input e painel lateral de contato (placeholder)
- [x] Scroll automático para o final das mensagens ao abrir conversa
- [x] Envio mock funcional: digitar + Enter/botão adiciona mensagem na lista local
- [x] Modo nota interna altera visual do campo e do balão enviado
- [x] Busca dentro da conversa destaca ocorrências no texto
