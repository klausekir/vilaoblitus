# =€ Deploy para Hostinger - Vila Abandonada

## =Ë Situação Atual

**Local (seu PC):**  Todos os arquivos atualizados com sistema de autenticação
**Hostinger:** L Versão antiga sem autenticação

## <¯ Objetivo

Enviar todos os arquivos do GitHub para o servidor Hostinger.

---

## =' Opção 1: Git Pull (Recomendado)

### Se o Git já estiver instalado no Hostinger:

1. **Acesse o Terminal SSH** no painel Hostinger
   - Painel Hostinger ’ Advanced ’ SSH Access

2. **Execute os comandos:**
```bash
# Navegar até a pasta do site
cd ~/public_html

# Se já existe um repositório git
git pull origin main

# Se NÃO existe repositório git ainda
git init
git remote add origin https://github.com/klausedu/explorandoavilaoblitus.kirner.com.br.git
git pull origin main
```

3. **Configurar permissões:**
```bash
chmod 755 public_html
chmod 644 *.php *.html
chmod 755 api
chmod 644 api/*.php
```

---

## =' Opção 2: File Manager do Hostinger

### Passo a Passo:

1. **Acesse o File Manager**
   - Painel Hostinger ’ Files ’ File Manager

2. **Navegue até `public_html`**

3. **Faça backup da versão atual** (se houver)
   - Selecione todos os arquivos
   - Clique em "Compress" ’ Criar `backup_old.zip`

4. **Delete arquivos antigos** (opcional)
   - Ou sobrescreva com os novos

5. **Faça upload dos arquivos novos:**

   **Arquivos PHP principais:**
   - `index.php`  **IMPORTANTE** (tela de login)
   - `admin-panel.html`  **NOVO**
   - `game-phaser.html`
   - Outros HTML (game.html, location-editor.html, etc)

   **Pasta `api/` completa:**
   - `api/config.php` (copie de `api/config.example.php` e configure)
   - `api/login.php`
   - `api/register.php`
   - `api/save-progress.php`
   - `api/load-progress.php`
   - `api/logout.php`

   **Pasta `js/` completa:**
   - `js/map.js`
   - `js/phaser/managers/GameStateManager.js`  **ATUALIZADO**
   - `js/phaser/managers/UIManager.js`  **ATUALIZADO**
   - `js/phaser/scenes/BootScene.js`
   - `js/phaser/scenes/LocationScene.js`
   - `js/phaser/config.js`

   **Pasta `images/`:**
   - `images/capa.png`  **NOVO** (background do login)
   - Outras imagens

   **Arquivos SQL e Docs:**
   - `database.sql`
   - `ADMIN_SETUP.md`
   - `SETUP.md`

---

## =' Opção 3: FTP (FileZilla)

1. **Baixe FileZilla** (se não tiver)
   - https://filezilla-project.org/

2. **Conecte no Hostinger:**
   - Host: `ftp.seudominio.com`
   - Usuário: (fornecido pelo Hostinger)
   - Senha: (fornecida pelo Hostinger)
   - Porta: 21

3. **Navegue até `/public_html`**

4. **Arraste os arquivos do PC para o servidor**
   - Selecione a pasta `C:\src\claude_oblitus2`
   - Arraste tudo para `/public_html`

---

## =Ê Configurar Banco de Dados

### 1. Criar o Banco (se ainda não existe)

**Painel Hostinger ’ Databases ’ MySQL Databases**

1. Clique em "Create Database"
2. Nome: `vila_abandonada` (ou outro nome)
3. Anote:
   - Nome do banco
   - Usuário MySQL
   - Senha MySQL
   - Host (geralmente `localhost`)

### 2. Executar SQL

**Painel Hostinger ’ Databases ’ phpMyAdmin**

1. Selecione o banco `vila_abandonada`
2. Vá na aba **SQL**
3. **Copie e cole** o conteúdo de `database.sql`
4. Clique em **Execute**

Isso criará as tabelas:
- `users`
- `game_progress`
- `user_sessions`

