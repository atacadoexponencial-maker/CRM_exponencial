import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
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
