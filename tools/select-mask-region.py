"""
Ferramenta interativa para selecionar região a remover (logo/marca d'água).
Abre o primeiro frame do vídeo e permite desenhar um retângulo sobre a área a mascarar.

Uso: python select-mask-region.py <video.mp4 ou imagem.png>

Instruções:
  1. Clique e arraste para selecionar a região da logo
  2. A região selecionada será exibida no console
  3. Use esses valores no mp4-to-atlas.py com o parâmetro --mask
"""

import sys
import os
import subprocess
import tkinter as tk
from tkinter import messagebox
from PIL import Image, ImageTk


class RegionSelector:
    def __init__(self, image_path):
        self.image_path = image_path
        self.start_x = 0
        self.start_y = 0
        self.rect = None
        self.region = None
        
        # Carregar imagem
        self.original_image = Image.open(image_path)
        self.img_width, self.img_height = self.original_image.size
        
        # Criar janela
        self.root = tk.Tk()
        self.root.title(f"Selecione a região da logo - {os.path.basename(image_path)}")
        
        # Calcular escala para caber na tela
        screen_width = self.root.winfo_screenwidth() - 100
        screen_height = self.root.winfo_screenheight() - 150
        
        self.scale = min(1.0, screen_width / self.img_width, screen_height / self.img_height)
        
        display_width = int(self.img_width * self.scale)
        display_height = int(self.img_height * self.scale)
        
        # Redimensionar para exibição
        display_image = self.original_image.resize((display_width, display_height), Image.LANCZOS)
        self.photo = ImageTk.PhotoImage(display_image)
        
        # Instruções
        label = tk.Label(self.root, text="Clique e arraste para selecionar a região da logo. Feche a janela quando terminar.")
        label.pack(pady=5)
        
        # Canvas
        self.canvas = tk.Canvas(self.root, width=display_width, height=display_height)
        self.canvas.pack()
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.photo)
        
        # Bind eventos do mouse
        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        
        # Info da região
        self.info_label = tk.Label(self.root, text="Região: Nenhuma selecionada")
        self.info_label.pack(pady=5)
        
        # Botão de confirmar
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(pady=10)
        
        tk.Button(btn_frame, text="Copiar e Fechar", command=self.copy_and_close).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text="Cancelar", command=self.cancel).pack(side=tk.LEFT, padx=5)
        
    def on_press(self, event):
        self.start_x = event.x
        self.start_y = event.y
        
        if self.rect:
            self.canvas.delete(self.rect)
    
    def on_drag(self, event):
        if self.rect:
            self.canvas.delete(self.rect)
        
        self.rect = self.canvas.create_rectangle(
            self.start_x, self.start_y, event.x, event.y,
            outline='red', width=2
        )
    
    def on_release(self, event):
        # Calcular região real (sem escala)
        x1 = int(min(self.start_x, event.x) / self.scale)
        y1 = int(min(self.start_y, event.y) / self.scale)
        x2 = int(max(self.start_x, event.x) / self.scale)
        y2 = int(max(self.start_y, event.y) / self.scale)
        
        # Garantir que está dentro dos limites
        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(self.img_width, x2)
        y2 = min(self.img_height, y2)
        
        self.region = (x1, y1, x2, y2)
        
        self.info_label.config(
            text=f"Região selecionada: x1={x1}, y1={y1}, x2={x2}, y2={y2} ({x2-x1}x{y2-y1} pixels)"
        )
    
    def copy_and_close(self):
        if self.region:
            x1, y1, x2, y2 = self.region
            mask_param = f"--mask {x1},{y1},{x2},{y2}"
            
            print("\n" + "=" * 70)
            print("REGIÃO SELECIONADA")
            print("=" * 70)
            print(f"  Coordenadas: x1={x1}, y1={y1}, x2={x2}, y2={y2}")
            print(f"  Tamanho: {x2-x1}x{y2-y1} pixels")
            print(f"\nUse este parâmetro no mp4-to-atlas.py:")
            print(f"  python tools/mp4-to-atlas.py video.mp4 nome {mask_param}")
            print("=" * 70)
            
            # Copiar para clipboard
            try:
                self.root.clipboard_clear()
                self.root.clipboard_append(mask_param)
                print("\n✅ Parâmetro copiado para a área de transferência!")
            except:
                pass
        
        self.root.destroy()
    
    def cancel(self):
        self.region = None
        self.root.destroy()
    
    def run(self):
        self.root.mainloop()
        return self.region


def extract_first_frame(video_path):
    """Extrai o primeiro frame do vídeo para seleção."""
    temp_frame = "temp_first_frame.png"
    
    cmd = [
        'ffmpeg', '-i', video_path,
        '-vframes', '1',
        '-y', temp_frame
    ]
    
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        return temp_frame
    except Exception as e:
        print(f"Erro ao extrair frame: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("=" * 70)
        print("SELETOR DE REGIÃO PARA MÁSCARA")
        print("=" * 70)
        print("\nUso: python select-mask-region.py <video.mp4 ou imagem.png>")
        print("\nExemplos:")
        print("  python select-mask-region.py ghost.mp4")
        print("  python select-mask-region.py frame.png")
        print("=" * 70)
        return
    
    input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"Erro: Arquivo '{input_file}' não encontrado.")
        return
    
    # Verificar se é vídeo ou imagem
    temp_frame = None
    if input_file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        print("Extraindo primeiro frame do vídeo...")
        temp_frame = extract_first_frame(input_file)
        if not temp_frame:
            return
        image_path = temp_frame
    else:
        image_path = input_file
    
    # Abrir seletor
    print("Abrindo seletor de região...")
    selector = RegionSelector(image_path)
    region = selector.run()
    
    # Limpar arquivo temporário
    if temp_frame and os.path.exists(temp_frame):
        os.remove(temp_frame)
    
    if not region:
        print("Nenhuma região selecionada.")


if __name__ == "__main__":
    main()
