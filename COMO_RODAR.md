# 🚀 Como Rodar o Jogo Phaser

## ⚠️ IMPORTANTE:

**NÃO abra `game-phaser.html` diretamente no navegador!**

Phaser precisa de um **servidor HTTP** para funcionar corretamente.

---

## ✅ Forma MAIS FÁCIL - Script Automático:

### 1. Dê duplo clique em:
```
start-server.bat
```

### 2. O script vai:
- ✅ Detectar automaticamente Python/Node.js/PHP
- ✅ Iniciar o servidor
- ✅ Mostrar o endereço para abrir

### 3. Abra no navegador:
```
http://localhost:8000/game-phaser.html
```

### 4. Para parar:
```
Pressione Ctrl+C no terminal
```

---

## 📋 Métodos Alternativos:

### Método 1: Python (simples)

**Terminal:**
```bash
cd C:\src\claude_oblitus2
python -m http.server 8000
```

**Navegador:**
```
http://localhost:8000/game-phaser.html
```

---

### Método 2: VSCode + Live Server (melhor para desenvolvimento)

1. Instale VSCode: https://code.visualstudio.com/
2. Abra Extensions (Ctrl+Shift+X)
3. Procure "Live Server"
4. Instale
5. Clique direito em `game-phaser.html` → "Open with Live Server"

**Vantagens:**
- ✅ Auto-reload ao salvar arquivos
- ✅ Mais rápido para desenvolvimento
- ✅ Integrado ao editor

---

### Método 3: Node.js + http-server

**Instalar:**
```bash
npm install -g http-server
```

**Rodar:**
```bash
cd C:\src\claude_oblitus2
http-server -p 8000
```

**Navegador:**
```
http://localhost:8000/game-phaser.html
```

---

## 🐛 Problemas Comuns:

### Erro: "CORS policy"
**Causa:** Você abriu o arquivo direto (`file://`)
**Solução:** Use um dos métodos acima

### Erro: "Porta 8000 já está em uso"
**Solução:** Use outra porta:
```bash
python -m http.server 8080
# Abra: http://localhost:8080/game-phaser.html
```

### Erro: "Python não é reconhecido"
**Solução:** Instale Python: https://www.python.org/downloads/
- ✅ Marque "Add Python to PATH" durante instalação

---

## 🎮 Fluxo de Trabalho:

```
1. Editar jogo no location-editor.html
2. Clicar "Salvar no Jogo"
3. Iniciar servidor (start-server.bat)
4. Abrir http://localhost:8000/game-phaser.html
5. Jogar e testar
6. (Fazer mudanças)
7. Recarregar página (F5)
```

---

## 💡 Dica:

**Deixe o servidor rodando** enquanto desenvolve!

Você pode:
- ✅ Editar arquivos
- ✅ Salvar
- ✅ Recarregar navegador (F5)
- ✅ Ver mudanças instantaneamente

**Não precisa parar/iniciar o servidor toda vez!**

---

## 🌐 URLs importantes:

| Arquivo | URL |
|---------|-----|
| **Jogo Phaser** | http://localhost:8000/game-phaser.html |
| Jogo HTML | http://localhost:8000/game-offline.html |
| Editor | http://localhost:8000/location-editor.html |
| Map Editor | http://localhost:8000/map-editor.html |

---

## ✅ Checklist de Primeira Execução:

```
☐ 1. Instalar Python OU Node.js
☐ 2. Abrir terminal na pasta do projeto
☐ 3. Rodar: python -m http.server 8000
☐ 4. Abrir navegador em: http://localhost:8000/game-phaser.html
☐ 5. Ver se imagens aparecem!
```

---

## 🆘 Ainda não funciona?

Abra o Console (F12) e me mande:
- ✅ Mensagens de erro
- ✅ URL que você está usando (deve ser http://, não file://)
- ✅ Qual método de servidor você usou

---

**Agora rode o `start-server.bat` e teste!** 🎮✨
