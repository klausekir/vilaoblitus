from PIL import Image
import sys

def remover_fundo_solido(input_path, output_path, threshold=10):
    """
    Transforma o fundo de cor sólida de uma imagem em transparente.

    Argumentos:
    input_path (str): Caminho para a imagem de entrada (JPG, PNG, etc.).
    output_path (str): Caminho para salvar a imagem de saída (será PNG).
    threshold (int): Tolerância para cores 'semelhantes' ao fundo.
                     Aumente se o fundo não for perfeitamente uniforme.
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
    # Isso é essencial para ter um canal de transparência.
    img = img.convert("RGBA")

    # Obter os dados de todos os pixels da imagem
    datas = img.getdata()

    # Lista para armazenar os novos dados dos pixels
    newData = []

    # Determinar a cor de fundo pegando o primeiro pixel (canto superior esquerdo)
    # Assumimos que este pixel é representativo do fundo inteiro.
    bg_color = datas[0]

    print(f"Cor de fundo detectada (R,G,B,A): {bg_color}")
    print("Processando imagem...")

    # Iterar por cada pixel
    for item in datas:
        # Compara o pixel (R,G,B) atual com a cor de fundo (R,G,B)
        # Usamos um 'threshold' (limite de tolerância) para casos em que
        # o fundo não é 100% de uma única cor (ex: artefatos de JPG).
        if abs(item[0] - bg_color[0]) <= threshold and \
           abs(item[1] - bg_color[1]) <= threshold and \
           abs(item[2] - bg_color[2]) <= threshold:
            
            # Se for 'fundo', define o pixel como transparente (Alfa = 0)
            newData.append((item[0], item[1], item[2], 0))
        else:
            # Se for 'objeto' (a moeda), mantém o pixel opaco (Alfa = 255)
            # O 'item' já tem Alfa 255 por causa do .convert("RGBA")
            newData.append(item)

    # Aplicar os novos dados de pixel à imagem
    img.putdata(newData)

    # Salvar a nova imagem como PNG (que suporta transparência)
    try:
        img.save(output_path, "PNG")
        print(f"Sucesso! Imagem salva em '{output_path}'")
    except Exception as e:
        print(f"Erro ao salvar a imagem: {e}")


# --- Como usar o script ---
if __name__ == "__main__":
    # Verifique se os nomes dos arquivos foram passados como argumentos
    if len(sys.argv) < 3:
        print("Uso: python transparencia.py <imagem_de_entrada> <imagem_de_saida>")
        print("Exemplo: python transparencia.py minha_moeda.jpg moeda_transparente.png")
        
        # --- Ou descomente as linhas abaixo para testar ---
        # print("Executando teste padrão...")
        # # Coloque o nome da sua imagem de entrada aqui
        # input_file = "minha_moeda.jpg" 
        # # Nome do arquivo de saída
        # output_file = "moeda_transparente.png"
        # # Ajuste a tolerância se necessário
        # tolerancia = 20 
        # remover_fundo_solido(input_file, output_file, tolerancia)
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
                
        remover_fundo_solido(input_file, output_file, tolerancia)