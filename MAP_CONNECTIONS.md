# Mapa de Conexões - Vila Abandonada

Este documento mostra **como todos os 15 locais se conectam** entre si no jogo.

---

## 🗺️ Visão Geral da Rede de Conexões

```
┌──────────────────────────────────────────────────────────────────┐
│                     VILA ABANDONADA                              │
│                    Rede de Conexões                              │
└──────────────────────────────────────────────────────────────────┘

START → [1. Entrada da Floresta]
              ↓
         [2. Portão da Vila] ←──────────────────┐
              ↓                                  │
         [3. PRAÇA CENTRAL] ← HUB PRINCIPAL     │ (retornar para vencer)
              ↓                                  │
        ┌─────┼─────┬─────┬─────┬─────┐        │
        ↓     ↓     ↓     ↓     ↓     ↓        │
       [4]   [7]   [9]   [13]  [14]  [2]       │
      Igreja Casa Pref. Poço  Loja  Portão     │
        ↓     ↓     ↓           ↓               │
       [5]   [8]   [10]        [15]             │
      Torre  Casa  Gab.        Ferr.            │
        ↑     ↓     ↓                            │
       [4]   [9]   [11]                         │
            Sótão  Bibli.                       │
        ↓                                       │
       [6]                                      │
      Cemit.                                    │
                                                │
    [10. Gabinete] → CHAVE MESTRA ──────────────┘
```

---

## 📊 Conexões Detalhadas por Local

### 🌲 LOCAL 1: Entrada da Floresta
```
[1. Entrada da Floresta]
         ↓ (único caminho)
[2. Portão da Vila]
```
**Conexões:** 1 saída
- ➡️ Portão da Vila

---

### 🚪 LOCAL 2: Portão da Vila
```
[1. Floresta] ←→ [2. Portão] ←→ [3. Praça]
```
**Conexões:** 2 saídas (bidirecional)
- ⬅️ Entrada da Floresta
- ➡️ Praça Central

**IMPORTANTE:** Este é o portão de SAÍDA (objetivo final)

---

### ⭐ LOCAL 3: Praça Central (HUB)
```
              [2. Portão]
                   ↓
         ┌────────[3]────────┐
         ↓         ↓         ↓
    [4.Igreja] [7.Casa] [9.Prefeitura]
         ↓         ↓         ↓
   [13.Poço] [14.Loja]   [...]
```
**Conexões:** 6 saídas
- ⬅️ Portão da Vila
- ➡️ Igreja Antiga (norte)
- ➡️ Casa Abandonada (leste)
- ➡️ Prefeitura (norte)
- ➡️ Poço Antigo (sul)
- ➡️ Loja Abandonada (sudeste)

**É O LOCAL MAIS CONECTADO!**

---

### ⛪ LOCAL 4: Igreja Antiga
```
[3. Praça] ←→ [4. Igreja] ←→ [6. Cemitério]
                    ↓
              [5. Torre]
```
**Conexões:** 3 saídas
- ⬅️ Praça Central
- ⬆️ Torre do Sino (escada)
- ➡️ Cemitério (porta dos fundos)

---

### 🔔 LOCAL 5: Torre do Sino
```
[4. Igreja]
     ↕
[5. Torre]
```
**Conexões:** 1 saída (beco sem saída)
- ⬇️ Igreja Antiga (escada)

---

### ⚰️ LOCAL 6: Cemitério
```
[4. Igreja] ←→ [6. Cemitério]
```
**Conexões:** 1 saída (beco sem saída)
- ⬅️ Igreja Antiga

---

### 🏚️ LOCAIS 7-8-9: Casa Abandonada (3 Andares)
```
[3. Praça] ←→ [7. Térreo]
                    ↕ (escada)
              [8. 2º Andar]
                    ↕ (escada)
               [9. Sótão]
```
**Térreo (7):** 2 saídas
- ⬅️ Praça Central
- ⬆️ 2º Andar (escada)

**2º Andar (8):** 2 saídas
- ⬇️ Térreo (escada)
- ⬆️ Sótão (escada)

**Sótão (9):** 1 saída (topo)
- ⬇️ 2º Andar (escada)

---

### 🏛️ LOCAL 9: Prefeitura
```
[3. Praça] ←→ [9. Prefeitura] ←→ [10. Gabinete]
                    ↓
              [12. Biblioteca]
```
**Conexões:** 3 saídas
- ⬅️ Praça Central
- ➡️ Gabinete do Prefeito
- ➡️ Biblioteca

---

### 👔 LOCAL 10: Gabinete do Prefeito
```
[9. Prefeitura] ←→ [10. Gabinete]
```
**Conexões:** 1 saída (beco sem saída)
- ⬅️ Prefeitura

**IMPORTANTE:** Aqui você pega a CHAVE MESTRA!

---

### 📚 LOCAL 12: Biblioteca
```
[9. Prefeitura] ←→ [12. Biblioteca]
```
**Conexões:** 1 saída (beco sem saída)
- ⬅️ Prefeitura

---

### 🌊 LOCAL 13: Poço Antigo
```
[3. Praça] ←→ [13. Poço]
```
**Conexões:** 1 saída (beco sem saída)
- ⬅️ Praça Central

---

### 🏪 LOCAL 14: Loja Abandonada
```
[3. Praça] ←→ [14. Loja] ←→ [15. Ferreiro]
```
**Conexões:** 2 saídas
- ⬅️ Praça Central
- ➡️ Oficina do Ferreiro (porta dos fundos)

---

