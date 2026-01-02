const fs = require('fs');
const { PNG } = require('pngjs');
const path = require('path');

async function createAtlasFromPNGs(framesDir, outputName) {
    // Get all PNG files
    const files = fs.readdirSync(framesDir)
        .filter(f => f.endsWith('.png'))
        .sort();

    console.log(`Found ${files.length} PNG frames`);

    // Load first frame to get dimensions
    const firstFramePath = path.join(framesDir, files[0]);
    const firstFrame = PNG.sync.read(fs.readFileSync(firstFramePath));
    const frameWidth = firstFrame.width;
    const frameHeight = firstFrame.height;

    console.log(`Frame size: ${frameWidth}x${frameHeight}`);

    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(files.length));
    const rows = Math.ceil(files.length / cols);

    console.log(`Creating atlas: ${cols}x${rows} grid`);

    const atlasWidth = cols * frameWidth;
    const atlasHeight = rows * frameHeight;

    // Create atlas PNG
    const atlas = new PNG({
        width: atlasWidth,
        height: atlasHeight
    });

    // Fill with transparent
    atlas.data.fill(0);

    // Create JSON metadata
    const atlasData = {
        frames: {},
        meta: {
            image: `${outputName}_atlas.png`,
            size: { w: atlasWidth, h: atlasHeight },
            scale: "1"
        }
    };

    // Process each frame
    files.forEach((file, index) => {
        const framePath = path.join(framesDir, file);
        const frame = PNG.sync.read(fs.readFileSync(framePath));

        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * frameWidth;
        const y = row * frameHeight;

        // Copy frame to atlas
        for (let py = 0; py < frameHeight; py++) {
            for (let px = 0; px < frameWidth; px++) {
                const srcIdx = (py * frameWidth + px) * 4;
                const dstIdx = ((y + py) * atlasWidth + (x + px)) * 4;

                atlas.data[dstIdx] = frame.data[srcIdx];
                atlas.data[dstIdx + 1] = frame.data[srcIdx + 1];
                atlas.data[dstIdx + 2] = frame.data[srcIdx + 2];
                atlas.data[dstIdx + 3] = frame.data[srcIdx + 3];
            }
        }

        // Add to JSON
        atlasData.frames[`${outputName}_${index}`] = {
            frame: { x, y, w: frameWidth, h: frameHeight },
            rotated: false,
            trimmed: false,
            spriteSourceSize: { x: 0, y: 0, w: frameWidth, h: frameHeight },
            sourceSize: { w: frameWidth, h: frameHeight }
        };

        if ((index + 1) % 5 === 0) {
            console.log(`  Processed ${index + 1}/${files.length} frames...`);
        }
    });

    // Save atlas PNG
    const pngPath = `images/objects/${outputName}_atlas.png`;
    const buffer = PNG.sync.write(atlas);
    fs.writeFileSync(pngPath, buffer);

    console.log(`\nAtlas PNG saved: ${pngPath}`);
    console.log(`Size: ${(buffer.length / 1024).toFixed(2)} KB`);

    // Save JSON
    const jsonPath = `images/objects/${outputName}_atlas.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(atlasData, null, 2));

    console.log(`Atlas JSON saved: ${jsonPath}`);

    return { pngPath, jsonPath, frames: files.length, cols, rows };
}

// Get directory from command line argument or use default
const framesDir = process.argv[2] || 'frames_spider_no_bg';
const outputName = process.argv[3] || 'spider';

console.log(`Input: ${framesDir}`);
console.log(`Output: ${outputName}_atlas.png/json\n`);

// Create atlas from extracted frames
createAtlasFromPNGs(framesDir, outputName)
    .then(result => {
        console.log(`\nAtlas created successfully!`);
        console.log(`  Frames: ${result.frames}`);
        console.log(`  Grid: ${result.cols}x${result.rows}`);
    })
    .catch(err => {
        console.error('Error:', err);
    });
