# B2-04: Acompanhamento do estado da conexão

**Tipo:** Implementação
**Módulo:** B2 — Conexão de Número por QR Code
**Repositório:** `CRM_exponencial`

## Contexto

Depois de ler o código, o cliente fica olhando a tela esperando saber se deu certo. Hoje o CRM não tem essa informação: o estado do número mora no gateway, e a coluna de status do CRM é opinião nossa — a conexão Meta de julho ficou marcada como "connected" por meses depois de o acesso morrer (`pre-desenvolvimento/decisoes/B1-01-camada-de-provider.md`, seção 8.2). Esta issue faz o CRM acompanhar o estado de verdade durante o pareamento, confirmar o número conectado e mostrar falha e banimento com o motivo.

## O que construir

1. **Consulta de estado** ao gateway, pelo backend, durante o pareamento: a tela acompanha até sair de "aguardando leitura" e chegar a conectado ou falhou.
2. **Persistência do estado e do motivo** na conexão do CRM, para a página não depender do gateway a cada carregamento e para o estado sobreviver a um recarregamento.
3. **Confirmação do número**: ao conectar, o gateway informa o telefone e o nome de exibição; os dois passam a aparecer no cartão do número.
4. **Motivo da falha** legível, traduzindo os valores do contrato para português.
5. **Aviso destacado de banimento**, visualmente diferente de "desconectado", porque a consequência é outra: número banido não volta lendo QR de novo.

## Comportamentos da spec cobertos

- [ ] Acompanhar a mudança de estado até a conexão ser concluída
- [ ] Ver o número e o nome de exibição confirmados após conectar
- [ ] Ver o motivo quando a conexão falha
- [ ] Ver aviso destacado quando um número está banido

## Contrato do gateway

Fonte: `whatsapp-gateway/pre-desenvolvimento/contrato-v1.md`, seções 3.3 e 4.1.

| Uso | Método e caminho | Credencial | Devolve |
|---|---|---|---|
| Estado de um número | `GET /instances/{id}` | instância | `{ instance_id, state, phone_number, display_name, created_at, last_connected_at }` |

Evento `instance.state`, cujo `data` tem a mesma forma que esta issue precisa gravar:

```json
{ "state": "connected", "phone_number": "5511777776666", "display_name": "Atacado Exemplo", "reason": null }
```

- `state`: `pairing`, `connecting`, `connected`, `disconnected`, `banned`, `removed`
- `phone_number` e `display_name` vêm preenchidos a partir de `connected`
- `reason` explica transições não solicitadas: `session_closed_on_device`, `banned_by_whatsapp`, `connection_lost`
- Erros: `instance_not_found` (404), `instance_forbidden` (403), `invalid_credentials` (401)

**Divisão com a B6:** durante o pareamento, quem pergunta é o CRM, consultando o endpoint acima — a tela está aberta e a resposta é imediata. Depois de conectado, quem avisa é o gateway, pelo evento `instance.state`, e isso é a issue **B6**. As duas escrevem no mesmo lugar: o estado e o motivo da conexão. Esta issue define esse lugar e a tradução dos valores; a B6 reusa, sem criar um segundo caminho.

## Arquivos

- **Modificar:** `src/lib/whatsapp/gateway/cliente.ts` — consulta de estado da instância
- **Modificar:** `src/lib/whatsapp/gateway/tipos.ts` — os seis estados, os motivos e a tradução para português, num lugar só
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — action que consulta o estado e grava estado, motivo, telefone e nome de exibição na conexão
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/tela-qr-code.tsx` — acompanhar até concluir
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx` — número e nome confirmados, motivo da falha e aviso de banimento
- **Criar:** `src/test/whatsapp-estado-conexao.test.ts` — cada estado, tradução dos motivos e gravação na conexão, com `fetch` falso e banco mockado

Reaproveitar: as colunas de estado e motivo já nascem na migration de B2-02 — **não** criar migration nova. O padrão de acompanhamento em tempo real já existe em `src/app/(auth)/chat/components/chat-layout.tsx`, com `supabase.channel(...)` e `postgres_changes`; se a escolha for realtime em vez de consulta repetida, seguir esse padrão em vez de inventar outro.

## Depende de

- **B2-02** — colunas de estado e motivo, e cliente do gateway
- **B2-03** — pareamento iniciado, que é o que se acompanha

## Critérios de aceite

- [ ] Lendo o QR com o celular, a tela sai de "aguardando leitura" e chega a "conectado" sem o admin recarregar a página
- [ ] Depois de conectado, o cartão mostra o telefone e o nome de exibição informados pelo gateway
- [ ] Recarregar a página mantém o estado, porque ele está gravado no CRM
- [ ] Conexão que falha mostra o motivo em português, não o código cru do contrato
- [ ] Número banido aparece com aviso destacado, distinto de desconectado, e sem oferecer "ler QR de novo" como se resolvesse
- [ ] Estado desconhecido ou não previsto não quebra a tela
- [ ] A consulta de estado recusa quem não é Admin
- [ ] `npm run build`, `npm run lint` e `npm test` passam

## Fora de escopo

- Receber e validar os eventos do gateway — é B6, que vai gravar no mesmo lugar definido aqui
- Detectar conexão morta no canal da Meta — achado registrado, fora deste módulo
- Saúde e risco do número, medidores de consumo e sinal de risco — é B4
- Desconectar, reconectar e remover — é B2-05
