# Guia Rápido de Início

Siga estes passos para colocar o jogo no ar rapidamente!

## ⚡ Início Rápido (5 passos)

### 1️⃣ Configure o Banco de Dados MySQL

No painel do Hostinger:
1. Vá em **Bancos de Dados MySQL**
2. Crie um banco chamado `vila_abandonada`
3. Abra **phpMyAdmin**
4. Execute o SQL do arquivo `database.sql` (copie e cole todo o conteúdo)

### 2️⃣ Configure as Credenciais

Edite o arquivo `api/config.php` e altere estas linhas:

```php
define('DB_NAME', 'vila_abandonada');    // Nome do seu banco
define('DB_USER', 'seu_usuario');        // Seu usuário MySQL
define('DB_PASS', 'sua_senha');          // Sua senha MySQL
```

### 3️⃣ Faça Upload dos Arquivos

No Gerenciador de Arquivos do Hostinger:
1. Vá em `public_html`
2. Faça upload de TODOS os arquivos e pastas
3. Mantenha a estrutura de pastas intacta

### 4️⃣ Adicione as 10 Imagens

Você precisa de 10 imagens com estes nomes EXATOS na pasta `images/`:

```
✓ forest_entrance.jpg
✓ village_gate.jpg
✓ main_square.jpg
✓ old_church.jpg
✓ church_tower.jpg
✓ house_floor1.jpg
✓ house_floor2.jpg
✓ house_attic.jpg
✓ town_hall.jpg
✓ mayors_office.jpg
```

**Veja detalhes completos em:** `IMAGES_NEEDED.md`

### 5️⃣ Teste o Jogo

1. Acesse `seusite.com` no navegador
2. Clique em "Criar conta"
3. Preencha os dados e faça login
4. Comece a jogar!

---

## 📋 Checklist Pré-Launch

Antes de abrir o jogo, confirme:

- [ ] Banco de dados MySQL criado
- [ ] Tabelas criadas via `database.sql`
- [ ] Arquivo `api/config.php` editado com credenciais corretas
- [ ] Todos os arquivos do projeto enviados ao Hostinger
- [ ] 10 imagens adicionadas na pasta `images/`
- [ ] Testado criar conta
- [ ] Testado fazer login
- [ ] Testado navegar entre locais

---

## 🔧 Teste Rápido das APIs

Para verificar se o backend está funcionando, acesse diretamente:

1. **Teste de conexão:** `seusite.com/api/config.php`
   - Se aparecer uma tela em branco ou `{"success":false}` está OK
   - Se der erro 500, verifique as credenciais

2. **Teste de registro:** Use o formulário de criar conta
   - Se funcionar, o banco está configurado corretamente

---

## 🆘 Problemas Comuns

### Erro: "Database connection failed"
**Solução:** Verifique as credenciais no arquivo `api/config.php`

### Erro: "Invalid or expired session"
**Solução:** Limpe o cache/localStorage do navegador e faça login novamente

### Imagens não aparecem
**Solução:**
- Confirme que as imagens estão em `public_html/images/`
- Verifique os nomes dos arquivos (são case-sensitive!)
- Teste acessar: `seusite.com/images/forest_entrance.jpg`

### Progresso não salva
**Solução:**
- Abra o Console do navegador (F12)
- Veja se há erros JavaScript ou de conexão
- Confirme que as APIs estão respondendo

---

## 🎮 Como Jogar

### Objetivo
Explorar 10 locais, resolver enigmas, coletar itens e encontrar a Chave Mestra para escapar!

### Controles
- 🖱️ **Clique** em elementos da imagem para interagir
- 🗺️ **Mapa** - Viajar entre locais visitados
- 🎒 **Inventário** - Ver itens coletados
- 💾 **Salvar** - Salvar progresso manualmente
- 🚪 **Sair** - Fazer logout

### Dica Inicial
Comece explorando a Entrada da Floresta, depois vá para a Praça Central!

---

## 📚 Documentação Completa

- **README.md** - Documentação detalhada do projeto
- **IMAGES_NEEDED.md** - Lista completa das imagens necessárias
- **PUZZLE_SOLUTIONS.md** - Soluções dos enigmas (SPOILERS!)

---

## 🎨 Encontrando Imagens

**Sites recomendados (gratuitos):**
- [Unsplash](https://unsplash.com) - Pesquise: "abandoned village", "old church"
- [Pexels](https://pexels.com) - Pesquise: "rusty gate", "forgotten house"
- [Pixabay](https://pixabay.com) - Pesquise: "misty forest", "old attic"

**Dica:** Use filtros para deixar as imagens mais sombrias/misteriosas

---

## ✅ Tudo Pronto?

Se você completou todos os passos:
1. Abra seu navegador
2. Acesse seu domínio
3. Crie uma conta
4. **Divirta-se explorando a Vila Abandonada!**

---

## 🔗 Links Úteis

- [Painel Hostinger](https://hostinger.com.br)
- [phpMyAdmin] - Acesse via painel do Hostinger
- [Gerenciador de Arquivos] - Acesse via painel do Hostinger

---

**Desenvolvimento completo em minutos. Boa sorte! 🎮**
