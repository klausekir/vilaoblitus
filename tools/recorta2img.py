import cv2
import os
import tkinter as tk
from tkinter import filedialog

def main():
    # 1. Configurar Tkinter para não mostrar a janela principal, apenas os diálogos
    root = tk.Tk()
    root.withdraw()

    print("--- INICIANDO ---")

    # 2. Selecionar a imagem COM O OBJETO (Referência)
    print("Selecione a imagem que contem o OBJETO...")
    path_obj = filedialog.askopenfilename(
        title="Selecione a imagem COM O OBJETO (Referência)",
        filetypes=[("Imagens", "*.jpg *.jpeg *.png *.bmp")]
    )
    
    if not path_obj:
        print("Nenhum arquivo selecionado. Encerrando.")
        return

    # 3. Selecionar a imagem SEM O OBJETO (Fundo)
    print("Selecione a imagem SEM O OBJETO (Para aplicar o mesmo corte)...")
    path_bg = filedialog.askopenfilename(
        title="Selecione a imagem SEM O OBJETO",
        filetypes=[("Imagens", "*.jpg *.jpeg *.png *.bmp")]
    )

    if not path_bg:
        print("Segunda imagem não selecionada. Encerrando.")
        return

    # 4. Carregar imagens
    img_obj = cv2.imread(path_obj)
    img_bg = cv2.imread(path_bg)

    # Verificação de segurança: Tamanhos devem ser iguais
    if img_obj.shape != img_bg.shape:
        print(f"AVISO: As imagens têm tamanhos diferentes!")
        print(f"Img Objeto: {img_obj.shape} | Img Fundo: {img_bg.shape}")
        print("O recorte pode não corresponder à mesma área física.")
        confirm = input("Deseja continuar mesmo assim? (s/n): ")
        if confirm.lower() != 's':
            return

    # 5. Abrir ferramenta de seleção (ROI Selector)
    print("\nINSTRUÇÕES:")
    print("1. Desenhe um retângulo na imagem que abriu.")
    print("2. Pressione ENTER ou ESPAÇO para confirmar o corte.")
    print("3. Pressione C para cancelar.")
    
    # A função selectROI retorna (x, y, largura, altura)
    # A janela terá o nome "Selecione a Area e aperte ENTER"
    roi = cv2.selectROI("Selecione a Area e aperte ENTER", img_obj, showCrosshair=True, fromCenter=False)
    
    # Fechar a janela de seleção
    cv2.destroyAllWindows()

    x, y, w, h = roi

    # Se w ou h forem 0, o usuário cancelou a seleção
    if w == 0 or h == 0:
        print("Seleção cancelada pelo usuário.")
        return

    # 6. Aplicar o recorte (Slicing) nas duas imagens
    crop_obj = img_obj[y:y+h, x:x+w]
    crop_bg = img_bg[y:y+h, x:x+w]

    # 7. Gerar nomes de saída
    # Pega o nome do arquivo original e adiciona "_recorte"
    base_obj = os.path.splitext(os.path.basename(path_obj))[0]
    base_bg = os.path.splitext(os.path.basename(path_bg))[0]
    
    out_obj = f"{base_obj}_recorte.jpg"
    out_bg = f"{base_bg}_recorte.jpg"

    # 8. Salvar
    cv2.imwrite(out_obj, crop_obj)
    cv2.imwrite(out_bg, crop_bg)

    print("\n--- SUCESSO ---")
    print(f"Recorte salvo: {out_obj}")
    print(f"Recorte salvo: {out_bg}")
    print(f"Dimensões do recorte: {w}x{h} pixels")

if __name__ == "__main__":
    main()