# Fix: Location not found: forest_entrance

## Problema

Erro ao carregar o jogo: **"Location not found: forest_entrance"**

## Causa

Havia uma inconsistência entre o nome da localização inicial:
- **Banco de dados**: usava `forest_entrance`
- **map.js**: primeira localização é `floresta`

## Solução Aplicada

Os seguintes arquivos foram corrigidos para usar `floresta`:
-  `api/register.php` - linha 59
-  `api/load-progress.php` - linhas 38 e 43
-  `database.sql` - linha 23

## Como Corrigir Usuários Já Criados

Se você já criou usuários antes desta correção, escolha uma das opções:

### Opção 1: Atualizar no Banco de Dados (Recomendado)

Acesse o **phpMyAdmin** e execute este SQL:

```sql
UPDATE game_progress
SET current_location = 'floresta'
WHERE current_location = 'forest_entrance';
```

### Opção 2: Criar Novo Usuário

1. Faça logout do jogo
2. Acesse `index.php`
3. Crie uma nova conta
4. Novos usuários já terão a localização correta

### Opção 3: Limpar e Reimportar Banco

1. Delete as tabelas existentes no phpMyAdmin
2. Reimporte o arquivo `database.sql` atualizado
3. Todos os novos usuários terão a configuração correta

## Verificar se Está Funcionando

1. Faça login no jogo
2. Abra o Console do navegador (F12)
3. Digite: `gameStateManager.getState()`
4. Verifique se `currentLocation` mostra `"floresta"`

## Outras Localizações Disponíveis

Para referência, as localizações no jogo são:
- `floresta` (inicial)
- `portao_entrada`
- `rua_vila`
- `praca_central`
- `poco_profundo`
- (e outras...)

Para ver todas: abra `js/map.js` e procure por `const GAME_MAP = {`
