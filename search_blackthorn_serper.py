import http.client
import json
import os
from pathlib import Path

def load_env():
    """Carrega variáveis do arquivo .env"""
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

def search_serper(query, api_key):
    """
    Busca no Google usando Serper API

    Args:
        query: Termo de busca
        api_key: API key do Serper

    Returns:
        Resultados da busca
    """
    conn = http.client.HTTPSConnection("google.serper.dev")

    payload = json.dumps({
        "q": query,
        "num": 10  # Número de resultados
    })

    headers = {
        'X-API-KEY': api_key,
        'Content-Type': 'application/json'
    }

    print(f"[*] Buscando: {query}")

    try:
        conn.request("POST", "/search", payload, headers)
        res = conn.getresponse()
        data = res.read()

        if res.status != 200:
            print(f"[ERRO] Status {res.status}: {data.decode('utf-8')}")
            return None

        result = json.loads(data.decode("utf-8"))
        print(f"[OK] Busca concluida!")

        return result

    except Exception as e:
        print(f"[ERRO] Excecao: {e}")
        return None
    finally:
        conn.close()

def extract_search_results(result):
    """Extrai informações úteis dos resultados"""
    if not result:
        return []

    items = []

    # Resultados orgânicos
    if 'organic' in result:
        for item in result['organic']:
            items.append({
                'title': item.get('title', ''),
                'link': item.get('link', ''),
                'snippet': item.get('snippet', ''),
                'position': item.get('position', 0)
            })

    return items

def save_results(results, filename):
    """Salva resultados em arquivo"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"[SAVE] Resultados salvos em: {filename}")

def main():
    load_env()
    api_key = os.environ.get('SERPER_API_KEY')

    if not api_key:
        print("[ERRO] SERPER_API_KEY nao encontrada no .env")
        return

    # Queries sobre Blackthorn Castle puzzles
    queries = [
        "Blackthorn Castle walkthrough all puzzles",
        "Blackthorn Castle puzzle types mechanics",
        "Blackthorn Castle gear symbol lock puzzles"
    ]

    all_results = {}

    for query in queries:
        result = search_serper(query, api_key)

        if result:
            items = extract_search_results(result)
            all_results[query] = items

            print(f"\n[*] Resultados para: {query}")
            print(f"[*] Total: {len(items)} resultados\n")

            for i, item in enumerate(items[:5], 1):
                print(f"{i}. {item['title']}")
                print(f"   URL: {item['link']}")
                print(f"   Snippet: {item['snippet'][:100]}...")
                print()

    # Salvar todos os resultados
    save_results(all_results, 'blackthorn_search_results.json')

    # Criar resumo em texto
    with open('blackthorn_search_summary.txt', 'w', encoding='utf-8') as f:
        f.write("=== RESULTADOS DA BUSCA SOBRE BLACKTHORN CASTLE ===\n\n")

        for query, items in all_results.items():
            f.write(f"QUERY: {query}\n")
            f.write("=" * 80 + "\n\n")

            for i, item in enumerate(items, 1):
                f.write(f"{i}. {item['title']}\n")
                f.write(f"   URL: {item['link']}\n")
                f.write(f"   {item['snippet']}\n\n")

            f.write("\n" + "=" * 80 + "\n\n")

    print("[SAVE] Resumo salvo em: blackthorn_search_summary.txt")
    print("\n[OK] Processo concluido!")
    print("[INFO] Use os links encontrados para acessar manualmente os walkthroughs")

if __name__ == "__main__":
    main()
