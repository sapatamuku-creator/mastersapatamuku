"""
sortir_bridge.py — SapaTamu Sortir Nearby Bridge (tiruan C:/SapaTamu_AI/station_server.py)
PC jadi server LAN 0.0.0.0:8787, HP PWA sortir.html jadi remote selector.
File asli tetap di PC (D:\Foto), HP hanya kirim daftar nama file — copy tetap di PC.
Vendor isolation via Supabase sortir_bridges RLS (vendor_id = auth.uid()).
"""
from fastapi import FastAPI, Query, Body, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os, shutil, mimetypes, hashlib, time, socket, threading, urllib.request, json
from typing import List, Optional

# ── CONFIG ──
BASE_PORT = 8787
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://llrapesaaoliyjrrrsjh.supabase.co")
SUPABASE_ANON = os.getenv("SUPABASE_ANON", "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u")
THUMB_DIR = Path(os.getenv("SORTIR_THUMB_DIR", str(Path.home() / ".sortir_thumbs")))
THUMB_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="SapaTamu Sortir Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── STATE ──
bridge_state = {
    "vendor_id": None,
    "access_token": None,
    "pc_name": socket.gethostname(),
    "folder": None,
    "pair_token": hashlib.sha256(os.urandom(16)).hexdigest()[:16],
}

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

