"""
sortir_bridge.py — SapaTamu Local Culling Bridge (100% Pure Local LAN Wi-Fi)
PC = Gudang file & server lokal (0.0.0.0:8787)
HP = Remote Pinterest Culling Selector (http://[LAN_IP]:8787/culling)
100% Bebas Supabase, Bebas Internet, Bebas Kuota — File asli tetap di PC.
"""
from fastapi import FastAPI, Query, Body, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os, shutil, mimetypes, hashlib, time, socket, json, sys, webbrowser

# ── CONFIG ──
BASE_PORT = 8787
THUMB_DIR = Path(os.getenv("SORTIR_THUMB_DIR", str(Path.home() / ".sortir_thumbs")))
THUMB_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="SapaTamu Local Culling Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

LAN_IP = get_lan_ip()

# ── STATE ──
bridge_state = {
    "pc_name": socket.gethostname(),
    "folder": None,
    "selected_files": [],
    "last_log": "Bridge siap. Silakan pilih folder foto di PC."
}

CONFIG_FILE = Path("sortir_bridge_config.json")
if CONFIG_FILE.exists():
    try:
        c = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        bridge_state["folder"] = c.get("folder")
        bridge_state["pc_name"] = c.get("pc_name", bridge_state["pc_name"])
    except: pass

RAW_EXTS = {".arw", ".cr2", ".cr3", ".nef", ".dng", ".raf", ".rw2", ".orf", ".raw", ".tiff", ".tif"}
IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

def get_folder_files(folder_path):
    if not folder_path or not Path(folder_path).exists():
        return [], 0
    p = Path(folder_path)
    image_files = []
    # Rekursif rglob untuk mendeteksi seluruh sub-folder (parent/child)
    for f in sorted(p.rglob("*")):
        if f.is_file() and f.suffix.lower() in IMG_EXTS and "Selected_by_Client" not in f.parts:
            try:
                stat = f.stat()
                rel = f.relative_to(p).as_posix()
                image_files.append({
                    "id": rel,
                    "name": f.name,
                    "rel_path": rel,
                    "size": stat.st_size,
                    "ext": f.suffix.lower()
                })
            except: pass
    return image_files, len(image_files)

# ── API ENDPOINTS ──

@app.get("/api/status")
def get_status():
    files, count = get_folder_files(bridge_state["folder"])
    return {
        "status": "ok",
        "ip": LAN_IP,
        "port": BASE_PORT,
        "pc_name": bridge_state["pc_name"],
        "folder": bridge_state["folder"],
        "count": count,
        "last_log": bridge_state["last_log"]
    }

@app.get("/api/browse-folder")
def browse_folder():
    """Buka dialog native Windows Folder Picker"""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        selected = filedialog.askdirectory(title="Pilih Folder Foto untuk Disortir")
        root.destroy()
        if selected:
            p_str = str(Path(selected))
            bridge_state["folder"] = p_str
            CONFIG_FILE.write_text(json.dumps({"folder": p_str, "pc_name": bridge_state["pc_name"]}), encoding="utf-8")
            files, count = get_folder_files(p_str)
            bridge_state["last_log"] = f"Folder diubah ke: {Path(selected).name} ({count} foto)"
            return {"status": "ok", "folder": p_str, "count": count, "name": Path(selected).name}
        return {"status": "cancelled", "folder": bridge_state["folder"]}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/set-folder")
def set_folder(path: str = Query(...)):
    p = Path(path)
    if not p.exists() or not p.is_dir():
        return JSONResponse({"error": "Folder tidak ditemukan di PC"}, status_code=404)
    p_str = str(p)
    bridge_state["folder"] = p_str
    CONFIG_FILE.write_text(json.dumps({"folder": p_str, "pc_name": bridge_state["pc_name"]}), encoding="utf-8")
    files, count = get_folder_files(p_str)
    bridge_state["last_log"] = f"Folder diset ke: {p.name} ({count} foto)"
    return {"status": "ok", "folder": p_str, "count": count, "name": p.name}

