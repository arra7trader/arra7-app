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

        // Colored Borders Cleanup
        content = content.replace(/\bborder-(blue|emerald|green|red|rose|amber|purple|yellow|indigo)-(200|300|400)\b/g, 'border-$1-500/20');
        
        // Remove duplicate border classes like 'border border-blue-500/20 border-blue-500/20'
        content = content.replace(/\bbg-([a-z]+)-500\/10 border-\1-500\/20 hover:bg-\1-500\/10 border-\1-500\/20\b/g, 'bg-$1-500/10 hover:bg-$1-500/20 border-$1-500/20');

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            changedCount++;
            console.log(`Updated border colors: ${file}`);
        }
    } catch (e) {
        console.error(`Error processing file ${file}:`, e);
    }
});

console.log(`Successfully updated ${changedCount} files with residual borders.`);
