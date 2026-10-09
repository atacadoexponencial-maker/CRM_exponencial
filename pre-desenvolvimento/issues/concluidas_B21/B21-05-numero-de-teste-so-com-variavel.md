# B21-05: Número de teste da Meta só com a variável ligada

**Tipo:** Implementação
**Página:** Configurações › WhatsApp (tela e assistente de conexão)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 4

## Descrição

O botão "Conectar número de teste" e a ação por trás dele passam a depender de uma variável
de ambiente; desligada (produção), o botão não aparece e a ação recusa. Conexões existentes
não são apagadas.

## Pronto quando

Em produção o botão some da tela e do assistente, e conectar pela Meta ou pelo canal direto
funciona como hoje; com a variável ligada localmente, o botão aparece e funciona; e um teste
automatizado prova que chamar a ação com a variável desligada é recusado sem criar conexão.

## Cenários

> Levantamento de 08/10: o bloco "Usar número de teste" fica no assistente de conexão
> (`wizard-conexao.tsx`); o componente `conectar-teste-button.tsx` não é usado por nenhuma
> tela (passa a ser barrado pela própria ação, sem mudança nele).

### Happy Path
- Produção (variável ausente): o assistente mostra só "Continuar com o Facebook" (e o canal
  direto segue como hoje).
- Local com `HABILITAR_NUMERO_TESTE_META=1` no `.env.local`: o bloco aparece e conecta como hoje.

### Edge Cases
- Empresa que já tem o número de teste conectado: nada é apagado.

### Cenário de Erro
- Ação chamada direto com a variável desligada: "O número de teste não está disponível neste
  ambiente.", sem consultar o banco nem criar conexão.

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/whatsapp/numero-teste.ts` — `numeroTesteHabilitado()` (lê a variável no servidor).
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — `conectarNumeroTeste` recusa com a variável desligada.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/wizard-conexao.tsx` — prop `mostrarNumeroTeste` controla o bloco.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — passa `numeroTesteHabilitado()` ao assistente.
- **Criar:** `src/test/numero-teste-meta.test.tsx` — assistente sem/com variável; ação recusando.

## Checklist

- [x] Variável lida só no servidor
- [x] Ação recusa com a variável desligada
- [x] Assistente esconde o bloco por padrão
- [x] Testes passando
- [x] Código no ar (sem migration)
