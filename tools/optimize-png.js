const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

// pngquant-bin exports as ES module with default export
const pngquantModule = require('pngquant-bin');
const pngquant = pngquantModule.default || pngquantModule;

console.log('Using pngquant:', pngquant);

async function optimizePNG(inputPath, outputPath) {
    const originalSize = fs.statSync(inputPath).size;

    console.log(`Optimizing ${inputPath}...`);
    console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);

    return new Promise((resolve, reject) => {
        // Run pngquant: reduce to 256 colors (PNG-8)
        execFile(pngquant, [
            '--quality=65-80',  // Quality range
            '--speed=1',        // Best compression (slower)
            '--force',          // Overwrite existing
            '--output', outputPath,
            inputPath
        ], (error) => {
            if (error) {
                reject(error);
                return;
            }

            const optimizedSize = fs.statSync(outputPath).size;
            const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

            console.log(`Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
            console.log(`Reduction: ${reduction}% smaller`);

            resolve({
                originalSize,
                optimizedSize,
                reduction
            });
        });
    });
}

// Get input path from command line or use default
const inputPath = process.argv[2] || 'images/objects/spider_atlas.png';
const outputPath = inputPath.replace('.png', '_optimized.png');

console.log(`\nOptimizing: ${inputPath}\n`);

optimizePNG(inputPath, outputPath)
    .then(result => {
        console.log('\nOptimization complete!');

        // Copy optimized version over original
        fs.copyFileSync(outputPath, inputPath);
        fs.unlinkSync(outputPath);

        console.log('Replaced original with optimized version');
    })
    .catch(err => {
        console.error('Error:', err.message);
    });
