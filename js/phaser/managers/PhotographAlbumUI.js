/**
 * PhotographAlbumUI
 * Interface para visualizar álbum de fotografias
 */
class PhotographAlbumUI {
    constructor() {
        this.albumOpen = false;
        this.currentPhotoIndex = 0;
    }

    /**
     * Abrir álbum de fotografias
     */
    openAlbum() {
        if (this.albumOpen) return;

        const photos = gameStateManager.getPhotographs();

        if (photos.length === 0) {
            uiManager.showNotification('Você ainda não tirou nenhuma fotografia.');
            return;
        }

        this.albumOpen = true;
        this.currentPhotoIndex = 0;
        this.render(photos);
    }

    /**
     * Fechar álbum
     */
    closeAlbum() {
        const modal = document.getElementById('photograph-album-modal');
        if (modal) {
            modal.remove();
        }
        this.albumOpen = false;
    }

    /**
     * Renderizar álbum
     */
    render(photos) {
        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'photograph-album-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            color: #f0a500;
            font-size: 24px;
            margin-bottom: 20px;
            text-align: center;
        `;
        header.innerHTML = `<strong>Álbum de Fotografias</strong><br><span style="font-size: 14px;">${photos.length} foto(s)</span>`;

        // Container principal
        const container = document.createElement('div');
        container.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #f0a500;
            border-radius: 10px;
            padding: 20px;
            max-width: 800px;
            width: 100%;
            max-height: 70vh;
            overflow-y: auto;
        `;

        // Grid de fotos
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
        `;

        photos.forEach((photo, index) => {
            const photoCard = this.createPhotoCard(photo, index);
            grid.appendChild(photoCard);
        });

        container.appendChild(grid);

        // Botão fechar
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Fechar';
        closeBtn.style.cssText = `
            margin-top: 20px;
            padding: 10px 30px;
            background: #f0a500;
            color: #000;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
        `;
        closeBtn.onclick = () => this.closeAlbum();

        modal.appendChild(header);
        modal.appendChild(container);
        modal.appendChild(closeBtn);

        document.body.appendChild(modal);

        // Fechar com ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeAlbum();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Criar card de foto
     */
    createPhotoCard(photo, index) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.3s;
        `;

        card.onmouseenter = () => {
            card.style.borderColor = '#f0a500';
            card.style.transform = 'scale(1.05)';
        };

        card.onmouseleave = () => {
            card.style.borderColor = '#444';
            card.style.transform = 'scale(1)';
        };

        card.onclick = () => this.viewPhoto(photo, index);

        // Imagem
        const img = document.createElement('img');
        img.src = photo.image;
        img.style.cssText = `
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 5px;
            margin-bottom: 10px;
        `;

        // Caption
        const caption = document.createElement('div');
        caption.textContent = photo.caption;
        caption.style.cssText = `
            color: #ccc;
            font-size: 12px;
            text-align: center;
            margin-bottom: 5px;
        `;

        // Localização
        const location = document.createElement('div');
        location.textContent = `📍 ${photo.location}`;
        location.style.cssText = `
            color: #888;
            font-size: 10px;
            text-align: center;
        `;

        card.appendChild(img);
        card.appendChild(caption);
        card.appendChild(location);

        return card;
    }

    /**
     * Visualizar foto em tamanho grande
     */
    viewPhoto(photo, index) {
        const viewer = document.createElement('div');
        viewer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.98);
            z-index: 11000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        // Imagem grande
        const img = document.createElement('img');
        img.src = photo.image;
        img.style.cssText = `
            max-width: 90%;
            max-height: 70vh;
            border: 3px solid #f0a500;
            border-radius: 10px;
            box-shadow: 0 0 30px rgba(240, 165, 0, 0.5);
        `;

        // Info
        const info = document.createElement('div');
        info.style.cssText = `
            color: #f0a500;
            font-size: 18px;
            text-align: center;
            margin-top: 20px;
            max-width: 600px;
        `;
        info.innerHTML = `
            <strong>${photo.caption}</strong><br>
            <span style="font-size: 14px; color: #888;">📍 ${photo.location}</span>
        `;

        // Clue data (se tiver)
        if (photo.clueData) {
            const clueDiv = document.createElement('div');
            clueDiv.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #f0a500;
                border-radius: 5px;
                padding: 10px;
                margin-top: 10px;
                font-size: 14px;
                color: #ccc;
            `;
            clueDiv.innerHTML = `<strong>Pista:</strong> ${JSON.stringify(photo.clueData)}`;
            info.appendChild(clueDiv);
        }

        // Botão fechar
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Voltar';
        closeBtn.style.cssText = `
            margin-top: 20px;
            padding: 10px 30px;
            background: #f0a500;
            color: #000;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            font-weight: bold;
        `;
        closeBtn.onclick = () => viewer.remove();

        viewer.appendChild(img);
        viewer.appendChild(info);
        viewer.appendChild(closeBtn);

        document.body.appendChild(viewer);

        // Fechar com clique fora ou ESC
        viewer.onclick = (e) => {
            if (e.target === viewer) viewer.remove();
        };

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                viewer.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    /**
     * Adicionar botão de câmera ao hotspot
     */
    addCameraButtonToHotspot(hotspot, scene, locationId) {
        if (!hotspot.photographable) return;

        // Criar botão de câmera próximo ao hotspot
        const buttonX = hotspot.x + (hotspot.width || 50);
        const buttonY = hotspot.y;

        const cameraBtn = scene.add.text(buttonX, buttonY, '📷', {
            fontSize: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: { x: 8, y: 5 }
        });

        cameraBtn.setInteractive({ useHandCursor: true });
        cameraBtn.setDepth(150);

        cameraBtn.on('pointerdown', () => {
            const result = gameStateManager.takePhotograph(
                locationId,
                hotspot.id,
                hotspot.photographImage || hotspot.image,
                hotspot.photographCaption || hotspot.description,
                hotspot.clueData
            );

            if (result.success) {
                uiManager.showNotification('📷 Fotografia adicionada ao álbum!');
                cameraBtn.destroy(); // Remover botão após fotografar
            } else {
                uiManager.showNotification(result.message);
            }
        });

        return cameraBtn;
    }
}

// Instância global
const photographAlbumUI = new PhotographAlbumUI();