@app.get("/api/list")
def list_photos():
    if not bridge_state["folder"]:
        return {"total": 0, "files": [], "folder": "", "folder_name": ""}
    files, count = get_folder_files(bridge_state["folder"])
    return {
        "total": count,
        "files": files,
        "folder": bridge_state["folder"],
        "folder_name": Path(bridge_state["folder"]).name
    }

@app.get("/api/thumb")
def get_thumbnail(name: str = Query(...)):
    """Direct Stream File Asli secara Instan — Tanpa Decode & Tanpa Kompresi"""
    if not bridge_state["folder"]:
        return JSONResponse({"error": "Folder belum dipilih"}, status_code=400)
    root = Path(bridge_state["folder"])
    p = root / name
    if not p.exists():
        found = list(root.rglob(name))
        if found:
            p = found[0]
        else:
            return JSONResponse({"error": "File tidak ada"}, status_code=404)
    
    mime, _ = mimetypes.guess_type(str(p))
    return FileResponse(str(p), media_type=mime or "image/jpeg")

@app.get("/api/file")
def get_full_file(name: str = Query(...)):
    if not bridge_state["folder"]:
        return JSONResponse({"error": "Folder belum dipilih"}, status_code=400)
    root = Path(bridge_state["folder"])
    p = root / name
    if not p.exists():
        found = list(root.rglob(name))
        if found:
            p = found[0]
        else:
            return JSONResponse({"error": "File tidak ada"}, status_code=404)
    mime, _ = mimetypes.guess_type(str(p))
    return FileResponse(str(p), media_type=mime or "application/octet-stream")

@app.post("/api/copy")
def copy_selection(body: dict = Body(...)):
    """Menyalin foto JPG pilihan + file RAW pasangan ke folder Selected_by_Client dari semua subfolder"""
    if not bridge_state["folder"]:
        return JSONResponse({"error": "Folder belum dipilih di PC"}, status_code=400)
    
    files = body.get("files", [])
    if not files:
        return JSONResponse({"error": "Daftar foto pilihan kosong"}, status_code=400)
    
    src_dir = Path(bridge_state["folder"])
    dest_dir = src_dir / "Selected_by_Client"
    dest_dir.mkdir(parents=True, exist_ok=True)

    copied_jpg = 0
    copied_raw = 0
    all_files_in_src = [f for f in src_dir.rglob("*") if f.is_file() and "Selected_by_Client" not in f.parts]

    for filename in files:
        base_name = Path(filename).stem
        # 1. Salin file foto utama
        for f in all_files_in_src:
            if f.name == filename:
                try:
                    shutil.copy2(str(f), str(dest_dir / f.name))
                    copied_jpg += 1
                except: pass
            elif f.stem == base_name and f.suffix.lower() in RAW_EXTS:
                try:
                    shutil.copy2(str(f), str(dest_dir / f.name))
                    copied_raw += 1
                except: pass

    msg = f"Berhasil menyalin {copied_jpg} foto (+ {copied_raw} file RAW) ke folder Selected_by_Client"
    bridge_state["last_log"] = f"✅ {msg}"
    return {
        "status": "ok",
        "copied_jpg": copied_jpg,
        "copied_raw": copied_raw,
        "total_copied": copied_jpg + copied_raw,
        "dest": str(dest_dir),
        "message": msg
    }

# ── HTML VIEWS ──

@app.get("/", response_class=HTMLResponse)
def index_page(request: Request):
    user_agent = request.headers.get("user-agent", "").lower()
    is_mobile = any(m in user_agent for m in ["android", "iphone", "ipad", "mobile"])
    
    # Jika dibuka dari HP, langsung buka Culling View
    if is_mobile:
        return culling_view()
    
    # Jika dibuka dari PC, tampilkan Host Dashboard Controller
    return host_controller_view()

