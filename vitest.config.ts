import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { conferirBancoDosTestes, lerEnvTeste } from './supabase/banco-de-teste/comum.mjs'

// B46-02: os testes usam o banco de teste do .env.teste.local, por cima do .env.local.
// Variável que já vem do processo (ex.: um teste que chama o Vitest) vale mais.
const VARIAVEIS_DO_BANCO = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']

function variaveisDoBancoDeTeste(): Record<string, string> {
  try {
    const teste = lerEnvTeste()
    return Object.fromEntries(VARIAVEIS_DO_BANCO.filter((k) => teste[k]).map((k) => [k, teste[k]]))
  } catch {
    // Sem .env.teste.local: fica o .env.local, e a trava abaixo recusa a produção.
    return {}
  }
}

export default defineConfig(async ({ mode }) => {
  const doProcesso = Object.fromEntries(
    VARIAVEIS_DO_BANCO.filter((k) => process.env[k]).map((k) => [k, process.env[k] as string]),
  )
  const env = { ...loadEnv(mode, process.cwd(), ''), ...variaveisDoBancoDeTeste(), ...doProcesso }
  await conferirBancoDosTestes(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      env,
      // e2e/ é do Playwright — não deve ser coletado pelo Vitest
      // `.claude/worktrees/` guarda cópias do repo criadas por agentes em
      // paralelo. Sem excluí-las, a suíte roda N vezes e os testes de
      // integração estouram o limite de autenticação do Supabase.
      exclude: ['**/node_modules/**', 'e2e/**', '.claude/worktrees/**'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
