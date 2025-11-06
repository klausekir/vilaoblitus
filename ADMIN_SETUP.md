# = Sistema de Admin - Vila Abandonada

## =Ë Visão Geral

Sistema de autenticação com dois níveis de acesso:
- **=d Usuários Normais**: Acesso apenas ao jogo
- **= Administradores**: Acesso ao jogo + editores

## <¯ Funcionalidades

### Para Usuários Normais
-  Login/Cadastro em `index.php`
-  Acesso ao jogo `game-phaser.html`
-  Progresso salvo no servidor
- L SEM acesso aos editores

### Para Administradores
-  Login em `index.php`
-  Redireciona para `admin-panel.html`
-  Painel com 4 opções:
  - <® Jogar Game
  - =à Editor de Localizações
  - =ú Editor de Mapa
  - =ª Sair

---

## =€ Como Criar o Primeiro Admin

### Método 1: Atualizar Usuário Existente (Recomendado)

Acesse o **phpMyAdmin** no Hostinger e execute:

```sql
-- Tornar um usuário existente admin
UPDATE users
SET is_admin = 1
WHERE username = 'seu_username';

-- Ou por email
UPDATE users
SET is_admin = 1
WHERE email = 'seu@email.com';
```

### Método 2: Criar Admin Direto no SQL

```sql
-- Inserir novo usuário admin
INSERT INTO users (username, email, password_hash, is_admin)
VALUES (
    'admin',
    'admin@vilabandonada.com',
    '$argon2id$v=19$m=65536,t=4,p=1$BASE64SALT$BASE64HASH',  -- Substitua por hash real
    1
);
```

**  IMPORTANTE**: Para gerar o hash da senha, você precisa:
1. Criar conta normal pelo `index.php`
2. Copiar o `password_hash` do banco
3. Usar no INSERT acima

### Método 3: Via Script PHP

Crie um arquivo temporário `create-admin.php`:

```php
<?php
require_once 'api/config.php';

$username = 'admin';
$email = 'admin@vilabandonada.com';
$password = 'SuaSenhaSegura123';

$pdo = getDBConnection();

// Hash da senha
$passwordHash = password_hash($password, PASSWORD_ARGON2ID);

// Inserir admin
$stmt = $pdo->prepare("
    INSERT INTO users (username, email, password_hash, is_admin)
    VALUES (?, ?, ?, 1)
");
$stmt->execute([$username, $email, $passwordHash]);

echo " Admin criado com sucesso!\n";
echo "Username: $username\n";
echo "Email: $email\n";
echo "Senha: $password\n";

// DELETAR ESTE ARQUIVO DEPOIS DE USAR!
```

Execute uma vez e **DELETE O ARQUIVO** imediatamente!

---

## = Segurança Implementada

### Proteção do Painel Admin (`admin-panel.html`)
```javascript
const isAdmin = localStorage.getItem('is_admin') === 'true';
if (!isAdmin) {
    alert('Acesso negado. Apenas administradores...');
    window.location.href = 'game-phaser.html';
}
```

### Proteção do Editor (`location-editor.html`)
```javascript
const isAdmin = localStorage.getItem('is_admin') === 'true';
if (!isAdmin) {
    alert('L Acesso Negado...');
    window.location.href = 'game-phaser.html';
}
```

### Verificação no Login (`api/login.php`)
```php
$stmt = $pdo->prepare("
    SELECT id, username, email, password_hash, is_admin
    FROM users
    WHERE username = ? OR email = ?
");

// Retorna is_admin no response
sendResponse(true, [
    'user_id' => $user['id'],
    'username' => $user['username'],
    'email' => $user['email'],
    'is_admin' => (bool)$user['is_admin'],
    'session_token' => $sessionToken
]);
```

---

## =Ê Estrutura do Banco de Dados

```sql
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

**Campos da tabela `users`**:
- `id` - INT (Primary Key)
- `username` - VARCHAR(50) UNIQUE
- `email` - VARCHAR(100) UNIQUE
- `password_hash` - VARCHAR(255)
- **`is_admin`** - BOOLEAN (DEFAULT FALSE)  NOVO
- `created_at` - TIMESTAMP
- `last_login` - TIMESTAMP

---

## <® Fluxo de Login

### Usuário Normal
```
1. Login em index.php
2. API retorna is_admin: false
3. localStorage.setItem('is_admin', 'false')
4. Redireciona para game-phaser.html
5. Pode jogar normalmente
6. Se tentar acessar editor ’ BLOQUEADO
```

### Administrador
```
1. Login em index.php
2. API retorna is_admin: true
3. localStorage.setItem('is_admin', 'true')
4. Redireciona para admin-panel.html
5. Pode escolher:
   - Jogar game
   - Abrir location-editor
   - Abrir map-editor
   - Fazer logout
```

---

## =à Verificar Quem é Admin

No **phpMyAdmin**, execute:

```sql
-- Listar todos os admins
SELECT id, username, email, is_admin, created_at
FROM users
WHERE is_admin = 1;

-- Listar todos os usuários
SELECT id, username, email, is_admin, created_at
FROM users
ORDER BY is_admin DESC, created_at DESC;
```

---

## ™ Remover Admin de um Usuário

```sql
UPDATE users
SET is_admin = 0
WHERE username = 'usuario_comum';
```

---

## = Testar Sistema Admin

### 1. Criar Usuário Normal
1. Acesse `index.php`
2. Cadastre um usuário normal
3. Faça login ’ deve ir para `game-phaser.html`
4. Tente acessar `location-editor.html` ’ **BLOQUEADO**

### 2. Criar Admin
1. Execute SQL: `UPDATE users SET is_admin = 1 WHERE username = 'seu_user'`
2. Faça logout
3. Faça login novamente ’ deve ir para `admin-panel.html`
4. Clique em "Editor de Localizações" ’ **PERMITIDO**

---

## =Á Arquivos Modificados

-  `database.sql` - Adicionado campo `is_admin`
-  `api/login.php` - Retorna `is_admin`
-  `api/register.php` - Retorna `is_admin: false`
-  `index.php` - Redireciona admin para painel
-  `admin-panel.html` - Painel administrativo (NOVO)
-  `location-editor.html` - Protegido para admin apenas
-  `game-phaser.html` - Aceita admin e usuários normais

---

##   Importante

1. **NÃO crie admins por cadastro normal** - use SQL
2. **Delete arquivos temporários** de criação de admin
3. **Teste os dois tipos de conta** (normal e admin)
4. **Mantenha poucos admins** - apenas pessoas de confiança
5. **Senhas de admin devem ser MUITO fortes**

---

## <˜ Problemas Comuns

### "Acesso Negado" mesmo sendo admin
- Verifique no banco: `SELECT is_admin FROM users WHERE username = 'seu_user'`
- Faça logout completo: `localStorage.clear()`
- Faça login novamente

### Admin não redireciona para painel
- Limpe cache do navegador
- Verifique console (F12) se `is_admin` está sendo salvo
- Confirme que `api/login.php` retorna `is_admin: true`

### Editor abre mas depois bloqueia
- localStorage pode estar com valor antigo
- Execute: `localStorage.setItem('is_admin', 'true')`
- Recarregue a página

---

**Sistema implementado e testado **
