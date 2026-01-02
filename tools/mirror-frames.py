from PIL import Image, ImageOps
import os
import sys

def mirror_and_duplicate_frames(frames_dir, output_dir=None):
    """
    Espelha frames e adiciona ao final para criar animação de ida e volta.

    Args:
        frames_dir: Diretório com frames PNG
        output_dir: Diretório de saída (opcional, usa o mesmo se não especificado)
    """
    if output_dir is None:
        output_dir = frames_dir

    # Criar diretório de saída se não existir
    os.makedirs(output_dir, exist_ok=True)

    # Listar frames PNG
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])

    if not frames:
        print(f"Erro: Nenhum frame PNG encontrado em '{frames_dir}'")
        return

    print(f"Encontrados {len(frames)} frames originais")
    print(f"Criando frames espelhados para animação de ida e volta...\n")

    original_count = len(frames)

    # Primeiro, copiar frames originais se output_dir for diferente
    if output_dir != frames_dir:
        for i, frame_file in enumerate(frames):
            src = os.path.join(frames_dir, frame_file)
            dst = os.path.join(output_dir, f'frame_{i:04d}.png')
            img = Image.open(src)
            img.save(dst)
            print(f"  Copiado: {frame_file} -> frame_{i:04d}.png")

    # Criar frames espelhados (na mesma ordem, só espelha a imagem)
    print("\nCriando frames espelhados...")

    # Manter ordem para aranha andar na direção oposta
    for i, frame_file in enumerate(frames):
        src_path = os.path.join(frames_dir, frame_file)

        # Carregar imagem
        img = Image.open(src_path)

        # Espelhar horizontalmente
        mirrored = ImageOps.mirror(img)

        # Salvar como novo frame
        new_index = original_count + i
        output_path = os.path.join(output_dir, f'frame_{new_index:04d}.png')
        mirrored.save(output_path)

        print(f"  Espelhado: {frame_file} -> frame_{new_index:04d}.png")

    total_frames = original_count * 2

    print(f"\n✓ Completo!")
    print(f"  Frames originais: {original_count}")
    print(f"  Frames espelhados: {original_count}")
    print(f"  Total: {total_frames} frames")
    print(f"\nFrames salvos em: {output_dir}")
    print("\nAnimação criada:")
    print(f"  frames 0-{original_count-1}: Ida (direita → esquerda)")
    print(f"  frames {original_count}-{total_frames-1}: Volta (esquerda → direita, espelhado)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("=" * 70)
        print("ESPELHAR FRAMES - Criar animação de ida e volta")
        print("=" * 70)
        print("\nUso: python mirror-frames.py <diretorio_frames> [diretorio_saida]")
        print("\nExemplos:")
        print("  python tools/mirror-frames.py frames_spider_no_bg")
        print("  python tools/mirror-frames.py frames_spider_no_bg frames_spider_round_trip")
        print("\nO que faz:")
        print("  - Lê todos os frames PNG do diretório")
        print("  - Cria versões espelhadas (flip horizontal)")
        print("  - Adiciona frames espelhados ao final")
        print("  - Resultado: animação de ida e volta suave")
        print("\nExemplo de resultado:")
        print("  17 frames originais -> 34 frames total (17 ida + 17 volta)")
        print("=" * 70)
    else:
        frames_dir = sys.argv[1]
        output_dir = sys.argv[2] if len(sys.argv) > 2 else None

        print(f"\n{'='*70}")
        print(f"Processando: {frames_dir}")
        if output_dir:
            print(f"Saída em: {output_dir}")
        else:
            print(f"Saída em: {frames_dir} (mesmo diretório)")
        print(f"{'='*70}\n")

        mirror_and_duplicate_frames(frames_dir, output_dir)
