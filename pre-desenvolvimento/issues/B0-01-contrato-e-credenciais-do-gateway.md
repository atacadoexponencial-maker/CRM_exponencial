# B0-01: Contrato e credenciais do gateway dentro do CRM

**Tipo:** Implementação
**Módulo:** B0 — Fundação da Parte B
**Repositório:** `CRM_exponencial`

---

## Contexto

O contrato HTTP entre CRM e gateway foi congelado em `whatsapp-gateway`, no arquivo
`pre-desenvolvimento/contrato-v1.md`. Toda a Parte B é implementada contra ele, mas hoje
ele vive **só no outro repositório** — quem toca a Parte B não o recebe ao clonar o CRM.
A própria issue `00-01` do gateway registrou isso como a primeira issue da Parte B.

Junto com o contrato faltam as credenciais: o CRM ainda não tem nenhuma variável de
ambiente do gateway, nem o cliente HTTP que as usa. Sem isso, nenhuma issue de B2 a B8
tem como fazer a primeira chamada.

Esta issue não entrega comportamento visível. Ela existe para as outras não começarem
cada uma inventando o seu jeito de falar com o gateway.

---

## O que construir

1. **Cópia do contrato no CRM**, em `pre-desenvolvimento/contrato-gateway-v1.md`, com a
   origem e a data da cópia declaradas no topo, e a regra de que alteração no contrato
   parte do repositório do gateway e é avisada a quem toca a Parte B.
2. **Variáveis de ambiente do gateway**, declaradas no `.env.example` e validadas onde o
   CRM já valida configuração:
   - `GATEWAY_BASE_URL` — base da API, incluindo `/v1`
   - `GATEWAY_SERVICE_KEY` — credencial de serviço (`X-Gateway-Service-Key`)
   - `GATEWAY_WEBHOOK_SECRET` — segredo que valida a assinatura dos eventos recebidos
3. **Cliente HTTP do gateway**, em `src/lib/whatsapp/gateway/`, responsável por: montar a URL,
   mandar a credencial certa em cada chamada (serviço ou instância), aplicar tempo
   limite, e traduzir o formato de erro do contrato (`{ error: { code, message } }`) em
   algo que o CRM consome sem repetir `fetch` espalhado.

O cliente não conhece regra de negócio: ele é o equivalente do `provider-meta.ts` para o
transporte, não para o comportamento.

---

## Comportamentos da spec cobertos

Nenhum comportamento de tela. É pré-requisito de infraestrutura para os blocos B2 a B8.

---

## Contrato do gateway

- **Seção 1 — Autenticação:** duas credenciais, `X-Gateway-Service-Key` (criar e listar
  instâncias) e `X-Instance-Token` (tudo que se refere a um número). A de serviço **não**
  substitui a de instância.
- **Seção 5 — Erros:** toda recusa devolve `{ error: { code, message } }`, com `code`
  estável para o CRM decidir e `message` legível para mostrar ao atendente.
- **Versionamento:** a versão vive no caminho (`/v1`); mudança quebrante exige aviso à
  Parte B.

---

## Arquivos

- **Criar:** `pre-desenvolvimento/contrato-gateway-v1.md` — cópia do contrato, com origem
  e data
- **Criar:** `src/lib/whatsapp/gateway/cliente.ts` — cliente HTTP, credenciais, tempo limite e
  tradução de erro
- **Criar:** `src/lib/whatsapp/gateway/tipos.ts` — tipos das respostas e o catálogo de `error.code`
  do contrato
- **Criar:** `src/test/gateway-cliente.test.ts` — testes com `fetch` simulado, sem rede
- **Modificar:** `.env.example` — as três variáveis novas, com comentário de para que
  serve cada uma

> O `.env.example` de hoje tem quatro chaves e nenhuma do gateway. Há um
> `GATEWAY_WEBHOOK_SECRET` órfão no `.env` local, não referenciado em `src/` — esta issue
> é o lugar onde ele passa a ter dono.

---

## Depende de

- `B1-01` — camada de provider de WhatsApp (concluída em 17/09/2026)
- Contrato congelado do gateway (`whatsapp-gateway`, issue `00-01`)

---

## Critérios de aceite

- [ ] `pre-desenvolvimento/contrato-gateway-v1.md` existe no CRM e é idêntico em conteúdo
      ao contrato do gateway, com origem e data declaradas
- [ ] As três variáveis estão no `.env.example`, com comentário
- [ ] Nenhuma das três aparece em código de frontend nem em variável com prefixo
      `NEXT_PUBLIC_` — busca no repo comprova
- [ ] O cliente manda `X-Gateway-Service-Key` nas chamadas de serviço e `X-Instance-Token`
      nas de instância, e nunca as duas juntas
- [ ] Recusa do gateway chega ao chamador com o `code` do contrato preservado, não como
      texto solto
- [ ] Tempo limite configurado: chamada que não responde falha em vez de pendurar a
      requisição do CRM
- [ ] `npm run build`, `npm run lint` e `npm test` passam
- [ ] Testes do cliente rodam sem rede e sem banco

---

## Fora de escopo

- Implementar o provider do gateway — é da `B1-02`
- Criar instância, parear ou enviar mensagem — cada um na sua issue
- Receber eventos e validar assinatura — é do bloco B6 (o segredo é só declarado aqui)
- Coluna `provider` em `whatsapp_connections`
- Qualquer alteração em `src/app/api/webhooks/whatsapp/route.ts`