@app.get("/culling", response_class=HTMLResponse)
def culling_view():
    """Tampilan Galeri Pinterest Culling Resmi SapaTamu (Mobile/Tablet/Desktop 100% Local)"""
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>SapaTamu Local Culling — Pinterest Mode</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {{
            --bg: #F7F2EE;
            --card-bg: #FFFFFF;
            --text-main: #3D312A;
            --text-muted: #8C7E74;
            --gold: #C8962E;
            --gold-hover: #b08225;
            --rose: #E07B7B;
            --border: #EADBCE;
        }}
        * {{ -webkit-tap-highlight-color: transparent; box-sizing: border-box; }}
        body {{
            background-color: var(--bg);
            color: var(--text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0; padding: 0;
            padding-bottom: 90px;
        }}
        .grid-pinterest {{
            column-count: 2;
            column-gap: 12px;
            padding: 12px 16px;
        }}
        @media (min-width: 768px) {{
            .grid-pinterest {{ column-count: 3; column-gap: 16px; padding: 20px 24px; }}
        }}
        @media (min-width: 1024px) {{
            .grid-pinterest {{ column-count: 4; column-gap: 20px; padding: 24px 32px; }}
        }}
        .pin-card {{
            break-inside: avoid;
            margin-bottom: 12px;
            background: var(--card-bg);
            border-radius: 16px;
            overflow: hidden;
            position: relative;
            cursor: pointer;
            border: 2px solid transparent;
            box-shadow: 0 4px 14px rgba(61, 49, 42, 0.06);
            transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s, box-shadow 0.18s;
            user-select: none;
        }}
        .pin-card:active {{ transform: scale(0.97); }}
        .pin-card.selected {{
            border-color: var(--gold);
            box-shadow: 0 8px 24px rgba(200, 150, 46, 0.28);
        }}
        .pin-card img {{
            width: 100%;
            display: block;
            background: #EDE4DC;
            min-height: 140px;
            object-fit: cover;
        }}
        .pin-card .badge-check {{
            position: absolute;
            top: 10px;
            right: 10px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(255,255,255,0.85);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 800;
            color: #ccc;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }}
        .pin-card.selected .badge-check {{
            background: var(--gold);
            color: #FFFFFF;
            transform: scale(1.1);
        }}
        .pin-card .pin-name {{
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        .filter-pill {{
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            color: var(--text-muted);
            background: #EFE8E2;
            cursor: pointer;
            transition: all 0.15s ease;
        }}
        .filter-pill.active {{
            background: var(--gold);
            color: #FFFFFF;
            box-shadow: 0 4px 12px rgba(200, 150, 46, 0.25);
        }}
        .bottom-action-bar {{
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: rgba(255, 253, 251, 0.92);
            backdrop-filter: blur(16px);
            border-top: 1px solid var(--border);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 50;
        }}
        /* Lightbox Fullscreen */
        #lightbox {{
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(20, 16, 14, 0.95);
            backdrop-filter: blur(20px);
            z-index: 100;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }}
    </style>
</head>
<body>

    <!-- Sticky Header -->
    <header class="sticky top-0 z-40 bg-[#FFFDFB]/95 backdrop-blur-md border-b border-[#EADBCE] px-4 py-3 shadow-sm">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="text-xl">📂</span>
                <div>
                    <h1 id="folder-name-title" class="font-black text-sm text-[#3D312A]">Memuat Folder PC...</h1>
                    <p id="lan-status" class="text-[10px] text-[#8C7E74]">100% Local Wi-Fi LAN</p>
                </div>
            </div>
            <div class="bg-[#F7F2EE] border border-[#EADBCE] px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span class="text-xs font-bold text-[#8C7E74]">Terpilih:</span>
                <span id="selected-counter" class="text-xs font-black text-[#C8962E]">0 / 0</span>
            </div>
        </div>

        <!-- Filter & Search Bar -->
        <div class="mt-3 flex items-center gap-2">
            <div class="flex-1 relative">
                <input id="search-input" type="text" placeholder="Cari nama foto..." 
                       oninput="handleSearch(this.value)"
                       class="w-full bg-[#F7F2EE] border border-[#EADBCE] rounded-xl px-3 py-1.5 text-xs text-[#3D312A] focus:outline-none focus:border-[#C8962E]">
            </div>
            <div class="flex items-center gap-1">
                <button id="filter-all" class="filter-pill active" onclick="setFilter('all')">Semua</button>
                <button id="filter-selected" class="filter-pill" onclick="setFilter('selected')">Terpilih</button>
                <button id="filter-unselected" class="filter-pill" onclick="setFilter('unselected')">Belum</button>
            </div>
        </div>
    </header>

    <!-- Empty State -->
    <div id="empty-state" class="hidden text-center py-16 px-6">
        <div class="text-5xl mb-3">📷</div>
        <h3 class="font-bold text-base text-[#3D312A]">Belum Ada Foto</h3>
        <p class="text-xs text-[#8C7E74] mt-1">Pilih folder foto di PC Anda terlebih dahulu.</p>
    </div>

    <!-- Pinterest Grid Container -->
    <main id="gallery-grid" class="grid-pinterest"></main>

    <!-- Fixed Bottom Bar -->
    <div class="bottom-action-bar">
        <div>
            <p class="text-xs font-bold text-[#3D312A]"><span id="bottom-count">0</span> foto terpilih</p>
            <p class="text-[10px] text-[#8C7E74]">JPG & RAW tersalin ke PC</p>
        </div>
        <button onclick="submitSelectionToPC()" 
                class="bg-gradient-to-r from-[#C8962E] to-[#D8A742] text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md active:scale-95 transition-all">
            💾 Kirim Pilihan ke PC
        </button>
    </div>

    <!-- Lightbox Modal -->
    <div id="lightbox" onclick="closeLightbox()">
        <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10 text-white" onclick="event.stopPropagation()">
            <span id="lb-filename" class="text-xs font-mono bg-black/50 px-3 py-1.5 rounded-full">foto.jpg</span>
            <div class="flex items-center gap-2">
                <button id="lb-check-btn" onclick="toggleLightboxSelect()" class="bg-[#C8962E] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    ✓ Pilih Foto Ini
                </button>
                <button onclick="closeLightbox()" class="bg-white/20 text-white w-8 h-8 rounded-full font-bold">✕</button>
            </div>
        </div>
        <img id="lb-image" src="" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all" onclick="event.stopPropagation()">
    </div>

    <script>
        let allPhotos = [];
        let selections = new Set();
        let currentFilter = 'all';
        let searchQuery = '';
        let currentLbIndex = 0;

        async function loadPhotos() {{
            try {{
                const res = await fetch('/api/list');
                const data = await res.json();
                allPhotos = data.files || [];
                
                document.getElementById('folder-name-title').innerText = data.folder_name || 'Folder PC';
                document.getElementById('selected-counter').innerText = `${{selections.size}} / ${{allPhotos.length}}`;
                document.getElementById('bottom-count').innerText = selections.size;

                if(allPhotos.length === 0) {{
                    document.getElementById('empty-state').classList.remove('hidden');
                    document.getElementById('gallery-grid').innerHTML = '';
                }} else {{
                    document.getElementById('empty-state').classList.add('hidden');
                    renderGrid();
                }}
            }} catch(e) {{
                console.error('Gagal fetch /api/list:', e);
            }}
        }}

        function renderGrid() {{
            const grid = document.getElementById('gallery-grid');
            grid.innerHTML = '';

            let filtered = allPhotos.filter(f => {{
                const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
                const isSel = selections.has(f.name);
                if(currentFilter === 'selected') return matchesSearch && isSel;
                if(currentFilter === 'unselected') return matchesSearch && !isSel;
                return matchesSearch;
            }});

            filtered.forEach((f, idx) => {{
                const isSel = selections.has(f.name);
                const card = document.createElement('div');
                card.className = `pin-card ${{isSel ? 'selected' : ''}}`;
                card.id = `card-${{idx}}`;
                
                card.innerHTML = `
                    <img src="/api/thumb?name=${{encodeURIComponent(f.name)}}" 
                         loading="lazy" 
                         alt="${{f.name}}">
                    <div class="badge-check">✓</div>
                    <div class="pin-name">${{f.name}}</div>
                `;

                // Tap = toggle checklist | Hold / Double tap = lightbox
                let touchStart = 0;
                card.addEventListener('touchstart', () => {{ touchStart = Date.now(); }});
                card.addEventListener('touchend', (e) => {{
                    if(Date.now() - touchStart > 350) {{
                        openLightbox(f, idx);
                    }} else {{
                        toggleSelection(f.name);
                    }}
                }});
                card.addEventListener('click', (e) => {{
                    if(window.innerWidth >= 768) {{
                        toggleSelection(f.name);
                    }}
                }});
                card.addEventListener('contextmenu', (e) => {{
                    e.preventDefault();
                    openLightbox(f, idx);
                }});

                grid.appendChild(card);
            }});
        }}

        function toggleSelection(name) {{
            if(selections.has(name)) {{
                selections.delete(name);
            }} else {{
                selections.add(name);
            }}
            updateCounters();
            renderGrid();
        }}

        function updateCounters() {{
            document.getElementById('selected-counter').innerText = `${{selections.size}} / ${{allPhotos.length}}`;
            document.getElementById('bottom-count').innerText = selections.size;
        }}

        function setFilter(type) {{
            currentFilter = type;
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            document.getElementById(`filter-${{type}}`).classList.add('active');
            renderGrid();
        }}

        function handleSearch(val) {{
            searchQuery = val.trim();
            renderGrid();
        }}

        function openLightbox(file, idx) {{
            currentLbIndex = idx;
            document.getElementById('lb-filename').innerText = file.name;
            document.getElementById('lb-image').src = `/api/thumb?name=${{encodeURIComponent(file.name)}}`;
            document.getElementById('lightbox').style.display = 'flex';
            updateLightboxBtn(file.name);
        }}

        function closeLightbox() {{
            document.getElementById('lightbox').style.display = 'none';
        }}

        function toggleLightboxSelect() {{
            const f = allPhotos[currentLbIndex];
            if(f) {{
                toggleSelection(f.name);
                updateLightboxBtn(f.name);
            }}
        }}

        function updateLightboxBtn(name) {{
            const btn = document.getElementById('lb-check-btn');
            if(selections.has(name)) {{
                btn.innerText = '✓ Terpilih';
                btn.className = 'bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full';
            }} else {{
                btn.innerText = '+ Pilih Foto';
                btn.className = 'bg-[#C8962E] text-white text-xs font-bold px-3 py-1.5 rounded-full';
            }}
        }}

        async function submitSelectionToPC() {{
            if(selections.size === 0) {{
                alert('Pilih minimal 1 foto terlebih dahulu.');
                return;
            }}
            if(!confirm(`Kirim ${{selections.size}} foto terpilih ke folder PC "Selected_by_Client"?`)) return;

            try {{
                const res = await fetch('/api/copy', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ files: Array.from(selections) }})
                }});
                const data = await res.json();
                if(data.status === 'ok') {{
                    alert(`✅ Sukses! ${{data.copied_jpg}} foto (+ ${{data.copied_raw}} file RAW) berhasil disalin ke folder Selected_by_Client di komputer Anda!`);
                }} else {{
                    alert('Gagal: ' + (data.error || 'Terjadi kesalahan'));
                }}
            }} catch(e) {{
                alert('Gagal menghubungi PC: ' + e.message);
            }}
        }}

        loadPhotos();
    </script>
