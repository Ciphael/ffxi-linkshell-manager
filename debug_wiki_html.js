const axios = require('axios');
const cheerio = require('cheerio');

(async () => {
    const url = 'https://ffxiclopedia.fandom.com/wiki/Koenig_Handschuhs';
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    const $ = cheerio.load(response.data);
    const statisticsHeading = $('#Statistics').parent();

    const tableContainer = statisticsHeading.nextAll('div').filter((i, elem) => {
        const style = $(elem).attr('style') || '';
        return style.includes('display:table');
    }).first();

    const tableCells = tableContainer.find('div[style*="display:table-cell"]');
    let statsTableCell = tableCells.length > 1 ? tableCells.eq(1) : tableCells.first();

    if (statsTableCell.length > 0) {
        const childCount = statsTableCell.children('div').length;

        if (childCount === 1) {
            const nestedContainer = statsTableCell.children('div').first();
            const nestedChildCount = nestedContainer.children('div').length;

            if (nestedChildCount > 1) {
                statsTableCell = nestedContainer;
            }
        }

        console.log('=== Stats Table Cell Children ===\n');
        statsTableCell.children('div').each((i, childDiv) => {
            const divHtml = $(childDiv).html();
            const divText = $(childDiv).text();
            console.log(`Child ${i}:`);
            console.log(`  Text: ${divText}`);
            console.log(`  HTML: ${divHtml}`);
            console.log(`  Bold tags: ${(divHtml.match(/<b[^>]*>/gi) || []).length}`);
            console.log('');
        });
    }
})();
