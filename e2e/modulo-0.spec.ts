import { test, expect } from "@playwright/test"

// ─────────────────────────────────────────────
// Fluxo 1 — Cadastro completo (issues 07–12)
// ─────────────────────────────────────────────

test.describe.serial("Fluxo 1 — Cadastro completo (issues 07–12)", () => {
  let emailCriado: string
  const senhaValida = "Senha12345"

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
    await page.waitForURL("**/configuracoes/usuarios", { timeout: 20000 })
    await expect(page).toHaveURL(/\/configuracoes\/usuarios/)

    // Passo 5: verifica que os times Expansão e Retenção existem
    await page.goto("/configuracoes/times")
    await expect(page.getByText("Expansão")).toBeVisible()
    await expect(page.getByText("Retenção")).toBeVisible()

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
    await page.waitForURL("**/configuracoes/usuarios", { timeout: 20000 })
    await page.close()
  })

  test("should login with valid credentials and redirect to /configuracoes/usuarios", async ({ page }) => {
    await page.goto("/login")
    await page.fill("#email", emailLogin)
    await page.fill("#senha", senhaLogin)
    await page.click('button[type="submit"]')

    await page.waitForURL("**/configuracoes/usuarios", { timeout: 20000 })
    await expect(page).toHaveURL(/\/configuracoes\/usuarios/)
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
