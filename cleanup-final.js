const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
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

const targetDirs = [
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src'),
];

let files = [];
targetDirs.forEach(dir => {
    files = files.concat(walk(dir));
});

let changedCount = 0;

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        const colors = 'blue|emerald|green|red|rose|amber|purple|indigo|cyan|fuchsia|pink|teal';

        // 1. Backgrounds
        content = content.replace(new RegExp(`\\bbg-(${colors})-50/50\\b`, 'g'), 'bg-$1-500/5');
        content = content.replace(new RegExp(`\\bbg-(${colors})-50\\b`, 'g'), 'bg-$1-500/10');
        content = content.replace(new RegExp(`\\bbg-(${colors})-100\\b`, 'g'), 'bg-$1-500/10');
        content = content.replace(new RegExp(`\\bbg-slate-200\\b`, 'g'), 'bg-[var(--bg-secondary)]');

        // 2. Borders
        content = content.replace(new RegExp(`\\bborder-(${colors})-100\\b`, 'g'), 'border-$1-500/20');
        content = content.replace(new RegExp(`\\bborder-(${colors})-200\\b`, 'g'), 'border-$1-500/20');

        // 3. Texts
        content = content.replace(new RegExp(`\\btext-(${colors})-(800|900)\\b`, 'g'), 'text-$1-400');
        
        // Remove text opacity classes if they interfere, or let them be for now.

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            changedCount++;
            console.log(`Updated final glass styling: ${file}`);
        }
    } catch (e) {
        console.error(`Error processing file ${file}:`, e);
    }
});

console.log(`Successfully updated ${changedCount} files with final glassmorphism rules.`);
