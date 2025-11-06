#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../../client/src/images/engagement-photos');
const OUTPUT_DIR = path.join(__dirname, '../../client/src/images/engagement-photos-optimized');
const MAX_WIDTH = 2000;
const QUALITY = 85;

async function optimizePhoto(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const outputPath = path.join(OUTPUT_DIR, filename);

  try {
    const stats = await fs.stat(inputPath);
    const originalSize = stats.size;

    await sharp(inputPath)
      .resize(MAX_WIDTH, null, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: QUALITY, progressive: true })
      .toFile(outputPath);

    const newStats = await fs.stat(outputPath);
    const newSize = newStats.size;
    const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    console.log(`✅ ${filename}`);
    console.log(`   ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(newSize / 1024).toFixed(0)}KB (${reduction}% reduction)`);

    return { filename, originalSize, newSize, reduction };
  } catch (error) {
    console.error(`❌ Error optimizing ${filename}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🖼️  Optimizing Engagement Photos...\n');

  // Create output directory
  try {
    await fs.access(OUTPUT_DIR);
  } catch {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory\n`);
  }

  // Get all JPG files
  const files = await fs.readdir(INPUT_DIR);
  const jpgFiles = files.filter(f =>
    f.toLowerCase().endsWith('.jpg') &&
    !f.startsWith('.') &&
    !f.startsWith('old_')
  );

  console.log(`Found ${jpgFiles.length} photos to optimize\n`);

  // Process all photos
  const results = [];
  for (const file of jpgFiles) {
    const result = await optimizePhoto(file);
    if (result) results.push(result);
  }

  // Summary
  console.log('\n📊 Summary:');
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalNew = results.reduce((sum, r) => sum + r.newSize, 0);
  const totalReduction = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1);

  console.log(`   Original size: ${(totalOriginal / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   Optimized size: ${(totalNew / 1024 / 1024).toFixed(1)}MB`);
  console.log(`   Total reduction: ${totalReduction}%`);
  console.log(`   Photos optimized: ${results.length}/${jpgFiles.length}`);

  console.log('\n✨ Done!');
}

main().catch(console.error);
