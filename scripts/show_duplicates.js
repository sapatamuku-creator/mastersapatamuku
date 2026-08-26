const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec';
const SS_ID = '10EDJZTur2oyeyHfFQfLQ5ovX713H3jbQ2NBz2bAZoTY';

async function checkDetails() {
    const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'getMasterData',
            ssId: SS_ID
        })
    });
    const json = await res.json();
    const guests = json.guestList || json.data?.guestList || [];
    
    console.log(`Total Sheet Guests: ${guests.length}`);
    const codeMap = {};
    guests.forEach((g, idx) => {
        const code = String(g.kode || '').trim();
        if (!codeMap[code]) codeMap[code] = [];
        codeMap[code].push({ row: idx + 8, nama: g.nama, wa: g.whatsapp, kategori: g.kategori });
    });

    const duplicates = Object.entries(codeMap).filter(([k, v]) => v.length > 1);
    console.log(`Total Duplicate Codes: ${duplicates.length}\n`);

    duplicates.forEach(([code, occurrences], i) => {
        console.log(`${i + 1}. Kode: ${code}`);
        occurrences.forEach(o => {
            console.log(`   - Baris ${o.row}: ${o.nama} (${o.kategori || 'Umum'}) [WA: ${o.wa || '-'}]`);
        });
    });
}

checkDetails().catch(console.error);
