const fs = require('fs');

let html = fs.readFileSync('owner.html', 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>') + 9;

const newScript = `<script>
    const SUPABASE_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
    const SB_HEADERS = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU2ODUsImV4cCI6MjA5NDc1MTY4NX0.rZPCxRQmjb3SyimYDokgm1R1u2QSqj3iBv0gGEEteII",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxscmFwZXNhYW9saXlqcnJyc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzU2ODUsImV4cCI6MjA5NDc1MTY4NX0.rZPCxRQmjb3SyimYDokgm1R1u2QSqj3iBv0gGEEteII",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };
    const GAS_SYNC_URL = "https://script.google.com/macros/s/AKfycbz5zBOJIO-b0MP-oqWhIUehqQaPbQt5pK9cMpTOYlj1pyT19LFD4VwynyJt_EAayBE/exec";

    let adminPassword = "";
    let allClients = [];

    async function doLogin() {
        const pass = document.getElementById('admin-pass-input').value.trim();
        if (!pass) return;
        const btn = document.getElementById('btn-login');

        btn.innerHTML = '<span class="spin"></span>';
        btn.disabled = true;

        try {
            const res = await fetch(\`\${SUPABASE_URL}/rest/v1/clients?username=eq.admin_global&password=eq.\${encodeURIComponent(pass)}&select=username\`, { headers: SB_HEADERS });
            const rows = await res.json();

            if (Array.isArray(rows) && rows.length > 0) {
                adminPassword = pass;
                document.getElementById('login-overlay').style.display = 'none';
                loadData();
            } else {
                showToast("�R Akses Ditolak: Password Salah!", "red");
            }
        } catch (e) {
            showToast("�R Error Koneksi: " + e.toString(), "red");
        }
        btn.innerHTML = 'Masuk Dashboard';
        btn.disabled = false;
    }

    async function loadData() {
        const tbody = document.getElementById('clients-tbody');
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:40px;"><span class="spin" style="border-color:var(--gold); width:24px; height:24px;"></span></td></tr>';
        try {
            const res = await fetch(\`\${SUPABASE_URL}/rest/v1/clients?username=neq.admin_global&order=created_at.desc\`, { headers: SB_HEADERS });
            if (!res.ok) throw new Error("Gagal mengambil data dari database");
            allClients = await res.json();
            updateStats(allClients);
            renderTable(allClients);
        } catch (e) {
            tbody.innerHTML = \`<tr><td colspan="13" style="text-align:center; color:var(--red); padding:40px;">�R Error: \${e.message}</td></tr>\`;
        }
    }

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderTable(clients) {
        const tbody = document.getElementById('clients-tbody');
        if (!clients || clients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align:center; padding:40px; color:var(--muted);">Tidak ada klien ditemukan.</td></tr>';
            return;
        }
        tbody.innerHTML = clients.map((c, i) => {
            const st = c.status || 'Inactive';
            let badgeCls = 'badge-inactive';
            if (st === 'Active') badgeCls = 'badge-active';
            else if (st === 'PendingActivation') badgeCls = 'badge-pending';

            const rawDate = c.created_at ? new Date(c.created_at) : null;
            const dateStr = rawDate ? rawDate.toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'}) : '-';

            const ssIdHtml = c.ssid ? \`<a href="https://docs.google.com/spreadsheets/d/\${esc(c.ssid)}/edit" target="_blank" style="color:var(--gold); text-decoration:none;">�x— Buka Sheet</a>\` : \`<span style="color:var(--muted)">Belum Dibuat</span>\`;

            return \`<tr id="row-\${i}" data-username="\${esc(c.username)}">
                <td style="color:var(--muted)">\${i + 1}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.client_name)}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.subdomain)}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.package)}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.wedding_date)}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.category)}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.whatsapp)}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.email)}</td>
                <td contenteditable="true" oninput="markDirty(\${i})">\${esc(c.password)}</td>
                <td style="cursor:pointer;" onclick="toggleStatus(\${i})">
                    <span id="badge-\${i}" class="badge \${badgeCls}" data-status="\${st}">\${st}</span>
                </td>
                <td>\${ssIdHtml}</td>
                <td style="color:var(--muted); font-size:11px;">\${dateStr}</td>
                <td><button class="save-row-btn" onclick="saveRow(\${i})">�x� Simpan</button></td>
            </tr>\`;
        }).join('');
    }

    function markDirty(i) { document.getElementById('row-' + i).classList.add('dirty'); }

    function toggleStatus(i) {
        const badge = document.getElementById('badge-' + i);
        let current = badge.getAttribute('data-status');
        let next = 'Active';
        if (current === 'Active') next = 'PendingActivation';
        else if (current === 'PendingActivation') next = 'Inactive';
        badge.setAttribute('data-status', next);
        badge.innerText = next;
        badge.className = 'badge';
        if (next === 'Active') badge.classList.add('badge-active');
        else if (next === 'PendingActivation') badge.classList.add('badge-pending');
        else badge.classList.add('badge-inactive');
        markDirty(i);
    }

    async function saveRow(i) {
        const row = document.getElementById('row-' + i);
        const cells = row.querySelectorAll('td[contenteditable="true"]');
        const username = row.getAttribute('data-username');
        const badge = document.getElementById('badge-' + i);

        const payload = {
            client_name: cells[0].innerText.trim(),
            subdomain: cells[1].innerText.trim(),
            package: cells[2].innerText.trim(),
            wedding_date: cells[3].innerText.trim(),
            category: cells[4].innerText.trim(),
            whatsapp: cells[5].innerText.trim(),
            email: cells[6].innerText.trim(),
            password: cells[7].innerText.trim(),
            status: badge.getAttribute('data-status')
        };

        const btn = row.querySelector('.save-row-btn');
        btn.innerText = '⏳...'; btn.disabled = true;

        try {
            const res = await fetch(\`\${SUPABASE_URL}/rest/v1/clients?username=eq.\${encodeURIComponent(username)}\`, {
                method: "PATCH", headers: SB_HEADERS, body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Gagal update di Supabase");
            const updatedData = await res.json();
            if (updatedData && updatedData.length > 0) {
                const freshClient = updatedData[0];
                const targetIdx = allClients.findIndex(c => c.username === username);
                if (targetIdx !== -1) allClients[targetIdx] = freshClient;
                row.setAttribute('data-username', freshClient.username);
            }
            row.classList.remove('dirty');
            showToast("�S& Tersimpan di Supabase! Sync ke Spreadsheet berjalan.", "green");
            triggerGasSyncBackground(username, payload);
        } catch (e) {
            showToast("�R Error: " + e.message, "red");
        }
        btn.innerText = '�x� Simpan'; btn.disabled = false;
    }

    function triggerGasSyncBackground(username, payload) {
        fetch(GAS_SYNC_URL, {
            method: "POST", mode: "no-cors",
            body: JSON.stringify({ action: "syncFromSupabase", username, data: payload })
        }).catch(() => {});
    }

    async function triggerGasSync() {
        showToast("⏳ Meminta sinkronisasi massal Supabase -> Spreadsheet...", "gold");
        try {
            fetch(GAS_SYNC_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: "syncAllClients" }) });
            setTimeout(() => showToast("�S& Permintaan sync dikirim ke GAS!", "green"), 1000);
        } catch (e) {
            showToast("�R Gagal kirim sync: " + e.message, "red");
        }
    }

    function updateStats(clients) {
        document.getElementById('stat-total').innerText = clients.length;
        document.getElementById('stat-active').innerText = clients.filter(c => c.status === 'Active').length;
        document.getElementById('stat-pending').innerText = clients.filter(c => c.status === 'PendingActivation').length;
        document.getElementById('stat-inactive').innerText = clients.filter(c => c.status !== 'Active' && c.status !== 'PendingActivation').length;
    }

    function filterTable() {
        const q = document.getElementById('search-input').value.toLowerCase();
        const status = document.getElementById('filter-status').value;
        const cat = document.getElementById('filter-category').value;
        const filtered = allClients.filter(c => {
            const matchQ = !q || (c.client_name || '').toLowerCase().includes(q) || (c.subdomain || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.whatsapp || '').toLowerCase().includes(q);
            const matchStatus = !status || c.status === status;
            const matchCat = !cat || (c.category || '').toLowerCase() === cat;
            return matchQ && matchStatus && matchCat;
        });
        renderTable(filtered);
    }

    function showToast(msg, type = 'green') {
        const toast = document.getElementById('toast');
        const colors = { green: '#10B981', red: '#EF4444', gold: '#C8962E' };
        toast.innerText = msg; toast.style.borderColor = colors[type] || '#E07B7B';
        toast.style.display = 'block'; clearTimeout(toast._timer);
        toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }

    document.getElementById('admin-pass-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
</script>`;

fs.writeFileSync('owner.html', html.substring(0, scriptStart) + newScript + html.substring(scriptEnd));

let cb = fs.readFileSync('backend/CentralBackend.gs', 'utf8');
const syncFromSbCode = `
// --- SYNC DARI SUPABASE KE SPREADSHEET (BACKGROUND) ---
function handleSyncFromSupabase(data) {
  try {
    const ss = SpreadsheetApp.openById(MASTER_SS_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    const values = sheet.getDataRange().getValues();
    let rowIndex = -1;
    const targetSub = String(data.username || "").toLowerCase();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).toLowerCase() === targetSub) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return createResponse({ status: "error", message: "Client tidak ditemukan di Spreadsheet" });
    const c = data.data;
    const orig = values[rowIndex - 1];
    const newRow = [
      c.username !== undefined ? c.username : orig[0], 
      orig[1], // ssid jangan dioverwrite dari payload karena tidak editable
      c.password !== undefined ? c.password : orig[2],
      c.whatsapp !== undefined ? c.whatsapp : orig[3], 
      c.wedding_date !== undefined ? c.wedding_date : orig[4], 
      orig[5], // created_at
      c.email !== undefined ? c.email : orig[6], 
      c.status !== undefined ? c.status : orig[7], 
      c.category !== undefined ? c.category : orig[8],
      c.subdomain !== undefined ? c.subdomain : orig[9], 
      c.client_name !== undefined ? c.client_name : orig[10],
      c.package !== undefined ? c.package : (orig[11] || ""),
      orig[12] || "" // event date m
    ];
    sheet.getRange(rowIndex, 1, 1, 13).setValues([newRow]);
    return createResponse({ status: "success", message: "Data client disinkronkan ke Spreadsheet" });
  } catch (err) {
    return createResponse({ status: "error", message: "Gagal sync ke Spreadsheet: " + err.toString() });
  }
}
`;
if (!cb.includes('function handleSyncFromSupabase')) {
  cb += syncFromSbCode;
  fs.writeFileSync('backend/CentralBackend.gs', cb);
}

let ur = fs.readFileSync('backend/UnifiedRouter.gs', 'utf8');
if (!ur.includes("case 'syncFromSupabase':")) {
  ur = ur.replace(/case 'updateOwnerClient':/g, "case 'updateOwnerClient':\n      case 'syncFromSupabase':");
  fs.writeFileSync('backend/UnifiedRouter.gs', ur);
}
cb = fs.readFileSync('backend/CentralBackend.gs', 'utf8');
if (!cb.includes("case 'syncFromSupabase': return handleSyncFromSupabase(request);")) {
  cb = cb.replace(/case 'updateOwnerClient': return handleUpdateOwnerClient\(request\);/g, "case 'updateOwnerClient': return handleUpdateOwnerClient(request);\n    case 'syncFromSupabase': return handleSyncFromSupabase(request);");
  fs.writeFileSync('backend/CentralBackend.gs', cb);
}

console.log('Update selesai.');
