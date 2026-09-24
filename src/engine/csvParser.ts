import * as fs from 'fs';

export function parseCSV(filePath: string): any[] {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove BOM if present
    content = content.replace(/^\uFEFF/, '');
    
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const headers = lines[0].split(splitRegex).map(h => h.trim().replace(/^"|"$/g, ''));
    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.split(splitRegex);
        const obj: any = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] ? values[j].trim().replace(/^"|"$/g, '') : '';
        }
        results.push(obj);
    }
    return results;
}
