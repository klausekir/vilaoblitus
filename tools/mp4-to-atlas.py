"""
Converte um vídeo MP4 em Atlas PNG com transparência.
Usa ffmpeg para extrair frames e remove o fundo usando detecção de cor.

Uso: python mp4-to-atlas.py <video.mp4> <output_name> [tolerancia] [max_frames]

Exemplos:
  python mp4-to-atlas.py fogo.mp4 fogo
  python mp4-to-atlas.py fogo.mp4 fogo 30 20
"""

from PIL import Image
import subprocess
import sys
import os
import math
import shutil
import json


def extract_frames_from_mp4(video_path, output_dir, max_frames=20):
    """
    Extrai frames do vídeo MP4 usando ffmpeg.
    """
    # Criar diretório temporário para frames
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)
    
    # Primeiro, obter informações do vídeo
    probe_cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-count_packets', '-show_entries',
        'stream=nb_read_packets,width,height,r_frame_rate',
        '-of', 'csv=p=0',
        video_path
    ]
    
    try:
        result = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
        info = result.stdout.strip().split(',')
        width = int(info[0])
        height = int(info[1])
        # Parse frame rate (pode ser "30/1" ou "29.97")
        fps_str = info[2]
        if '/' in fps_str:
            num, den = fps_str.split('/')
            fps = float(num) / float(den)
        else:
            fps = float(fps_str)
        total_frames = int(info[3]) if len(info) > 3 else None
        
        print(f"Vídeo: {width}x{height}, {fps:.2f} FPS")
        if total_frames:
            print(f"Total de frames estimado: {total_frames}")
    except Exception as e:
        print(f"Aviso: Não foi possível obter informações do vídeo: {e}")
        width, height, fps = None, None, 30
    
    # Extrair frames
    # Usar fps filter para limitar número de frames
    if max_frames and fps:
        # Calcular intervalo para pegar max_frames
        output_fps = max_frames / 2  # Assumir vídeo de ~2 segundos, ajustar conforme necessário
        fps_filter = f'fps={min(output_fps, fps)}'
    else:
        fps_filter = 'fps=10'
    
    extract_cmd = [
        'ffmpeg', '-i', video_path,
        '-vf', fps_filter,
        '-vsync', 'vfr',
        f'{output_dir}/frame_%04d.png'
    ]
    
    print(f"\nExtraindo frames...")
    try:
        subprocess.run(extract_cmd, capture_output=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Erro ao extrair frames: {e.stderr.decode() if e.stderr else e}")
        return None
    
    # Contar frames extraídos
    frames = sorted([f for f in os.listdir(output_dir) if f.endswith('.png')])
    print(f"Extraídos {len(frames)} frames")
    
    # Limitar a max_frames se necessário
    if len(frames) > max_frames:
        step = len(frames) / max_frames
        selected = []
        for i in range(max_frames):
            idx = int(i * step)
            selected.append(frames[idx])
        
        # Remover frames não selecionados
        for f in frames:
            if f not in selected:
                os.remove(os.path.join(output_dir, f))
        
        # Renomear frames selecionados
        for i, f in enumerate(selected):
            old_path = os.path.join(output_dir, f)
            new_path = os.path.join(output_dir, f'frame_{i:04d}.png')
            if old_path != new_path:
                os.rename(old_path, new_path)
        
        print(f"Reduzido para {max_frames} frames")
    
    return output_dir


def remove_background_from_frames(frames_dir, threshold=30, mask_region=None):
    """
    Remove o fundo de cada frame usando detecção de cor.
    
    Args:
        frames_dir: Diretório com os frames
        threshold: Tolerância de cor para remoção de fundo
        mask_region: Tupla (x1, y1, x2, y2) da região a mascarar (logo/marca d'água)
    """
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    
    if not frames:
        print("Nenhum frame encontrado!")
        return
    
    # Carregar primeiro frame para detectar cor de fundo
    first_frame_path = os.path.join(frames_dir, frames[0])
    first_frame = Image.open(first_frame_path).convert("RGBA")
    
    # Detectar cor de fundo (canto superior esquerdo)
    bg_color = first_frame.getpixel((0, 0))[:3]
    print(f"\nCor de fundo detectada (R,G,B): {bg_color}")
    print(f"Tolerância: {threshold}")
    
    if mask_region:
        print(f"Região da logo/máscara: {mask_region}")
    
    print("Removendo fundo dos frames...")
    
    # Processar cada frame
    for i, frame_file in enumerate(frames):
        frame_path = os.path.join(frames_dir, frame_file)
        frame = Image.open(frame_path).convert("RGBA")
        pixels = frame.load()
        width, height = frame.size
        
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                
                # Verificar se está na região da máscara (logo)
                if mask_region:
                    mx1, my1, mx2, my2 = mask_region
                    if mx1 <= x <= mx2 and my1 <= y <= my2:
                        pixels[x, y] = (r, g, b, 0)  # Tornar transparente
                        continue
                
                # Verificar se pixel é similar ao fundo
                diff_r = abs(r - bg_color[0])
                diff_g = abs(g - bg_color[1])
                diff_b = abs(b - bg_color[2])
                
                if diff_r <= threshold and diff_g <= threshold and diff_b <= threshold:
                    pixels[x, y] = (r, g, b, 0)  # Tornar transparente
        
        # Salvar frame com transparência
        frame.save(frame_path)
        
        if (i + 1) % 5 == 0 or i == len(frames) - 1:
            print(f"  Processados {i + 1}/{len(frames)} frames...")


def apply_pingpong(frames_dir):
    """
    Duplica os frames em ordem reversa para criar efeito vai-e-volta (ping-pong).
    Ex: frames 0,1,2,3 viram 0,1,2,3,2,1 (sem repetir primeiro e último)
    """
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    
    if len(frames) < 2:
        print("Poucos frames para aplicar pingpong")
        return
    
    print(f"\nAplicando efeito ping-pong (vai e volta)...")
    print(f"  Frames originais: {len(frames)}")
    
    # Copiar frames do meio em ordem reversa (excluindo primeiro e último para evitar "pause")
    frames_to_copy = frames[1:-1][::-1]  # Reverso, sem primeiro e último
    
    original_count = len(frames)
    
    for i, frame_file in enumerate(frames_to_copy):
        src_path = os.path.join(frames_dir, frame_file)
        new_index = original_count + i
        dst_path = os.path.join(frames_dir, f'frame_{new_index:04d}.png')
        
        # Copiar frame
        img = Image.open(src_path)
        img.save(dst_path)
    
    total = original_count + len(frames_to_copy)
    print(f"  Frames adicionados: {len(frames_to_copy)}")
    print(f"  Total final: {total} frames")


def apply_mirror(frames_dir):
    """
    Duplica os frames espelhados horizontalmente para animações de ida e volta.
    Ex: personagem andando para direita, depois andando para esquerda (espelhado).
    """
    from PIL import ImageOps
    
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    
    if not frames:
        print("Nenhum frame para espelhar")
        return
    
    print(f"\nAplicando espelhamento horizontal...")
    print(f"  Frames originais: {len(frames)}")
    
    original_count = len(frames)
    
    for i, frame_file in enumerate(frames):
        src_path = os.path.join(frames_dir, frame_file)
        new_index = original_count + i
        dst_path = os.path.join(frames_dir, f'frame_{new_index:04d}.png')
        
        # Carregar e espelhar horizontalmente
        img = Image.open(src_path)
        mirrored = ImageOps.mirror(img)
        mirrored.save(dst_path)
    
    total = original_count * 2
    print(f"  Frames espelhados: {original_count}")
    print(f"  Total final: {total} frames")


def create_atlas_from_frames(frames_dir, output_name, output_dir='images/objects'):
    """
    Cria um atlas PNG + JSON a partir dos frames processados.
    """
    frames = sorted([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    
    if not frames:
        print("Nenhum frame encontrado!")
        return None
    
    # Carregar primeiro frame para dimensões
    first_frame = Image.open(os.path.join(frames_dir, frames[0]))
    frame_width, frame_height = first_frame.size
    
    print(f"\nCriando atlas de {len(frames)} frames ({frame_width}x{frame_height} cada)...")
    
    # Calcular layout grid
    cols = math.ceil(math.sqrt(len(frames)))
    rows = math.ceil(len(frames) / cols)
    
    atlas_width = cols * frame_width
    atlas_height = rows * frame_height
    
    print(f"Grid: {cols}x{rows} = {atlas_width}x{atlas_height}")
    
    # Criar imagem do atlas
    atlas = Image.new('RGBA', (atlas_width, atlas_height), (0, 0, 0, 0))
    
    # JSON metadata
    atlas_data = {
        "frames": {},
        "meta": {
            "image": f"{output_name}_atlas.png",
            "size": {"w": atlas_width, "h": atlas_height},
            "scale": "1"
        }
    }
    
    # Copiar cada frame para o atlas
    for i, frame_file in enumerate(frames):
        frame = Image.open(os.path.join(frames_dir, frame_file))
        
        col = i % cols
        row = i // cols
        x = col * frame_width
        y = row * frame_height
        
        atlas.paste(frame, (x, y))
        
        # Adicionar metadata
        atlas_data["frames"][f"{output_name}_{i}"] = {
            "frame": {"x": x, "y": y, "w": frame_width, "h": frame_height},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": frame_width, "h": frame_height},
            "sourceSize": {"w": frame_width, "h": frame_height}
        }
    
    # Criar diretório de saída se não existir
    os.makedirs(output_dir, exist_ok=True)
    
    # Salvar PNG
    png_path = os.path.join(output_dir, f"{output_name}_atlas.png")
    atlas.save(png_path, optimize=True)
    png_size = os.path.getsize(png_path) / 1024
    print(f"\nAtlas PNG salvo: {png_path} ({png_size:.2f} KB)")
    
    # Salvar JSON
    json_path = os.path.join(output_dir, f"{output_name}_atlas.json")
    with open(json_path, 'w') as f:
        json.dump(atlas_data, f, indent=2)
    json_size = os.path.getsize(json_path) / 1024
    print(f"Atlas JSON salvo: {json_path} ({json_size:.2f} KB)")
    
    return {
        "png_path": png_path,
        "json_path": json_path,
        "frames": len(frames),
        "cols": cols,
        "rows": rows,
        "size": f"{atlas_width}x{atlas_height}"
    }


def mp4_to_atlas(video_path, output_name, threshold=30, max_frames=20, output_dir='images/objects', mask_region=None, pingpong=False, mirror=False):
    """
    Pipeline completo: MP4 -> Frames -> Remove fundo -> Atlas PNG + JSON
    
    Args:
        mask_region: Tupla (x1, y1, x2, y2) da região a mascarar (logo/marca d'água)
        pingpong: Se True, duplica frames em ordem reversa (vai e volta)
        mirror: Se True, duplica frames espelhados horizontalmente
    """
    print("=" * 70)
    print("MP4 TO ATLAS - Converte vídeo para sprite atlas com transparência")
    print("=" * 70)
    print(f"\nEntrada: {video_path}")
    print(f"Saída: {output_name}_atlas.png/json")
    print(f"Tolerância de fundo: {threshold}")
    print(f"Máximo de frames: {max_frames}")
    if mask_region:
        print(f"Máscara (logo): {mask_region}")
    if pingpong:
        print("Modo: Ping-pong (vai e volta)")
    if mirror:
        print("Modo: Mirror (espelhado)")
    print("=" * 70)
    
    # Verificar se ffmpeg está disponível
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    except FileNotFoundError:
        print("\nERRO: ffmpeg não encontrado!")
        print("Instale ffmpeg: https://ffmpeg.org/download.html")
        print("Windows: choco install ffmpeg")
        return None
    
    # Step 1: Extrair frames
    temp_dir = f"temp_frames_{output_name}"
    frames_dir = extract_frames_from_mp4(video_path, temp_dir, max_frames)
    
    if not frames_dir:
        return None
    
    # Step 2: Remover fundo (e máscara se especificada)
    remove_background_from_frames(frames_dir, threshold, mask_region)
    
    # Step 3: Aplicar efeito pingpong ou mirror se solicitado
    if pingpong:
        apply_pingpong(frames_dir)
    elif mirror:
        apply_mirror(frames_dir)
    
    # Step 4: Criar atlas
    result = create_atlas_from_frames(frames_dir, output_name, output_dir)
    
    # Limpar arquivos temporários
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
        print(f"\nArquivos temporários removidos.")
    
    if result:
        print("\n" + "=" * 70)
        print("SUCESSO!")
        print(f"  Frames: {result['frames']}")
        print(f"  Grid: {result['cols']}x{result['rows']}")
        print(f"  Tamanho: {result['size']}")
        print("=" * 70)
    
    return result


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("=" * 70)
        print("MP4 TO ATLAS - Converte vídeo para sprite atlas com transparência")
        print("=" * 70)
        print("\nUso: python mp4-to-atlas.py <video.mp4> <output_name> [tolerancia] [max_frames] [opções]")
        print("\nExemplos:")
        print("  python mp4-to-atlas.py fogo.mp4 fogo")
        print("  python mp4-to-atlas.py efeito.mp4 efeito 30 20")
        print("  python mp4-to-atlas.py ghost.mp4 ghost 30 20 --mask 700,400,864,480")
        print("  python mp4-to-atlas.py ghost.mp4 ghost 30 20 --pingpong")
        print("  python mp4-to-atlas.py ghost.mp4 ghost 30 20 --mirror")
        print("\nParâmetros:")
        print("  video.mp4   : Vídeo de entrada")
        print("  output_name : Nome base para os arquivos de saída")
        print("  tolerancia  : Tolerância de cor para remoção de fundo (padrão: 30)")
        print("  max_frames  : Número máximo de frames no atlas (padrão: 20)")
        print("\nOpções:")
        print("  --mask x1,y1,x2,y2 : Região retangular a mascarar (logo/marca d'água)")
        print("  --pingpong         : Duplica frames em ordem reversa (vai e volta)")
        print("  --mirror           : Duplica frames espelhados (ida e volta com flip)")
        print("\nPara selecionar a região da logo interativamente:")
        print("  python select-mask-region.py video.mp4")
        print("\nRequisitos:")
        print("  - ffmpeg instalado e no PATH")
        print("  - Pillow (pip install Pillow)")
        print("=" * 70)
    else:
        video_path = sys.argv[1]
        output_name = sys.argv[2]
        
        threshold = 30
        max_frames = 20
        mask_region = None
        pingpong = False
        mirror = False
        
        # Parse argumentos posicionais e opcionais
        args = sys.argv[3:]
        i = 0
        pos_idx = 0  # Índice para argumentos posicionais
        while i < len(args):
            if args[i] == '--mask' and i + 1 < len(args):
                try:
                    coords = args[i + 1].split(',')
                    mask_region = (int(coords[0]), int(coords[1]), int(coords[2]), int(coords[3]))
                    print(f"Máscara configurada: {mask_region}")
                except (ValueError, IndexError):
                    print(f"Aviso: Formato de máscara inválido '{args[i + 1]}'. Use: x1,y1,x2,y2")
                i += 2
            elif args[i] == '--pingpong':
                pingpong = True
                i += 1
            elif args[i] == '--mirror':
                mirror = True
                i += 1
            else:
                # Argumentos posicionais: threshold e max_frames
                if pos_idx == 0:
                    try:
                        threshold = int(args[i])
                    except ValueError:
                        print(f"Aviso: Tolerância '{args[i]}' inválida. Usando padrão 30.")
                elif pos_idx == 1:
                    try:
                        max_frames = int(args[i])
                    except ValueError:
                        print(f"Aviso: Max frames '{args[i]}' inválido. Usando padrão 20.")
                pos_idx += 1
                i += 1
        
        mp4_to_atlas(video_path, output_name, threshold, max_frames, mask_region=mask_region, pingpong=pingpong, mirror=mirror)