### 3. Configurar `api/config.php`

No servidor, edite o arquivo `api/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u123456789_vila');  //  SEU BANCO
define('DB_USER', 'u123456789_user');  //  SEU USUÁRIO
define('DB_PASS', 'SuaSenhaMySQL123'); //  SUA SENHA
```

**  IMPORTANTE:** Use as credenciais fornecidas pelo Hostinger!

---

## =d Criar Primeiro Admin

### Opção A: Via SQL (Recomendado)

1. Acesse `index.php` e **cadastre uma conta normal**
2. No **phpMyAdmin**, execute:

```sql
UPDATE users
SET is_admin = 1
WHERE email = 'seu@email.com';
```

3. Faça **logout** e **login** novamente
4. Você será redirecionado para o **painel admin** 

### Opção B: Via Console

No phpMyAdmin, vá em SQL e execute:

```sql
-- Ver todos os usuários
SELECT id, username, email, is_admin FROM users;

-- Tornar admin pelo username
UPDATE users SET is_admin = 1 WHERE username = 'seu_user';

-- Tornar admin pelo email
UPDATE users SET is_admin = 1 WHERE email = 'admin@exemplo.com';
```

---

##  Verificar se Funcionou

### 1. Teste o Login
- Acesse: `https://explorandoavilaoblitus.kirner.com.br/index.php`
- Deve aparecer a **tela de login moderna** com a capa de fundo 

### 2. Criar Conta de Teste
- Clique em "Cadastro"
- Crie uma conta
- Deve redirecionar para `game-phaser.html` 

### 3. Testar Admin
- Execute SQL para tornar seu usuário admin
- Faça logout e login
- Deve ir para `admin-panel.html` 
- Deve ver badge **[ADMIN]** no jogo 

---

## = Problemas Comuns

### "Location not found: forest_entrance"
Execute no SQL:
```sql
UPDATE game_progress
SET current_location = 'floresta'
WHERE current_location = 'forest_entrance';
```

### "Database connection failed"
- Verifique `api/config.php`
- Confirme credenciais do MySQL
- Teste conexão no phpMyAdmin

### "index.php baixa em vez de executar"
- Verifique se PHP está ativo no Hostinger
- Acesse via `https://` não `file://`

### Acentos quebrados
- Certifique-se que `database.sql` foi executado
- Charset deve ser `utf8mb4_unicode_ci`

### Não redireciona para admin-panel
- Limpe cache: `localStorage.clear()` no console
- Faça logout e login novamente
- Verifique se `is_admin = 1` no banco

---

## =Á Lista de Arquivos Essenciais

###   CRÍTICOS (sem eles não funciona):

```
 index.php                  # Tela de login
 admin-panel.html           # Painel admin
 game-phaser.html           # Jogo
 api/config.php             # Configuração DB
 api/login.php              # API login
 api/register.php           # API cadastro
 api/save-progress.php      # API salvar
 api/load-progress.php      # API carregar
 database.sql               # Estrutura do banco
 js/map.js                  # Dados do jogo
 js/phaser/managers/UIManager.js
 js/phaser/managers/GameStateManager.js
 images/capa.png            # Background login
```

### =Ý OPCIONAIS (documentação):
```
SETUP.md
ADMIN_SETUP.md
FIX_LOCATION_ERROR.md
```

---

## <¯ Ordem de Deploy

1.  Criar banco de dados MySQL
2.  Fazer upload dos arquivos
3.  Configurar `api/config.php`
4.  Executar `database.sql` no phpMyAdmin
5.  Testar `index.php` (deve mostrar tela de login)
6.  Criar conta de teste
7.  Tornar usuário admin via SQL
8.  Testar painel admin

---

## <˜ Precisa de Ajuda?

1. **Console do navegador (F12)** - Ver erros JavaScript
2. **phpMyAdmin** - Verificar estrutura do banco
3. **Verificar se arquivos foram enviados** - File Manager
4. **Testar APIs manualmente** - Postman ou navegador

---

**Boa sorte com o deploy! =€**