### ⚒️ LOCAL 15: Oficina do Ferreiro
```
[14. Loja] ←→ [15. Ferreiro]
```
**Conexões:** 1 saída (beco sem saída)
- ⬅️ Loja Abandonada

---

## 🎯 Fluxo de Jogo Linear

Se você seguir o caminho mais direto:

```
START
  ↓
1. Entrada da Floresta (coletar mapa)
  ↓
2. Portão da Vila (ver que está trancado)
  ↓
3. Praça Central (resolver puzzle da fonte)
  ↓
├─→ 4. Igreja → 5. Torre → 6. Cemitério
│   (Símbolo Sagrado + Medalhão)
│
├─→ 7. Casa Térreo → 8. 2º Andar → 9. Sótão
│   (Fragmento 1 + Fragmento 2)
│
├─→ 9. Prefeitura → 12. Biblioteca
│   (Selo da Vila + Livro das Sombras)
│
├─→ 13. Poço (opcional)
│
└─→ 14. Loja → 15. Ferreiro
    (Runa de Ferro)
  ↓
10. Gabinete do Prefeito
    (CHAVE MESTRA - combinar 7 itens)
  ↓
2. Portão da Vila
   (usar Chave Mestra)
  ↓
🎉 VITÓRIA!
```

---

## 📈 Estatísticas de Conectividade

| Local | Nº de Conexões | Tipo |
|-------|----------------|------|
| **Praça Central** | **6** | **Hub Principal** |
| Portão da Vila | 2 | Passagem |
| Entrada da Floresta | 1 | Início |
| Igreja Antiga | 3 | Sub-hub |
| Prefeitura | 3 | Sub-hub |
| Casa Térreo | 2 | Passagem |
| Casa 2º Andar | 2 | Passagem |
| Loja Abandonada | 2 | Passagem |
| Torre do Sino | 1 | Beco sem saída |
| Cemitério | 1 | Beco sem saída |
| Sótão | 1 | Beco sem saída |
| Gabinete do Prefeito | 1 | Beco sem saída ⭐ |
| Biblioteca | 1 | Beco sem saída |
| Poço Antigo | 1 | Beco sem saída |
| Ferreiro | 1 | Beco sem saída |

---

## 🔑 Locais-Chave

### Hubs (Centros de Conexão):
1. **Praça Central** - 6 conexões (hub principal)
2. **Igreja Antiga** - 3 conexões (sub-hub religioso)
3. **Prefeitura** - 3 conexões (sub-hub administrativo)

### Becos sem Saída Importantes:
- **Gabinete do Prefeito** - Chave Mestra (objetivo penúltimo)
- **Portão da Vila** - Saída (objetivo final)

### Verticais (Andares):
- **Casa:** Térreo → 2º Andar → Sótão
- **Igreja:** Térreo → Torre

---

## 🗺️ Representação em Grafo

```
    (1)              Legenda:
     ↓               (1) = Entrada Floresta
    (2) ← SAÍDA     (2) = Portão Vila
     ↓               (3) = Praça Central
    (3) ← HUB       (4) = Igreja
   / | \ \          (5) = Torre
  /  |  \ \         (6) = Cemitério
(4) (7)(9)(13)(14)  (7-8-9) = Casa (3 andares)
 ↓   ↓  ↓      ↓    (10) = Prefeitura
(5) (8)(10)   (15)  (11) = Gabinete
 ↑   ↓  ↓           (12) = Biblioteca
(4) (9)(12)         (13) = Poço
     ↓              (14) = Loja
    (6)             (15) = Ferreiro
```

---

## 💡 Dicas de Navegação

1. **Sempre volte para a Praça Central** quando não souber para onde ir
2. **Casa Abandonada** é uma cadeia linear de 3 locais (térreo → 2º → sótão)
3. **Igreja** dá acesso a 2 becos sem saída (Torre e Cemitério)
4. **Prefeitura** dá acesso a 2 becos sem saída (Gabinete e Biblioteca)
5. **Loja** dá acesso ao Ferreiro (último beco antes do final)

---

## 🎮 Como Isso Funciona no Código

No arquivo `js/map.js`, cada local tem:

```javascript
location_id: {
    connections: ['local1', 'local2', 'local3'],
    // Lista de IDs para onde você pode ir deste local
}
```

**Exemplo - Praça Central:**
```javascript
main_square: {
    connections: [
        'village_gate',      // Portão
        'old_church',        // Igreja
        'abandoned_house',   // Casa
        'town_hall',         // Prefeitura
        'old_well',          // Poço
        'abandoned_shop'     // Loja
    ]
}
```

O jogo usa essa lista para:
- Mostrar apenas hotspots de locais conectados
- Permitir navegação apenas por caminhos válidos
- Criar o grafo de exploração

---

## ✅ Checklist de Exploração

Use esta lista para garantir que visitou todos os locais:

- [ ] 1. Entrada da Floresta
- [ ] 2. Portão da Vila
- [ ] 3. Praça Central
- [ ] 4. Igreja Antiga
- [ ] 5. Torre do Sino
- [ ] 6. Cemitério
- [ ] 7. Casa - Térreo
- [ ] 8. Casa - 2º Andar
- [ ] 9. Casa - Sótão
- [ ] 10. Prefeitura
- [ ] 11. Gabinete do Prefeito
- [ ] 12. Biblioteca
- [ ] 13. Poço Antigo
- [ ] 14. Loja Abandonada
- [ ] 15. Oficina do Ferreiro

---

**Este documento serve como referência para entender a estrutura de navegação do jogo!**

Você pode consultar este arquivo enquanto joga para entender como os locais se conectam.
