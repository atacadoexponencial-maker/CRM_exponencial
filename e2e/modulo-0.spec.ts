import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { loadEnvConfig } from "@next/env"

// O Playwright não lê o .env.local; a limpeza precisa da chave de serviço.
loadEnvConfig(process.cwd())

/** Apaga a empresa criada pelo cadastro a partir do e-mail do admin: times, perfil, login e empresa. */
async function apagarEmpresaDoLogin(email: string) {
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
  const user = data.users.find((u) => u.email === email)
  if (!user) return

  const { data: perfil } = await service.from("profiles").select("workspace_id").eq("id", user.id).single()
  await service.from("user_teams").delete().eq("user_id", user.id)
  await service.from("profiles").delete().eq("id", user.id)
  await service.auth.admin.deleteUser(user.id)
  if (!perfil) return

  // A empresa não apaga em cascata os próprios times e sequências.
  await service.from("sequences").delete().eq("workspace_id", perfil.workspace_id)
  await service.from("teams").delete().eq("workspace_id", perfil.workspace_id)
  await service.from("workspaces").delete().eq("id", perfil.workspace_id)
}

// ─────────────────────────────────────────────
// Fluxo 1 — Cadastro completo (issues 07–12)
// ─────────────────────────────────────────────

test.describe.serial("Fluxo 1 — Cadastro completo (issues 07–12)", () => {
  let emailCriado: string
  const senhaValida = "Senha12345"

  test.afterAll(async () => {
    if (emailCriado) await apagarEmpresaDoLogin(emailCriado)
  })

  test("should complete cadastro, show teams, and verify admin access", async ({ page }) => {
    emailCriado = `cadastro-e2e-${Date.now()}@teste.com`

    await page.goto("/cadastro")
    await page.fill("#nome-empresa", "Empresa E2E Ltda")
    await page.fill("#nome-responsavel", "Admin E2E")
    await page.fill("#email", emailCriado)
    await page.fill("#senha", senhaValida)
    await page.fill("#confirmar-senha", senhaValida)
    await page.click('button[type="submit"]')

    // Passo 4: verifica redirecionamento para rota autenticada
    await page.waitForURL("**/configuracoes/whatsapp", { timeout: 20000 })
    await expect(page).toHaveURL(/\/configuracoes\/whatsapp/)

    // Passo 5: verifica que os times Entrada e Recompra existem
    await page.goto("/configuracoes/times")
    await expect(page.getByText("Entrada")).toBeVisible()
    await expect(page.getByText("Recompra")).toBeVisible()

    // Passo 6: verifica que o Admin acessa a rota protegida sem ser redirecionado
    await page.goto("/configuracoes/usuarios")
    await expect(page).toHaveURL(/\/configuracoes\/usuarios/)
  })

  test("should show error for duplicate email", async ({ page }) => {
    await page.goto("/cadastro")
    await page.fill("#nome-empresa", "Outra Empresa")
    await page.fill("#nome-responsavel", "Outro Admin")
    await page.fill("#email", emailCriado)
    await page.fill("#senha", senhaValida)
    await page.fill("#confirmar-senha", senhaValida)
    await page.click('button[type="submit"]')

    await expect(page.getByText("E-mail já está em uso")).toBeVisible({ timeout: 10000 })
  })

  test("should show error when passwords do not match", async ({ page }) => {
    await page.goto("/cadastro")
    await page.fill("#nome-empresa", "Empresa Teste")
    await page.fill("#nome-responsavel", "Responsável")
    await page.fill("#email", `mismatch-${Date.now()}@teste.com`)
    await page.fill("#senha", "Senha12345")
    await page.fill("#confirmar-senha", "SenhaErrada")
    await page.click('button[type="submit"]')

    await expect(page.getByText("As senhas não coincidem")).toBeVisible()
  })

  test("should show validation errors for empty fields", async ({ page }) => {
    await page.goto("/cadastro")
    await page.click('button[type="submit"]')

    await expect(page.getByText("Nome da empresa é obrigatório")).toBeVisible()
    await expect(page.getByText("Nome do responsável é obrigatório")).toBeVisible()
  })
})

// ─────────────────────────────────────────────
// Fluxo 2 — Login (issue 13)
// ─────────────────────────────────────────────

test.describe.serial("Fluxo 2 — Login (issue 13)", () => {
  const emailLogin = `login-e2e-${Date.now()}@teste.com`
  const senhaLogin = "Senha12345"

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto("/cadastro")
    await page.fill("#nome-empresa", "Empresa Login E2E")
    await page.fill("#nome-responsavel", "Admin Login")
    await page.fill("#email", emailLogin)
    await page.fill("#senha", senhaLogin)
    await page.fill("#confirmar-senha", senhaLogin)
    await page.click('button[type="submit"]')
    await page.waitForURL("**/configuracoes/whatsapp", { timeout: 20000 })
    await page.close()
  })

  test.afterAll(async () => {
    await apagarEmpresaDoLogin(emailLogin)
  })

  test("should login with valid credentials and redirect to /configuracoes/whatsapp", async ({ page }) => {
    await page.goto("/login")
    await page.fill("#email", emailLogin)
    await page.fill("#senha", senhaLogin)
    await page.click('button[type="submit"]')

    await page.waitForURL("**/configuracoes/whatsapp", { timeout: 20000 })
    await expect(page).toHaveURL(/\/configuracoes\/whatsapp/)
  })

  test("should show generic error for wrong credentials", async ({ page }) => {
    await page.goto("/login")
    await page.fill("#email", emailLogin)
    await page.fill("#senha", "senha-errada-123")
    await page.click('button[type="submit"]')

    await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible({ timeout: 10000 })
  })

  test("should show generic error for non-existent email", async ({ page }) => {
    await page.goto("/login")
    await page.fill("#email", "nao-existe@teste.com")
    await page.fill("#senha", senhaLogin)
    await page.click('button[type="submit"]')

    await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible({ timeout: 10000 })
  })

  // Aguarda issue 19 (Desativar usuário) para implementação completa
  test.fixme("should show generic error for disabled user", async ({ page }) => {
    await page.goto("/login")
    // Setup: desativar usuário via admin API (issue 19)
    // Then attempt login and verify generic error
  })
})
