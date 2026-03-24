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

        // Gray/Slate text 600/700 -> var(--text-secondary)
        content = content.replace(/\btext-(gray|slate|zinc|stone|neutral)-(500|600|700)\b/g, 'text-[var(--text-secondary)]');
        
        // Dark blue/red/green text -> lighter variants
        content = content.replace(/\btext-blue-(600|700|800)\b/g, 'text-blue-400');
        content = content.replace(/\btext-red-(600|700|800)\b/g, 'text-red-400');
        content = content.replace(/\btext-green-(600|700|800)\b/g, 'text-green-400');
        content = content.replace(/\btext-emerald-(600|700|800)\b/g, 'text-emerald-400');
        content = content.replace(/\btext-indigo-(600|700|800)\b/g, 'text-indigo-400');
        content = content.replace(/\btext-purple-(600|700|800)\b/g, 'text-purple-400');
        content = content.replace(/\btext-amber-(600|700|800)\b/g, 'text-amber-400');

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            changedCount++;
            console.log(`Updated text readability: ${file}`);
        }
    } catch (e) {
        console.error(`Error processing file ${file}:`, e);
    }
});

console.log(`Successfully updated ${changedCount} files with unreadable text.`);
