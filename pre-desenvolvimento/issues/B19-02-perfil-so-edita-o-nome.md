# B19-02: Perfil só deixa o usuário editar o próprio nome

**Tipo:** Implementação
**Página:** Perfil (`/perfil`) e Gestão de usuários (`/configuracoes/usuarios`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulos 2 e 3

## Descrição

Fechar a falha que deixa qualquer usuário logado mudar o próprio papel, a própria
situação e a própria empresa direto pelo navegador. O banco passa a aceitar do próprio
usuário apenas a troca do nome; papel, situação e empresa só mudam pelas telas de
Admin, que precisam continuar funcionando.

## Pronto quando

Editar o próprio nome em `/perfil` funciona igual a hoje; o Admin continua mudando
papel, desativando, reativando e adicionando usuários; e testes automatizados provam
que um usuário logado não consegue mudar o próprio papel, a própria empresa, a própria
situação, nem nada no perfil de outra pessoa. A mudança está aplicada no Supabase de
produção.