# ── SUPABASE PRESENCE (heartbeat 30s) ──
def supabase_upsert():
    if not bridge_state["vendor_id"] or not bridge_state["access_token"]:
        return
    try:
        import urllib.request, json
        # hitung file_count
        folder = bridge_state["folder"]
        count = 0
        if folder and Path(folder).exists():
            count = sum(1 for p in Path(folder).iterdir() if p.is_file() and p.suffix.lower() in (".jpg",".jpeg",".png",".nef",".cr2",".arw",".raf",".orf",".dng",".tiff"))
        data = {
            "vendor_id": bridge_state["vendor_id"],
            "pc_name": bridge_state["pc_name"],
            "ip": LAN_IP,
            "port": BASE_PORT,
            "folder_path": folder or "",
            "file_count": count,
            "pair_token": bridge_state["pair_token"],
            "last_seen": "now()",
        }
        # gunakan PostgREST upsert via ?on_conflict=vendor_id,ip
        # sederhana: delete old lalu insert (karena PK uuid, bukan vendor+ip)
        # cek existing
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/sortir_bridges?vendor_id=eq.{bridge_state['vendor_id']}&ip=eq.{LAN_IP}",
            headers={"apikey": SUPABASE_ANON, "Authorization": f"Bearer {bridge_state['access_token']}", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            existing = json.loads(r.read().decode())
        if existing:
            # PATCH
            bid = existing[0]["id"]
            body = json.dumps({"pc_name": data["pc_name"], "port": BASE_PORT, "folder_path": data["folder_path"], "file_count": count, "last_seen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}).encode()
            req2 = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/sortir_bridges?id=eq.{bid}", data=body, headers={"apikey": SUPABASE_ANON, "Authorization": f"Bearer {bridge_state['access_token']}", "Content-Type": "application/json", "Prefer": "return=minimal"}, method="PATCH")
            urllib.request.urlopen(req2, timeout=5).read()
        else:
            body = json.dumps({k:v for k,v in data.items() if k!="last_seen"}).encode()
            # last_seen default now() di DB, kirim tanpa
            req2 = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/sortir_bridges", data=body, headers={"apikey": SUPABASE_ANON, "Authorization": f"Bearer {bridge_state['access_token']}", "Content-Type": "application/json", "Prefer": "return=minimal"}, method="POST")
            urllib.request.urlopen(req2, timeout=5).read()
    except Exception as e:
        print(f"[presence] upsert fail: {e}")

def heartbeat_loop():
    while True:
        time.sleep(30)
        supabase_upsert()

threading.Thread(target=heartbeat_loop, daemon=True).start()

# ── ENDPOINTS ──
@app.get("/api/ping")
def ping():
    folder = bridge_state["folder"]
    count = 0
    if folder and Path(folder).exists():
        count = sum(1 for _ in Path(folder).iterdir() if _.is_file())
    return {"status":"ok","name":bridge_state["pc_name"],"ip":LAN_IP,"port":BASE_PORT,"folder":folder,"files":count,"pair_token":bridge_state["pair_token"]}

@app.post("/api/login")
def login(body: dict = Body(...)):
    """Vendor login dari GUI bridge — email/password → Supabase Auth"""
    email = body.get("email","").strip()
    password = body.get("password","")
    if not email or not password:
        return JSONResponse({"error":"email & password wajib"}, status_code=400)
    try:
        data = json.dumps({"email":email,"password":password}).encode()
        req = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", data=data, headers={"apikey": SUPABASE_ANON, "Content-Type":"application/json"})
        with urllib.request.urlopen(req, timeout=8) as r:
            j = json.loads(r.read().decode())
        bridge_state["access_token"] = j["access_token"]
        bridge_state["vendor_id"] = j["user"]["id"]
        # simpan ke file agar restart tidak login ulang
        Path("sortir_bridge_token.json").write_text(json.dumps({"vendor_id": bridge_state["vendor_id"], "access_token": j["access_token"], "refresh_token": j.get("refresh_token","")}), encoding="utf-8")
        supabase_upsert()
        return {"status":"ok","vendor_id":bridge_state["vendor_id"],"pc_name":bridge_state["pc_name"],"ip":LAN_IP}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=401)

@app.get("/api/list")
def list_files(path: str = Query(..., description="D:\\Foto atau D:\\Foto\\RAW"), limit: int = 200, offset: int = 0):
    # Security: hanya izinkan path di drive foto, blok C:\Windows etc
    p = Path(path)
    if not p.exists() or not p.is_dir():
        return JSONResponse({"error": f"Folder tidak ada: {path}"}, status_code=404)
    # blok path berbahaya
    blocked = ["C:\\Windows","C:\\Program Files","C:\\Users"]
    if any(str(p).lower().startswith(b.lower()) for b in blocked):
        return JSONResponse({"error":"Path diblokir"}, status_code=403)
    files = []
    for f in sorted(p.iterdir()):
        if f.is_file() and f.suffix.lower() in (".jpg",".jpeg",".png",".nef",".cr2",".arw",".raf",".orf",".dng",".tiff",".webp",".heic"):
            try:
                stat = f.stat()
                files.append({"name": f.name, "size": stat.st_size, "mtime": stat.st_mtime, "ext": f.suffix.lower()})
            except: pass
    total = len(files)
    return {"total": total, "files": files[offset:offset+limit], "folder": str(p), "ip": LAN_IP}

@app.get("/api/thumb")
def thumb(path: str = Query(...)):
    # path = D:\Foto\DSC_1002.JPG
    p = Path(path)
    if not p.exists():
        return JSONResponse({"error":"file not found"}, status_code=404)
    # cache key
    key = hashlib.md5(str(p).encode()).hexdigest() + ".jpg"
    cached = THUMB_DIR / key
    if cached.exists():
        return FileResponse(str(cached), media_type="image/jpeg")
    try:
        from PIL import Image
        im = Image.open(str(p))
        im.thumbnail((400,400))
        if im.mode in ("RGBA","LA"): im = im.convert("RGB")
        im.save(str(cached), "JPEG", quality=72)
        return FileResponse(str(cached), media_type="image/jpeg")
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/file")
def file(path: str = Query(...)):
    p = Path(path)
    if not p.exists():
        return JSONResponse({"error":"not found"}, status_code=404)
    mime,_ = mimetypes.guess_type(str(p))
    return FileResponse(str(p), media_type=mime or "application/octet-stream")

@app.post("/api/copy")
def copy_files(body: dict = Body(...)):
    """ HP kirim {src: "D:\\Foto", dest: "D:\\Foto\\Selected_by_Client", files: ["DSC_1002.NEF", "GSC8846"] } — wildcard *GSC8846* """
    src = Body(None)
    src_folder = body.get("src","")
    dest_folder = body.get("dest","")
    files: List[str] = body.get("files",[])
    if not src_folder or not dest_folder or not files:
        return JSONResponse({"error":"src, dest, files wajib"}, status_code=400)
    s = Path(src_folder)
    d = Path(dest_folder)
    try:
        d.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    copied = []
    for name in files:
        # wildcard: jika name tanpa extension, cari *name*.*
        if "." not in name:
            for f in s.glob(f"*{name}*"):
                if f.is_file():
                    try:
                        shutil.copy2(str(f), str(d / f.name))
                        copied.append(f.name)
                    except: pass
        else:
            f = s / name
            if f.exists():
                try:
                    shutil.copy2(str(f), str(d / f.name))
                    copied.append(f.name)
                except: pass
    return {"status":"ok","copied": copied, "count": len(copied), "dest": str(d)}

# ── GUI BRIDGE (mirip autorun_gui.py) ──
@app.get("/", response_class=HTMLResponse)
def index():
    # load saved token
    token_file = Path("sortir_bridge_token.json")
    logged = bridge_state["vendor_id"] is not None
    folder = bridge_state["folder"] or ""
    # LAN IP QR via api.qrserver.com (tanpa lib)
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=http://{LAN_IP}:{BASE_PORT}#{bridge_state['pair_token']}"
    return f"""
<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sortir Bridge — {bridge_state['pc_name']}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>body{{font-family:system-ui}}</style></head>
<body class="bg-[#FFF9F5] text-[#4A3F35] p-6 max-w-xl mx-auto">
<h1 class="text-2xl font-black">📡 Sortir Bridge <span class="text-[#C8962E]">{LAN_IP}:{BASE_PORT}</span></h1>
<p class="text-sm opacity-70">PC = gudang file, HP = remote selector. File tetap di PC.</p>

<div class="bg-white rounded-2xl p-4 mt-4 border">
<h2 class="font-bold">1. Login Vendor (isolasi — hanya vendor ini yang lihat)</h2>
{"<p class='text-green-600 text-sm'>✅ Login sebagai "+bridge_state["vendor_id"][:8]+"...</p>" if logged else '''
<form id="loginForm" class="flex gap-2 mt-2">
<input id="email" placeholder="email vendor" class="flex-1 border rounded-xl px-3 py-2 text-sm">
<input id="pass" type="password" placeholder="password" class="flex-1 border rounded-xl px-3 py-2 text-sm">
<button class="bg-[#C8962E] text-white px-4 py-2 rounded-xl text-sm font-bold">Login</button>
</form><p id="loginMsg" class="text-xs mt-1"></p>
<script>
document.getElementById('loginForm').onsubmit=async e=>{{e.preventDefault();
let r=await fetch('/api/login',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{email:email.value,password:pass.value}})}});
let j=await r.json(); document.getElementById('loginMsg').innerText=j.error||'Login ok, refresh...'; if(r.ok) location.reload();
}}
</script>'''}
</div>

<div class="bg-white rounded-2xl p-4 mt-4 border">
<h2 class="font-bold">2. Folder Foto Sumber</h2>
<div class="flex gap-2 mt-2">
<input id="folder" value="{folder}" placeholder="D:\\Foto\\RAW" class="flex-1 border rounded-xl px-3 py-2 text-sm font-mono">
<button onclick="saveFolder()" class="bg-[#4A3F35] text-white px-4 py-2 rounded-xl text-sm">Simpan</button>
</div>
<p id="folderMsg" class="text-xs mt-1"></p>
<script>
async function saveFolder(){{
let v=document.getElementById('folder').value;
let r=await fetch('/api/set-folder?path='+encodeURIComponent(v));
let j=await r.json(); document.getElementById('folderMsg').innerText=j.error||'Folder '+j.folder+' ('+j.files+' foto) - QR siap';
if(r.ok) location.reload();
}}
</script>
</div>

<div class="bg-white rounded-2xl p-4 mt-4 border text-center">
<h2 class="font-bold">3. Scan dari HP PWA Sortir</h2>
<p class="text-xs opacity-60">Buka di HP: <b>sortir.sapatamu.id/sortir</b> → Perangkat Terdekat → Scan QR</p>
<img src="{qr_url}" class="mx-auto mt-3 border rounded-xl" width="240" height="240">
<p class="text-[11px] font-mono mt-2">http://{LAN_IP}:{BASE_PORT}#{bridge_state['pair_token']}</p>
<p class="text-xs mt-1">Atau HP ketik manual IP di atas</p>
</div>

<p class="text-[11px] opacity-50 mt-4">Firewall: jalankan <b>Tambah_Firewall_SapaTamu.bat</b> atau <code>netsh advfirewall firewall add rule name=Sortir dir=in action=allow protocol=TCP localport={BASE_PORT}</code></p>
</body></html>
"""

@app.get("/api/set-folder")
def set_folder(path: str = Query(...)):
    p = Path(path)
    if not p.exists():
        return JSONResponse({"error": "Folder tidak ada"}, status_code=404)
    bridge_state["folder"] = str(p)
    # simpan config
    Path("sortir_bridge_config.json").write_text(json.dumps({"folder": str(p), "pc_name": bridge_state["pc_name"]}), encoding="utf-8")
    # update presence
    supabase_upsert()
    count = sum(1 for _ in p.iterdir() if _.is_file())
    return {"status":"ok","folder": str(p), "files": count}

# load config on startup
try:
    if Path("sortir_bridge_config.json").exists():
        c = json.loads(Path("sortir_bridge_config.json").read_text(encoding="utf-8"))
        bridge_state["folder"] = c.get("folder")
        bridge_state["pc_name"] = c.get("pc_name", bridge_state["pc_name"])
    if Path("sortir_bridge_token.json").exists():
        t = json.loads(Path("sortir_bridge_token.json").read_text(encoding="utf-8"))
        bridge_state["vendor_id"] = t.get("vendor_id")
        bridge_state["access_token"] = t.get("access_token")
        supabase_upsert()
except: pass

if __name__ == "__main__":
    import uvicorn
    print(f"Sortir Bridge running at http://{LAN_IP}:{BASE_PORT}  PC:{bridge_state['pc_name']}")
    uvicorn.run(app, host="0.0.0.0", port=BASE_PORT)
