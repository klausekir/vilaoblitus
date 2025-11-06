# 🎮 Como Rodar o Jogo Localmente (Sem Servidor)

Guia completo para testar o jogo no seu PC **SEM precisar de PHP, MySQL ou Hostinger!**

---

## 🚀 OPÇÃO 1: Versão Offline (MAIS FÁCIL!)

### Passo 1: Verificar que tem as imagens

Confirme que a pasta `images/` tem as **15 imagens** dos ambientes:

```
images/
├── forest_entrance.jpg      ✓
├── village_gate.jpg         ✓
├── main_square.jpg          ✓
├── old_church.jpg           ✓
├── church_tower.jpg         ✓
├── house_floor1.jpg         ✓
├── house_floor2.jpg         ✓
├── house_attic.jpg          ✓
├── town_hall.jpg            ✓
├── mayors_office.jpg        ✓
├── cemetery.jpg             ✓
├── old_well.jpg             ✓
├── abandoned_shop.jpg       ✓
├── blacksmith.jpg           ✓
└── library.jpg              ✓
```

### Passo 2: Iniciar um servidor HTTP local

**Por que precisa?** Navegadores bloqueiam arquivos locais (file://) por segurança. Precisamos de um servidor simples.

#### 🐍 Opção A: Python (Recomendado - já vem no Windows)

**1. Abra o Prompt de Comando (CMD) ou PowerShell**
   - Pressione `Windows + R`
   - Digite `cmd` e Enter

**2. Navegue até a pasta do projeto:**
```bash
cd C:\src\claude_oblitus
```

**3. Inicie o servidor:**

**Se tiver Python 3:**
```bash
python -m http.server 8000
```

**Se tiver Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**4. Abra o navegador e acesse:**
```
http://localhost:8000/game-offline.html
```

✅ **PRONTO! O jogo está rodando!**

---

#### 📦 Opção B: Node.js (se tiver instalado)

**1. Abra o CMD/PowerShell na pasta do projeto**

**2. Instale o http-server (só precisa fazer uma vez):**
```bash
npm install -g http-server
```

**3. Execute:**
```bash
http-server -p 8000
```

**4. Abra:**
```
http://localhost:8000/game-offline.html
```

---

#### 🌐 Opção C: Live Server (VSCode)

Se você usa **Visual Studio Code**:

**1. Instale a extensão "Live Server"**
   - Vá em Extensions (Ctrl+Shift+X)
   - Procure por "Live Server"
   - Instale

**2. Clique com botão direito em `game-offline.html`**

**3. Selecione "Open with Live Server"**

✅ Abre automaticamente no navegador!

---

#### 🦊 Opção D: Apenas abrir o arquivo (pode não funcionar 100%)

Se nada acima funcionar, tente:

**1. Clique com botão direito em `game-offline.html`**

**2. Abra com:** Chrome, Firefox ou Edge

⚠️ **Atenção:** Algumas imagens podem não carregar devido a restrições CORS. Use uma das opções de servidor acima.

---

## 🎯 Arquivos para Testar

### Jogo Completo (Offline):
- **`game-offline.html`** ⭐ PRINCIPAL
  - Jogo completo sem autenticação
  - Salva progresso no navegador (localStorage)
  - Funciona 100% offline

### Visualizadores/Ferramentas:
- **`interactive-map.html`** - Mapa interativo com as imagens
- **`connection-visualizer.html`** - Visualizar conexões
- **`map-generator.html`** - Gerar imagem do mapa

---

## 🎮 Como Usar a Versão Offline

### Controles:
- **🔗 Conexões** - Ver locais conectados
- **💾 Salvar** - Salvar progresso manual
- **🗺️ Mapa** - Ver locais visitados
- **🎒 Inventário** - Ver itens coletados
- **🔄 Resetar** - Começar do zero

### Salvamento:
- ✅ **Auto-save** - Salva automaticamente ao navegar
- ✅ **localStorage** - Dados salvos no navegador
- ✅ **Persistente** - Mesmo se fechar e abrir o navegador
- ⚠️ **Por navegador** - Se trocar de navegador, perde o save

### Resetar o Jogo:
- Clique no botão **🔄 Resetar**
- Ou limpe o localStorage do navegador:
  - F12 → Console → Digite: `localStorage.clear()`

---

## 📊 Diferenças: Offline vs Online

| Recurso | Versão Offline | Versão Online (Hostinger) |
|---------|----------------|---------------------------|
| Login/Registro | ❌ Não tem | ✅ Tem |
| Salvamento | localStorage | MySQL |
| Múltiplos Jogadores | ❌ Um por navegador | ✅ Contas diferentes |
| Progresso Persistente | ⚠️ Por navegador | ✅ Em qualquer lugar |
| Ranking/Estatísticas | ❌ Não | ✅ Possível adicionar |
| Backup de Save | ❌ Não | ✅ Servidor |

---

## 🔧 Troubleshooting

### Problema: Imagens não aparecem

**Solução 1:** Use um servidor HTTP (Python/Node)
```bash
python -m http.server 8000
```

**Solução 2:** Verifique que os arquivos existem:
```bash
dir images
```

**Solução 3:** Verifique os nomes dos arquivos (exatos):
- Devem terminar em `.jpg` (minúsculo)
- Sem espaços no nome
- Exatamente como no código

---

### Problema: "Cannot GET /game-offline.html"

**Solução:** Você está na pasta errada. Navegue até a pasta correta:
```bash
cd C:\src\claude_oblitus
dir
```

Você deve ver os arquivos:
- game-offline.html
- interactive-map.html
- css/
- js/
- images/

---

### Problema: Servidor não inicia

**Python não encontrado:**
1. Instale Python: https://www.python.org/downloads/
2. Durante instalação, marque "Add to PATH"
3. Tente novamente

**Porta 8000 ocupada:**
Use outra porta:
```bash
python -m http.server 8080
```
Acesse: `http://localhost:8080/game-offline.html`

---

### Problema: Progresso não salva

**Solução:** Verifique se o localStorage está habilitado:
1. F12 (DevTools)
2. Aba "Application" ou "Armazenamento"
3. Procure por "Local Storage"
4. Deve aparecer `vila_abandonada_offline`

---

## ✅ Checklist Pré-Jogo

Antes de começar a jogar, confirme:

- [ ] Pasta `images/` existe
- [ ] 15 imagens JPG estão na pasta
- [ ] Arquivo `game-offline.html` existe
- [ ] Servidor HTTP está rodando (Python/Node/Live Server)
- [ ] Navegador aberto em `http://localhost:8000/game-offline.html`
- [ ] Primeira imagem (Entrada da Floresta) aparece

---

## 🎯 Comandos Rápidos (Windows)

### Abrir CMD na pasta do projeto:
1. Abra a pasta no Explorer
2. Clique na barra de endereços
3. Digite `cmd` e Enter
4. Já abre no local certo!

### Iniciar servidor Python (copie e cole):
```bash
python -m http.server 8000
```

### Ver no navegador:
```
http://localhost:8000/game-offline.html
```

### Parar o servidor:
Pressione `Ctrl + C` no terminal

---

## 🚀 Próximos Passos

Depois de testar localmente:

1. ✅ **Jogue o jogo completo**
2. ✅ **Teste todos os 15 locais**
3. ✅ **Resolva os puzzles**
4. ✅ **Chegue até a vitória**
5. ✅ **Verifique se há bugs**
6. 📤 **Depois faça upload pro Hostinger**

---

## 📌 Resumo Super Rápido

```bash
# 1. Abrir CMD na pasta
cd C:\src\claude_oblitus

# 2. Iniciar servidor
python -m http.server 8000

# 3. Abrir navegador
http://localhost:8000/game-offline.html

# 4. JOGAR! 🎮
```

---

## 💡 Dicas de Teste

### Teste estes cenários:

1. ✅ **Navegação** - Vá para todos os 15 locais
2. ✅ **Puzzles** - Resolva pelo menos 3 enigmas
3. ✅ **Inventário** - Colete alguns itens
4. ✅ **Salvamento** - Salve, feche e reabra
5. ✅ **Mapa** - Use o botão de mapa
6. ✅ **Conexões** - Teste o visualizador de conexões
7. ✅ **Resetar** - Teste começar um novo jogo

### Abra o Console (F12) para:
- Ver mensagens de erro
- Debugar problemas
- Verificar se tudo está carregando

---

## 🎊 Pronto!

Agora você pode:
- ✅ Jogar localmente sem servidor/banco
- ✅ Testar todas as funcionalidades
- ✅ Ver suas imagens em ação
- ✅ Verificar se tudo funciona
- ✅ Fazer ajustes antes do deploy

**Quando estiver tudo OK, é só fazer upload pro Hostinger com o sistema de login completo!**

---

**Dúvidas? Algum erro? Me avise que te ajudo!** 🚀
