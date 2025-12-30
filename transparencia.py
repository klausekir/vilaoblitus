from PIL import Image, ImageFilter
import sys

def remover_fundo_solido(input_path, output_path, threshold=10, remover_borda_branca=True, suavizar_bordas=True):
    """
    Transforma o fundo de cor sólida de uma imagem em transparente.

    Argumentos:
    input_path (str): Caminho para a imagem de entrada (JPG, PNG, etc.).
    output_path (str): Caminho para salvar a imagem de saída (será PNG).
    threshold (int): Tolerância para cores 'semelhantes' ao fundo (padrão: 10).
    remover_borda_branca (bool): Remove bordas brancas/claras automaticamente (padrão: True).
    suavizar_bordas (bool): Aplica transparência gradual nas bordas (padrão: True).
    """
    try:
        # Abrir a imagem
        img = Image.open(input_path)
    except FileNotFoundError:
        print(f"Erro: O arquivo '{input_path}' não foi encontrado.")
        return
    except Exception as e:
        print(f"Erro ao abrir a imagem: {e}")
        return

    # Converter a imagem para RGBA (Vermelho, Verde, Azul, Alfa/Transparência)
    img = img.convert("RGBA")
    width, height = img.size

    # Obter os dados de todos os pixels da imagem
    datas = img.getdata()

    # Determinar a cor de fundo pegando o primeiro pixel (canto superior esquerdo)
    bg_color = datas[0]

    print(f"Cor de fundo detectada (R,G,B,A): {bg_color}")
    print("Processando imagem...")

    # Lista para armazenar os novos dados dos pixels
    newData = []

    # Iterar por cada pixel
    for item in datas:
        # Calcular a diferença de cor em relação ao fundo
        diff = abs(item[0] - bg_color[0]) + abs(item[1] - bg_color[1]) + abs(item[2] - bg_color[2])

        if diff <= threshold * 3:
            # Pixel é do fundo - tornar transparente
            newData.append((item[0], item[1], item[2], 0))
        elif suavizar_bordas and diff <= threshold * 6:
            # Pixel está na transição (borda) - aplicar transparência gradual
            # Quanto mais próximo do fundo, mais transparente
            alpha = int((diff - threshold * 3) / (threshold * 3) * 255)
            newData.append((item[0], item[1], item[2], min(255, max(0, alpha))))
        else:
            # Pixel é do objeto - manter opaco
            newData.append(item)

    # Aplicar os novos dados de pixel à imagem
    img.putdata(newData)

    # ✅ REMOVER BORDAS BRANCAS (múltiplas passadas para ser mais agressivo)
    if remover_borda_branca:
        print("Removendo bordas brancas (passada 1/4)...")
        img = remover_bordas_brancas(img, threshold_branco=200, raio=2)
        print("Removendo bordas brancas (passada 2/4)...")
        img = remover_bordas_brancas(img, threshold_branco=180, raio=1)
        print("Removendo bordas brancas (passada 3/4)...")
        img = remover_bordas_brancas(img, threshold_branco=160, raio=1)
        print("Removendo bordas brancas (passada 4/4 - EXTRA AGRESSIVA)...")
        img = remover_bordas_brancas(img, threshold_branco=140, raio=2)

    # Salvar a nova imagem como PNG (que suporta transparência)
    try:
        img.save(output_path, "PNG")
        print(f"Sucesso! Imagem salva em '{output_path}'")
    except Exception as e:
        print(f"Erro ao salvar a imagem: {e}")


def remover_bordas_brancas(img, threshold_branco=220, raio=1):
    """
    Remove pixels brancos/claros que estão próximos de áreas transparentes.

    Args:
        img: Imagem PIL em modo RGBA
        threshold_branco: Valor mínimo RGB para considerar "branco" (0-255)
        raio: Raio de busca por pixels transparentes (1 = 3x3, 2 = 5x5, etc.)

    Returns:
        Imagem PIL processada
    """
    width, height = img.size
    pixels = img.load()

    # Criar uma cópia para não modificar enquanto lê
    resultado = img.copy()
    pixels_resultado = resultado.load()

    removidos = 0

    # Percorrer todos os pixels
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            # Se o pixel já é transparente, pular
            if a < 10:
                continue

            # Verificar se é um pixel claro/branco (todos os canais RGB altos)
            is_branco = r >= threshold_branco and g >= threshold_branco and b >= threshold_branco

            if is_branco:
                # Verificar se está próximo de área transparente
                tem_transparente_perto = False

                # Verificar vizinhos em um raio maior
                for dy in range(-raio, raio + 1):
                    for dx in range(-raio, raio + 1):
                        nx, ny = x + dx, y + dy

                        # Verificar limites
                        if 0 <= nx < width and 0 <= ny < height:
                            _, _, _, na = pixels[nx, ny]

                            # Se algum vizinho é transparente ou semi-transparente
                            if na < 128:
                                tem_transparente_perto = True
                                break

                    if tem_transparente_perto:
                        break

                # Se tem transparente perto, remover o pixel branco
                if tem_transparente_perto:
                    pixels_resultado[x, y] = (r, g, b, 0)
                    removidos += 1

    print(f"  -> {removidos} pixels brancos removidos (threshold={threshold_branco}, raio={raio})")
    return resultado


# --- Como usar o script ---
if __name__ == "__main__":
    # Verifique se os nomes dos arquivos foram passados como argumentos
    if len(sys.argv) < 3:
        print("=" * 70)
        print("SCRIPT PARA REMOVER FUNDO E BORDAS BRANCAS DE IMAGENS")
        print("=" * 70)
        print("\nUso: python transparencia.py <entrada> <saida> [tolerancia]")
        print("\nExemplos:")
        print("  python transparencia.py moeda.jpg moeda_transparente.png")
        print("  python transparencia.py item.jpg item.png 15")
        print("\nNovos recursos:")
        print("  [OK] Remove fundo de cor solida")
        print("  [OK] Remove bordas brancas automaticamente")
        print("  [OK] Suaviza bordas com transparencia gradual (anti-aliasing)")
        print("\nParâmetros:")
        print("  entrada    : Arquivo de imagem (JPG, PNG, etc.)")
        print("  saida      : Arquivo de saída PNG")
        print("  tolerancia : Tolerância de cor 0-255 (padrão: 10)")
        print("               Aumente se o fundo não estiver sendo removido")
        print("=" * 70)
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2]

        # Opcional: permitir passar a tolerância como terceiro argumento
        tolerancia = 10
        if len(sys.argv) > 3:
            try:
                tolerancia = int(sys.argv[3])
            except ValueError:
                print(f"Aviso: Tolerância '{sys.argv[3]}' inválida. Usando padrão de {tolerancia}.")

        print(f"\n{'='*70}")
        print(f"Processando: {input_file}")
        print(f"Tolerância: {tolerancia}")
        print(f"{'='*70}\n")

        remover_fundo_solido(input_file, output_file, tolerancia,
                           remover_borda_branca=True,
                           suavizar_bordas=True)