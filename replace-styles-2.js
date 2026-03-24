const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

const rootDir = path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src');
const files = walk(rootDir);

let changedCount = 0;

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        // Backgrounds missed
        content = content.replace(/\bbg-(slate|zinc|neutral|stone)-(50|100)\b/g, 'bg-[var(--bg-secondary)]');
        
        // Borders missed
        content = content.replace(/\bborder-(slate|zinc|neutral|stone)-(100|200)\b/g, 'border-[var(--border-light)]');
        content = content.replace(/\bborder-(slate|zinc|neutral|stone)-(300)\b/g, 'border-[var(--border-medium)]');
        
        // Text missed
        content = content.replace(/\btext-black\b/g, 'text-[var(--text-primary)]');
        content = content.replace(/\btext-(slate|zinc|neutral|stone)-(800|900|950)\b/g, 'text-[var(--text-primary)]');
        content = content.replace(/\btext-(slate|zinc|neutral|stone)-(500|600|700)\b/g, 'text-[var(--text-secondary)]');

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            changedCount++;
            console.log(`Updated: ${file}`);
        }
    } catch (e) {
        console.error(`Error processing file ${file}:`, e);
    }
});

console.log(`Successfully updated ${changedCount} files.`);
