const fs = require('fs');

const html = fs.readFileSync('C:\\src\\codex.oblitus\\location-editor-db.html', 'utf8');

// Find all script tags
const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
if (!scriptMatches) {
    console.log('No script tags found');
    process.exit(0);
}

let hasError = false;
scriptMatches.forEach((script, idx) => {
    const content = script.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');

    // Check for basic bracket matching
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;

    if (openBraces !== closeBraces) {
        console.log(`Script ${idx + 1}: Mismatched braces: ${openBraces} open, ${closeBraces} close (diff: ${openBraces - closeBraces})`);
        hasError = true;
    }
    if (openParens !== closeParens) {
        console.log(`Script ${idx + 1}: Mismatched parentheses: ${openParens} open, ${closeParens} close`);
        hasError = true;
    }
    if (openBrackets !== closeBrackets) {
        console.log(`Script ${idx + 1}: Mismatched brackets: ${openBrackets} open, ${closeBrackets} close`);
        hasError = true;
    }
});

if (!hasError) {
    console.log('✅ All script tags have matching brackets');
} else {
    process.exit(1);
}
