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


def remove_background_from_frames(frames_dir, threshold=30):
    """
    Remove o fundo de cada frame usando detecção de cor.
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


def mp4_to_atlas(video_path, output_name, threshold=30, max_frames=20, output_dir='images/objects'):
    """
    Pipeline completo: MP4 -> Frames -> Remove fundo -> Atlas PNG + JSON
    """
    print("=" * 70)
    print("MP4 TO ATLAS - Converte vídeo para sprite atlas com transparência")
    print("=" * 70)
    print(f"\nEntrada: {video_path}")
    print(f"Saída: {output_name}_atlas.png/json")
    print(f"Tolerância de fundo: {threshold}")
    print(f"Máximo de frames: {max_frames}")
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
    
    # Step 2: Remover fundo
    remove_background_from_frames(frames_dir, threshold)
    
    # Step 3: Criar atlas
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
        print("\nUso: python mp4-to-atlas.py <video.mp4> <output_name> [tolerancia] [max_frames]")
        print("\nExemplos:")
        print("  python mp4-to-atlas.py fogo.mp4 fogo")
        print("  python mp4-to-atlas.py efeito.mp4 efeito 30 20")
        print("\nParâmetros:")
        print("  video.mp4   : Vídeo de entrada")
        print("  output_name : Nome base para os arquivos de saída")
        print("  tolerancia  : Tolerância de cor para remoção de fundo (padrão: 30)")
        print("  max_frames  : Número máximo de frames no atlas (padrão: 20)")
        print("\nRequisitos:")
        print("  - ffmpeg instalado e no PATH")
        print("  - Pillow (pip install Pillow)")
        print("=" * 70)
    else:
        video_path = sys.argv[1]
        output_name = sys.argv[2]
        
        threshold = 30
        if len(sys.argv) > 3:
            try:
                threshold = int(sys.argv[3])
            except ValueError:
                print(f"Aviso: Tolerância '{sys.argv[3]}' inválida. Usando padrão 30.")
        
        max_frames = 20
        if len(sys.argv) > 4:
            try:
                max_frames = int(sys.argv[4])
            except ValueError:
                print(f"Aviso: Max frames '{sys.argv[4]}' inválido. Usando padrão 20.")
        
        mp4_to_atlas(video_path, output_name, threshold, max_frames)
