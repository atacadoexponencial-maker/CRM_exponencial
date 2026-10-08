# B21-03: Só o Admin gerencia times

**Tipo:** Implementação
**Página:** Configurações › Times
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 2

## Descrição

Criar, renomear e apagar times e pôr ou tirar usuários de um time passam a exigir papel
Admin no banco (hoje a regra só olha a empresa). Ler os times continua liberado para todos
da empresa.

## Pronto quando

O Admin gerencia times como hoje; Gerente e Atendente continuam vendo os times onde já
aparecem; e testes automatizados provam que Gerente e Atendente, direto no banco, não
criam, renomeiam nem apagam time e não mexem em quem está em cada time.
