import sys
from PIL import Image

def convert_webp_to_png(input_path, output_path):
    """
    Converte um arquivo WebP para PNG, preservando a transparência (canal alfa).
    """
    try:
        # 1. Abrir a imagem WebP
        # O modo 'RGBA' garante que o canal alfa (transparência) seja carregado.
        img = Image.open(input_path).convert("RGBA")
        
        # 2. Salvar como PNG
        # O formato PNG suporta nativamente o canal alfa.
        img.save(output_path, "PNG")
        
        print(f"✅ Sucesso! '{input_path}' convertido para '{output_path}' com transparência.")

    except FileNotFoundError:
        print(f"❌ Erro: Arquivo de entrada não encontrado em '{input_path}'")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro durante a conversão: {e}")
        sys.exit(1)

# --- Lógica Principal ---
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python convert.py <caminho/do/arquivo/de/entrada.webp> <caminho/do/arquivo/de/saida.png>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    convert_webp_to_png(input_file, output_file)