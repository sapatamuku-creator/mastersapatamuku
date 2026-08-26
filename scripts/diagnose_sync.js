const SB_URL = 'https://llrapesaaoliyjrrrsjh.supabase.co';
const SB_KEY = 'sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec';
const SS_ID = '10EDJZTur2oyeyHfFQfLQ5ovX713H3jbQ2NBz2bAZoTY';

async function fetchAllTamuSupabase(ssId) {
    let all = [];
    let offset = 0;
    const limit = 1000;
    while (true) {
        const url = `${SB_URL}/rest/v1/tamu?ssid=eq.${ssId}&select=*&order=row.desc&limit=${limit}&offset=${offset}`;
        const res = await fetch(url, {
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${SB_KEY}`
            }
        });
        const chunk = await res.json();
        if (!Array.isArray(chunk) || chunk.length === 0) break;
        all.push(...chunk);
        if (chunk.length < limit) break;
        offset += limit;
    }
    return all;
}

async function fetchSheetData(ssId) {
    const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'getMasterData',
            ssId: ssId
        })
    });
    const json = await res.json();
    return json.guestList || json.data?.guestList || [];
}

async function run() {
    console.log('Fetching from Supabase...');
    const sbGuests = await fetchAllTamuSupabase(SS_ID);
    console.log(`Supabase Total: ${sbGuests.length} records`);

    console.log('Fetching from Spreadsheet via GAS...');
    const sheetGuests = await fetchSheetData(SS_ID);
    console.log(`Spreadsheet Total: ${sheetGuests.length} records`);

    const sbCodes = new Map();
    sbGuests.forEach(g => {
        const code = String(g.kode || '').trim();
        if (code) sbCodes.set(code, g);
    });

    const sheetCodes = new Map();
    sheetGuests.forEach(g => {
        const code = String(g.kode || '').trim();
        if (code) sheetCodes.set(code, g);
    });

    console.log(`Supabase Unique Codes: ${sbCodes.size}`);
    console.log(`Spreadsheet Unique Codes: ${sheetCodes.size}`);

    // In Sheet but NOT in SB
    const missingInSb = [];
    sheetCodes.forEach((val, code) => {
        if (!sbCodes.has(code)) {
            missingInSb.push({ kode: code, nama: val.nama, kategori: val.kategori, wa: val.whatsapp });
        }
    });

    // In SB but NOT in Sheet
    const missingInSheet = [];
    sbCodes.forEach((val, code) => {
        if (!sheetCodes.has(code)) {
            missingInSheet.push({ kode: code, nama: val.nama, kategori: val.kategori, wa: val.whatsapp });
        }
    });

    console.log('\n=== SUMMARY ===');
    console.log(`Missing in Supabase (${missingInSb.length} guests):`);
    console.log(JSON.stringify(missingInSb.slice(0, 10), null, 2));
    if (missingInSb.length > 10) console.log(`... and ${missingInSb.length - 10} more`);

    console.log(`\nMissing in Sheet (${missingInSheet.length} guests):`);
    console.log(JSON.stringify(missingInSheet.slice(0, 10), null, 2));
    if (missingInSheet.length > 10) console.log(`... and ${missingInSheet.length - 10} more`);

    // Check duplicates in Sheet
    const sheetCodeCounts = {};
    sheetGuests.forEach(g => {
        const code = String(g.kode || '').trim();
        sheetCodeCounts[code] = (sheetCodeCounts[code] || 0) + 1;
    });
    const sheetDups = Object.entries(sheetCodeCounts).filter(([k, v]) => v > 1);
    console.log(`\nSpreadsheet Duplicate Codes (${sheetDups.length}):`, sheetDups);

    // Check duplicates in SB
    const sbCodeCounts = {};
    sbGuests.forEach(g => {
        const code = String(g.kode || '').trim();
        sbCodeCounts[code] = (sbCodeCounts[code] || 0) + 1;
    });
    const sbDups = Object.entries(sbCodeCounts).filter(([k, v]) => v > 1);
    console.log(`\nSupabase Duplicate Codes (${sbDups.length}):`, sbDups);

    // Check empty codes in Sheet
    const emptyInSheet = sheetGuests.filter(g => !String(g.kode || '').trim());
    console.log(`\nSpreadsheet Empty/No-Code Guests: ${emptyInSheet.length}`);
}

run().catch(console.error);
