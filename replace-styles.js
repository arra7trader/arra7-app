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

        // Backgrounds
        content = content.replace(/\bbg-white\b/g, 'bg-[var(--bg-primary)]');
        content = content.replace(/\bbg-gray-50\b/g, 'bg-[var(--bg-secondary)]');
        content = content.replace(/\bbg-gray-100\b/g, 'bg-[var(--bg-secondary)]');
        
        // Borders
        content = content.replace(/\bborder-gray-100\b/g, 'border-[var(--border-light)]');
        content = content.replace(/\bborder-gray-200\b/g, 'border-[var(--border-light)]');
        content = content.replace(/\bborder-gray-300\b/g, 'border-[var(--border-medium)]');
        
        // Text
        content = content.replace(/\btext-gray-500\b/g, 'text-[var(--text-secondary)]');
        content = content.replace(/\btext-gray-600\b/g, 'text-[var(--text-secondary)]');
        content = content.replace(/\btext-gray-700\b/g, 'text-[var(--text-primary)]');
        content = content.replace(/\btext-gray-800\b/g, 'text-[var(--text-primary)]');
        content = content.replace(/\btext-gray-900\b/g, 'text-[var(--text-primary)]');

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
