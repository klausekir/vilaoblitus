#!/usr/bin/env python3
"""
Redimensiona todos os PNGs da pasta images/puzzles para que o maior lado
tenha no máximo 250 pixels, preservando a proporção.

Requisitos:
    pip install pillow

Uso:
    python reduce-puzzle-png.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

TARGET_SIZE = 250
PUZZLE_DIR = Path("images") / "puzzles"


def resize_image(image_path: Path) -> None:
    """Redimensiona a imagem mantendo a proporção."""
    with Image.open(image_path) as img:
        width, height = img.size
        max_side = max(width, height)

        if max_side <= TARGET_SIZE:
            print(f"✔ {image_path.name}: já está em {max_side}px (≤ {TARGET_SIZE}px)")
            return

        scale = TARGET_SIZE / max_side
        new_size = (round(width * scale), round(height * scale))

        resized = img.resize(new_size, Image.LANCZOS)
        resized.save(image_path, optimize=True)
        print(f"✓ {image_path.name}: {width}x{height} → {new_size[0]}x{new_size[1]}")


def main() -> int:
    if not PUZZLE_DIR.exists():
        print(f"Pasta não encontrada: {PUZZLE_DIR.resolve()}", file=sys.stderr)
        return 1

    png_files = sorted(PUZZLE_DIR.glob("*.png"))
    if not png_files:
        print(f"Nenhum PNG encontrado em {PUZZLE_DIR.resolve()}")
        return 0

    for path in png_files:
        try:
            resize_image(path)
        except Exception as exc:  # pylint: disable=broad-except
            print(f"⚠ Erro ao processar {path.name}: {exc}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
