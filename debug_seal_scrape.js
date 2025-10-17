const axios = require('axios');
const cheerio = require('cheerio');

// Test the name conversion function
function dbNameToWikiName(dbName) {
    let wikiName = dbName
        .replace(/^byakkos_/, 'byakko\'s_')
        .replace(/^genbus_/, 'genbu\'s_')
        .replace(/^kirins_/, 'kirin\'s_')
        .replace(/^seiryus_/, 'seiryu\'s_')
        .replace(/^suzakus_/, 'suzaku\'s_');

    const smallWords = ['of', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    wikiName = wikiName
        .split('_')
        .map((word, index) => {
            if (word.match(/^(i|ii|iii|iv|v|vi)$/i)) {
                return word.toUpperCase();
            }
            if (index === 0 || !smallWords.includes(word.toLowerCase())) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
            return word.toLowerCase();
        })
        .join('_');

    wikiName = wikiName.replace(/_Abjuration_/g, '_Abjuration:_');
    wikiName = wikiName.replace(/'/g, '%27');

    return wikiName;
}

(async () => {
    const testName = 'seal_of_byakko';
    const wikiName = dbNameToWikiName(testName);
    const url = `https://ffxiclopedia.fandom.com/wiki/${wikiName}`;
    console.log('DB name:', testName);
    console.log('Wiki name:', wikiName);
    console.log('URL:', url, '\n');

    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(response.data);
    const statisticsHeading = $('#Statistics').parent();

    console.log('Statistics heading found:', statisticsHeading.length > 0);

    if (statisticsHeading.length > 0) {
        const tableContainer = statisticsHeading.nextAll('div').filter((i, elem) => {
            const style = $(elem).attr('style') || '';
            return style.includes('display:table');
        }).first();

        console.log('Table container found:', tableContainer.length > 0);

        if (tableContainer.length > 0) {
            console.log('\nTable container HTML (first 500 chars):');
            console.log(tableContainer.html().substring(0, 500));

            const tableCells = tableContainer.find('div[style*="display:table-cell"]');
            console.log('\nTable cells found:', tableCells.length);

            if (tableCells.length > 0) {
                console.log('\nSecond cell content:');
                const statsTableCell = tableCells.length > 1 ? tableCells.eq(1) : tableCells.first();
                console.log(statsTableCell.text().substring(0, 200));
            }
        }
    }
})();
