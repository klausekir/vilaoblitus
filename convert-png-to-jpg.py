import os
import argparse
from PIL import Image
import sys # Importa sys para sair em caso de erro grave

def converter_png_para_jpg(pasta_entrada, pasta_saida=None, qualidade=90):
    """
    Converte todos os ficheiros PNG numa pasta para JPG.

    Args:
        pasta_entrada (str): O caminho para a pasta contendo os ficheiros PNG.
        pasta_saida (str, optional): O caminho para a pasta onde os ficheiros JPG
                                     serão guardados. Se None, cria uma subpasta
                                     'convertidos_jpg'. Defaults to None.
        qualidade (int, optional): Qualidade da compressão JPG (0-100). Defaults to 90.
    """
    # [CORRECÇÃO] Normaliza o caminho de entrada para remover barras extras
    pasta_entrada = os.path.normpath(pasta_entrada)

    if not os.path.isdir(pasta_entrada):
        print(f"ERRO: A pasta de entrada '{pasta_entrada}' não foi encontrada ou não é um diretório.")
        sys.exit(1) # Sai do script se a pasta de entrada for inválida

    if pasta_saida is None:
        pasta_saida = os.path.join(pasta_entrada, "convertidos_jpg")
        print(f"Pasta de saída não especificada. A guardar em: {pasta_saida}")
    else:
        # [CORRECÇÃO] Normaliza também o caminho de saída
        pasta_saida = os.path.normpath(pasta_saida)

    # [CORRECÇÃO] Cria a pasta de saída de forma mais robusta, incluindo pais se necessário
    try:
        os.makedirs(pasta_saida, exist_ok=True) # exist_ok=True evita erro se a pasta já existir
        print(f"Verificado/Criado pasta de saída: {pasta_saida}")
    except OSError as e:
        print(f"ERRO FATAL: Não foi possível criar a pasta de saída '{pasta_saida}': {e}")
        sys.exit(1) # Sai do script se não conseguir criar a pasta

    print(f"\nA procurar por ficheiros PNG em: {pasta_entrada}")
    arquivos_convertidos = 0

    for nome_arquivo in os.listdir(pasta_entrada):
        caminho_completo_entrada = os.path.join(pasta_entrada, nome_arquivo)

        if os.path.isfile(caminho_completo_entrada) and nome_arquivo.lower().endswith(".png"):
            # Cria o nome do ficheiro de saída JPG ANTES de tentar abrir a imagem
            nome_base = os.path.splitext(nome_arquivo)[0]
            nome_arquivo_saida = f"{nome_base}.jpg"
            caminho_completo_saida = os.path.join(pasta_saida, nome_arquivo_saida)

            try:
                img_png = Image.open(caminho_completo_entrada)

                if img_png.mode == 'RGBA' or 'A' in img_png.info.get('transparency', ()):
                    print(f"  - Convertendo {nome_arquivo} (com transparência)...")
                    img_convertida = Image.new("RGB", img_png.size, (255, 255, 255))
                    alpha_channel = img_png.split()[-1] if 'A' in img_png.mode else None
                    if alpha_channel:
                         img_convertida.paste(img_png, mask=alpha_channel)
                    else:
                         img_convertida = img_png.convert('RGB')
                else:
                    print(f"  - Convertendo {nome_arquivo}...")
                    img_convertida = img_png.convert('RGB')

                # Tenta salvar a imagem
                img_convertida.save(caminho_completo_saida, "JPEG", quality=qualidade)
                arquivos_convertidos += 1
                print(f"    -> Salvo como: {nome_arquivo_saida}")

            # [CORRECÇÃO] Captura especificamente erros de ficheiro/diretório ao salvar
            except FileNotFoundError:
                 print(f"  !! ERRO GRAVE: O diretório de saída '{pasta_saida}' desapareceu ou não pôde ser acedido ao tentar salvar '{nome_arquivo_saida}'. Verifique as permissões.")
                 # Decide se quer parar ou continuar
                 # sys.exit(1) # Descomente para parar o script neste erro
            except Exception as e:
                print(f"  !! Erro ao processar {nome_arquivo}: {e}")

    print(f"\nConversão concluída. {arquivos_convertidos} ficheiros PNG convertidos para JPG.")

# --- COMO USAR ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Converte ficheiros PNG para JPG numa pasta.")
    parser.add_argument("pasta_entrada", help="Caminho para a pasta contendo os ficheiros PNG.")
    parser.add_argument("-o", "--output", dest="pasta_saida", default=None, help="Caminho para a pasta onde guardar os JPGs. (Opcional)")
    parser.add_argument("-q", "--quality", type=int, default=90, help="Qualidade JPG (0-100). (Opcional: defeito 90)")

    args = parser.parse_args()

    if not 0 <= args.quality <= 100:
        print("ERRO: Qualidade deve estar entre 0 e 100.")
        sys.exit(1)
    else:
        converter_png_para_jpg(args.pasta_entrada, args.pasta_saida, args.quality)