</body>
</html>
"""

def host_controller_view():
    """Tampilan Host Controller di Layar PC (Fotografer Controller)"""
    files, count = get_folder_files(bridge_state["folder"])
    folder_display = Path(bridge_state["folder"]).name if bridge_state["folder"] else "Belum Ada Folder Dipilih"
    qr_link = f"http://{LAN_IP}:{BASE_PORT}/culling"
    qr_img = f"https://api.qrserver.com/v1/create-qr-code/?size=260x260&data={qr_link}"

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SapaTamu Local Culling — PC Host Controller</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {{
            --bg: #F7F2EE;
            --text-main: #3D312A;
            --gold: #C8962E;
            --border: #EADBCE;
        }}
        body {{ background: var(--bg); color: var(--text-main); font-family: system-ui, -apple-system, sans-serif; }}
    </style>
</head>
<body class="p-6 max-w-2xl mx-auto min-h-screen flex flex-col justify-between">
    <div>
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[#EADBCE] pb-4 mb-6">
            <div class="flex items-center gap-3">
                <span class="text-3xl">📡</span>
                <div>
                    <h1 class="text-xl font-black text-[#3D312A]">SapaTamu Local Culling Bridge</h1>
                    <p class="text-xs text-[#8C7E74]">100% Pure Local LAN Wi-Fi — Bebas Supabase & Bebas Kuota</p>
                </div>
            </div>
            <span class="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> LAN Aktif
            </span>
        </div>

        <!-- 1. Folder Selector Card -->
        <div class="bg-white rounded-2xl p-5 border border-[#EADBCE] shadow-sm mb-6">
            <h2 class="font-bold text-sm text-[#3D312A] mb-1">1. Folder Foto Sumber di PC</h2>
            <p class="text-xs text-[#8C7E74] mb-3">Pilih folder berisi foto JPG / RAW di harddisk komputer Anda.</p>
            
            <div class="flex items-center gap-3 bg-[#F7F2EE] p-3 rounded-xl border border-[#EADBCE]">
                <span class="text-2xl">📁</span>
                <div class="flex-1 overflow-hidden">
                    <p id="folder-label" class="text-xs font-mono font-bold text-[#3D312A] truncate">{bridge_state['folder'] or 'Belum ada folder dipilih'}</p>
                    <p id="folder-sub" class="text-[11px] text-[#8C7E74]">{count} foto terdeteksi</p>
                </div>
                <button onclick="browseFolderNative()" 
                        class="bg-[#3D312A] text-white hover:bg-black px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap">
                    📁 Pilih Folder di PC
                </button>
            </div>
        </div>

        <!-- 2. QR Code Card -->
        <div class="bg-white rounded-2xl p-6 border border-[#EADBCE] shadow-sm text-center mb-6">
            <h2 class="font-black text-base text-[#3D312A] mb-1">2. Scan QR dari HP Anda</h2>
            <p class="text-xs text-[#8C7E74] mb-4">Pastikan HP dan PC berada pada jaringan <b>Wi-Fi yang sama</b>.</p>
            
            <div class="inline-block p-4 bg-white rounded-2xl border border-[#EADBCE] shadow-md">
                <img src="{qr_img}" class="rounded-xl mx-auto" width="240" height="240" alt="QR Code">
            </div>
            
            <p class="text-xs font-mono font-bold text-[#C8962E] mt-3">{qr_link}</p>
            <p class="text-[11px] text-[#8C7E74] mt-1">Layar HP langsung membuka galeri Pinterest culling untuk checklist foto.</p>
        </div>

        <!-- Status Log Card -->
        <div class="bg-[#EDE5DD] rounded-2xl p-4 border border-[#EADBCE] text-xs font-mono text-[#5C4D42]">
            <p class="font-bold mb-1">📋 Aktivitas Terakhir:</p>
            <p id="log-text">{bridge_state['last_log']}</p>
        </div>
    </div>

    <footer class="text-center text-[11px] text-[#8C7E74] mt-8 pt-4 border-t border-[#EADBCE]">
        SapaTamu OS v3.4 • Local Culling Bridge • IP: <b>{LAN_IP}:{BASE_PORT}</b>
    </footer>

    <script>
        async function browseFolderNative() {{
            const btn = event.target;
            btn.innerText = '⏳ Membuka...';
            try {{
                const res = await fetch('/api/browse-folder');
                const data = await res.json();
                if(data.status === 'ok') {{
                    location.reload();
                }}
            }} catch(e) {{
                alert('Gagal memilih folder: ' + e.message);
            }} finally {{
                btn.innerText = '📁 Pilih Folder di PC';
            }}
        }}

        // Poll status update
        setInterval(async () => {{
            try {{
                const res = await fetch('/api/status');
                const data = await res.json();
                document.getElementById('log-text').innerText = data.last_log;
            }} catch(e) {{}}
        }}, 2000);
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("  SAPATAMU LOCAL CULLING BRIDGE (100% PURE LOCAL LAN)")
    print("=" * 60)
    print(f"  PC Host Controller : http://localhost:{BASE_PORT}")
    print(f"  HP Remote Culling  : http://{LAN_IP}:{BASE_PORT}/culling")
    print("=" * 60)
    
    # Auto buka browser PC saat dijalankan
    def open_browser():
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{BASE_PORT}")
    
    import threading
    threading.Thread(target=open_browser, daemon=True).start()
    
    uvicorn.run(app, host="0.0.0.0", port=BASE_PORT)
