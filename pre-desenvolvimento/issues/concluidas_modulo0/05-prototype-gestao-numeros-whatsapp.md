# 05: Protótipo — Gestão de Números de WhatsApp

**Tipo:** Protótipo
**Página:** Gestão de Números de WhatsApp

## Descrição

Criar o layout da área de conexão e gestão do número de WhatsApp via API Oficial: exibição do número conectado, status, botão de conectar e ações de desconectar/reconectar.

## Cenários

### Happy Path — Número conectado
1. Usuário autenticado acessa `/configuracoes/whatsapp`
2. Vê card exibindo o número conectado: número formatado, nome de exibição e badge de status "Conectado"
3. Vê botão "Conectar número" desabilitado (já há um número conectado)
4. Vê botões de ação: "Desconectar" e "Reconectar" (reconectar aparece desabilitado quando conectado)

### Happy Path — Sem número conectado
1. Vê estado vazio: mensagem "Nenhum número conectado"
2. Vê botão "Conectar número" habilitado

### Edge Cases
- Badge de status com cores distintas: verde para Conectado, vermelho para Desconectado
- Botão "Conectar número" desabilitado visualmente quando número já conectado

### Cenário de Erro
- Nesta issue apenas o protótipo é criado — sem fluxo real de conexão

## Banco de Dados

Não aplicável — issue de protótipo (dados mockados).

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — Página de gestão de números de WhatsApp com dados mockados (estado: número conectado)

> `src/app/(auth)/layout.tsx` já criado na issue 03.
> `<Badge>` já disponível em `src/components/ui/badge.tsx` (instalado na issue 03).
> `<Button>` já existe em `src/components/ui/button.tsx`.

## Dependências Externas

Nenhuma — todos os componentes necessários já estarão disponíveis após a issue 03.

## Checklist

- [x] Criar `src/app/(auth)/configuracoes/whatsapp/page.tsx` com dados mockados (número conectado)
- [x] Card com: número formatado (ex. +55 11 99999-9999), nome de exibição e badge de status
- [x] Usar `<Badge>` de `src/components/ui/badge.tsx` para status (Conectado / Desconectado)
- [x] Usar `<Button>` de `src/components/ui/button.tsx` para "Conectar número" (desabilitado no estado mockado)
- [x] Botões "Desconectar" e "Reconectar" com estado visual correto (reconectar desabilitado quando conectado)
- [x] Estado vazio (sem número) representado visualmente como alternativa no mesmo arquivo (comentado ou via prop mockada)
