// FFXI Item Flags Analysis
// Based on common FFXI private server conventions

const ITEM_FLAGS = {
    WALLHANGING: 0x0001,        // 1
    FLAG_02: 0x0002,             // 2
    RARE: 0x0004,                // 4 - Rare (only one per character)
    FLAG_08: 0x0008,             // 8
    INSCRIBABLE: 0x0010,         // 16
    NO_NPC_SALE: 0x0020,         // 32
    EXCLUSIVE: 0x0040,           // 64 - Ex (cannot trade)
    FLAG_80: 0x0080,             // 128
    FLAG_100: 0x0100,            // 256
    FLAG_200: 0x0200,            // 512
    FLAG_400: 0x0400,            // 1024
    FLAG_800: 0x0800,            // 2048
    NO_AUCTION: 0x1000,          // 4096
    SCROLL: 0x2000,              // 8192
    LINKSHELL: 0x4000,           // 16384
    CAN_USE: 0x8000,             // 32768
};

function analyzeFlags(flags) {
    const result = [];
    for (const [name, bit] of Object.entries(ITEM_FLAGS)) {
        if (flags & bit) {
            result.push(name);
        }
    }
    return result;
}

// Test cases
console.log('=== SPHARAI (Relic weapon) ===');
console.log('Flags: 63552');
console.log('Binary:', (63552).toString(2));
console.log('Active flags:', analyzeFlags(63552));
console.log('Is Rare:', !!(63552 & ITEM_FLAGS.RARE));
console.log('Is Ex:', !!(63552 & ITEM_FLAGS.EXCLUSIVE));

console.log('\n=== TIMEPIECE ===');
console.log('Flags: 61504');
console.log('Binary:', (61504).toString(2));
console.log('Active flags:', analyzeFlags(61504));
console.log('Is Rare:', !!(61504 & ITEM_FLAGS.RARE));
console.log('Is Ex:', !!(61504 & ITEM_FLAGS.EXCLUSIVE));

console.log('\n=== GOLD BED ===');
console.log('Flags: 28768');
console.log('Binary:', (28768).toString(2));
console.log('Active flags:', analyzeFlags(28768));
console.log('Is Rare:', !!(28768 & ITEM_FLAGS.RARE));
console.log('Is Ex:', !!(28768 & ITEM_FLAGS.EXCLUSIVE));

console.log('\n=== OPTICAL HAT (Known Rare/Ex) ===');
console.log('Flags: 63572');
console.log('Binary:', (63572).toString(2));
console.log('Active flags:', analyzeFlags(63572));
console.log('Is Rare:', !!(63572 & ITEM_FLAGS.RARE));
console.log('Is Ex:', !!(63572 & ITEM_FLAGS.EXCLUSIVE));

console.log('\n=== EMPEROR HAIRPIN (Known Rare) ===');
console.log('Flags: 34820');
console.log('Binary:', (34820).toString(2));
console.log('Active flags:', analyzeFlags(34820));
console.log('Is Rare:', !!(34820 & ITEM_FLAGS.RARE));
console.log('Is Ex:', !!(34820 & ITEM_FLAGS.EXCLUSIVE));

console.log('\n=== KRAKEN CLUB (Known Rare) ===');
console.log('Flags: 34816');
console.log('Binary:', (34816).toString(2));
console.log('Active flags:', analyzeFlags(34816));
console.log('Is Rare:', !!(34816 & ITEM_FLAGS.RARE));
console.log('Is Ex:', !!(34816 & ITEM_FLAGS.EXCLUSIVE));

console.log('\n=== BRONZE SWORD (Normal) ===');
console.log('Flags: 2084');
console.log('Binary:', (2084).toString(2));
console.log('Active flags:', analyzeFlags(2084));
console.log('Is Rare:', !!(2084 & ITEM_FLAGS.RARE));
console.log('Is Ex:', !!(2084 & ITEM_FLAGS.EXCLUSIVE));

console.log('\n=== FLAG CONSTANTS ===');
console.log('RARE flag value:', ITEM_FLAGS.RARE);
console.log('EXCLUSIVE flag value:', ITEM_FLAGS.EXCLUSIVE);
