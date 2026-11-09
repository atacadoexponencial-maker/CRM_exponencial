// B20-02: o mesmo texto no erro do login e no aviso de quem foi derrubado pelo middleware.
export const AVISO_CONTA_DESATIVADA = "Esta conta foi desativada. Fale com o administrador da sua empresa."

// B20-05: freio de tentativas — mesmo texto no cadastro e no login, sem dizer se o e-mail existe.
export const AVISO_MUITAS_TENTATIVAS = "Muitas tentativas. Aguarde alguns minutos e tente de novo."

// Pista 10 da auditoria run-2: o e-mail com muitas senhas erradas pede a conferência
// humana em vez de travar. Vale para qualquer e-mail, exista a conta ou não.
export const AVISO_CONFIRME_QUE_E_PESSOA =
  "Muitas tentativas neste e-mail. Aguarde a conferência de segurança e clique em Entrar de novo."
