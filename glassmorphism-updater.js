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
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/components'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/portfolio'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/wallet'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/trading'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/vvip'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/dom-arra'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/ai-trade-doctor'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/analisa-market'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/analisa-saham'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/sentiment-sniffer'),
    path.resolve('d:/LOCAL DOC/ARRA 7 WEB/arra7-app/src/app/fibonacci-kanji')
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

        // White Backgrounds
        content = content.replace(/\bbg-white\b/g, 'bg-[var(--bg-primary)]');
        
        // Gray/Neutral Backgrounds (convert to secondary/tertiary)
        content = content.replace(/\bbg-(gray|slate|zinc|neutral|stone)-(50|100)\b/g, 'bg-[var(--bg-secondary)]');
        content = content.replace(/\bbg-(gray|slate|zinc|neutral|stone)-(200|300)\b/g, 'bg-slate-800');
        
        // Gray/Neutral Borders
        content = content.replace(/\bborder-(gray|slate|zinc|neutral|stone)-(100|200)\b/g, 'border-[var(--border-light)]');
        content = content.replace(/\bborder-(gray|slate|zinc|neutral|stone)-(300)\b/g, 'border-[var(--border-medium)]');
        content = content.replace(/\bborder-(gray|slate|zinc|neutral|stone)-(400|500)\b/g, 'border-slate-700');
        
        // Translucent Colored Backgrounds & Borders (replacing light mode colored BG)
        content = content.replace(/\bbg-(blue|emerald|green|red|rose|amber|purple|yellow|indigo)-(50|100)\b/g, 'bg-$1-500/10 border-$1-500/20');
        
        // Text Colors
        // Fix colored texts to readable variants on dark mode
        content = content.replace(/\btext-(blue|emerald|green|red|rose|amber|purple|yellow|indigo)-(600|700|800)\b/g, 'text-$1-400');
        
        content = content.replace(/\btext-black\b/g, 'text-[var(--text-primary)]');
        content = content.replace(/\btext-(gray|slate|zinc|neutral|stone)-(800|900|950)\b/g, 'text-[var(--text-primary)]');
        content = content.replace(/\btext-(gray|slate|zinc|neutral|stone)-(500|600|700)\b/g, 'text-[var(--text-secondary)]');
        content = content.replace(/\btext-(gray|slate|zinc|neutral|stone)-(400)\b/g, 'text-slate-400');

        // Admin-specific to generic alias changes
        content = content.replace(/\badmin-card\b/g, 'glass-card');
        content = content.replace(/\badmin-input\b/g, 'arra-input');
        content = content.replace(/\badmin-select\b/g, 'arra-select');
        content = content.replace(/\badmin-textarea\b/g, 'arra-textarea');

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
