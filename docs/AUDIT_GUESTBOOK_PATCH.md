# AUDIT REPORT & TASK DIRECTIVE: Wishes & Prayers Module
**To:** Agent Manager
**From:** Antigravity (Auditor Agent)
**Project:** SapaTamu.Ku Master Repository
**Target File:** `D:\Google Antigrafity\mastersapatamuku\undangan.html`

## 🎯 OBJECTIVE FOR AGENT MANAGER
The client reported that the "Wishes & Prayers" (Guestbook) form on the live site (`sapatamu.id/undangan.html`) is failing silently and not saving messages. 
Your task is to implement the patch described below to migrate this form from a broken Firebase implementation to our standard Google Apps Script + Google Sheets architecture.

---

## 🔍 AUDIT FINDINGS (Root Cause Analysis)
1. **Broken Firebase Implementation:** The current `sendWish()` and `loadWishes()` functions in `undangan.html` (around line 804) are hardcoded to use Firebase Firestore.
2. **Missing Configuration:** The Firebase initialization requires `__firebase_config` to be injected, but this variable is completely absent from the global scope and `subdomain_resolver.js`. As a result, `window.db` is never initialized.
3. **Silent Failure:** Because `window.db` is undefined, clicking the submit button triggers the safety return (`if (!name || !text || !window.db) return;`), causing the system to do nothing.
4. **Missing Backend Logic:** The Google Apps Script backend (`CentralBackend.gs` / `Main.gs`) currently has no endpoints (`addWish`, `getWishes`) to process guestbook entries.

---

## 🛠️ REQUIRED ACTIONS (PATCH INSTRUCTIONS)

### Phase 1: Frontend Update (`undangan.html`)
Remove all Firebase imports and logic. Replace `sendWish()` and `loadWishes()` with standard `fetch` API calls that communicate with `window.SCRIPT_URL`.

**1. Replace `sendWish()`:**
```javascript
window.sendWish = async function () {
    const name = document.getElementById('wish-name').value;
    const text = document.getElementById('wish-text').value;
    if (!name || !text) return;

    const ssId = window.CURRENT_SS_ID || new URLSearchParams(window.location.search).get('ssId');
    if (!ssId) { alert("Sesi undangan tidak valid."); return; }

    const btn = document.getElementById('btn-wish');
    btn.disabled = true;
    btn.innerText = "Mengirim...";

    try {
        const formData = new URLSearchParams();
        formData.append("action", "addWish");
        formData.append("ssId", ssId);
        formData.append("name", name);
        formData.append("text", text);

        const response = await fetch(window.SCRIPT_URL, {
            method: "POST",
            body: formData
        });
        
        const result = await response.json();
        if(result.status === "success") {
            document.getElementById('wish-text').value = "";
            btn.innerText = "Terkirim!";
            if(typeof loadWishes === 'function') loadWishes(); // Refresh the list
        } else {
            throw new Error("Gagal menyimpan");
        }
    } catch (e) {
        btn.innerText = "Gagal";
    }
    
    setTimeout(() => { btn.innerText = "Kirim Ucapan"; btn.disabled = false; }, 2000);
};
```

**2. Replace `loadWishes()`:**
```javascript
window.loadWishes = async function () {
    const ssId = window.CURRENT_SS_ID || new URLSearchParams(window.location.search).get('ssId');
    if (!ssId) return;

    try {
        const response = await fetch(`${window.SCRIPT_URL}?action=getWishes&ssId=${ssId}`);
        const result = await response.json();
        
        if (result.status === "success" && Array.isArray(result.data)) {
             const container = document.getElementById('wishes-container');
             if (!container) return;
             
             container.innerHTML = ''; 
             
             // Optional: Add Admin Pin
             const adminDiv = document.createElement('div');
             adminDiv.className = "wish-card border-l-4 border-[#D4AF37]";
             adminDiv.innerHTML = `<p class="text-[11px] font-bold text-neutral-800 mb-1">Admin SapaTamu.Ku ✨</p>
                 <p class="text-[10px] text-neutral-500">Selamat menempuh hidup baru!</p>`;
             container.appendChild(adminDiv);

             // Render Wishes
             result.data.forEach(wish => {
                 const div = document.createElement('div');
                 div.className = "wish-card";
                 div.innerHTML = `<p class="text-[11px] font-bold text-neutral-800 mb-1">${wish.name || 'Tamu'}</p>
                     <p class="text-[10px] text-neutral-500">${wish.text}</p>`;
                 container.appendChild(div);
             });
        }
    } catch(e) { console.error("Gagal load wishes", e); }
};
```

### Phase 2: Backend Update (`backend/CentralBackend.gs` or `Main.gs`)
Create two new handlers in your Google Apps Script backend to process these requests.

1. **`addWish` (in doPost):**
   - Open the spreadsheet using `ssId`.
   - Check if a sheet named "Wishes" exists. If not, create it and set headers: `[Timestamp, Name, Text]`.
   - Append the new row with `[new Date(), name, text]`.
   - Return `{ status: "success" }`.

2. **`getWishes` (in doGet):**
   - Open the spreadsheet using `ssId`.
   - If the "Wishes" sheet exists, read all data.
   - Format the rows into an array of objects `[{ name: "...", text: "..." }]`.
   - Reverse the array so the newest wishes appear first.
   - Return `{ status: "success", data: [...] }`.

---
**Agent Manager:** Please execute this patch immediately to restore client functionality. Let the user know once the update has been pushed via `run_update.bat`.
