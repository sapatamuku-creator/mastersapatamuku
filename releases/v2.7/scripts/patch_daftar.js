const fs = require('fs');

let content = fs.readFileSync('daftar.html', 'utf8');

// Patch 1: Add Radio Button and update label
const targetHTML = `            <!-- OTP Input Section (Hidden initially) -->
            <div id="otp-section" class="hidden mb-6 p-5 bg-[#FFF9F6] border border-[#F0E6DE] rounded-2xl">
                <label class="block text-sm font-bold text-center mb-3">Masukkan 6 Digit OTP WhatsApp</label>`;
const replacementHTML = `            <!-- Pemilihan Metode OTP -->
            <div class="form-group mb-6">
                <label class="block text-sm font-bold mb-2">Kirim Kode OTP via:</label>
                <div class="flex gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="otp_channel" value="wa" class="w-4 h-4 text-[#E07B7B]" checked>
                        <span class="text-sm font-bold text-gray-700">WhatsApp</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="otp_channel" value="email" class="w-4 h-4 text-[#E07B7B]">
                        <span class="text-sm font-bold text-gray-700">Email</span>
                    </label>
                </div>
            </div>

            <!-- OTP Input Section (Hidden initially) -->
            <div id="otp-section" class="hidden mb-6 p-5 bg-[#FFF9F6] border border-[#F0E6DE] rounded-2xl">
                <label id="lbl_otp_input" class="block text-sm font-bold text-center mb-3">Masukkan 6 Digit OTP</label>`;

if(content.includes(targetHTML)) {
    content = content.replace(targetHTML, replacementHTML);
} else {
    console.log("Failed to find targetHTML");
}

// Patch 2: Update btn_send_otp text
const targetBtnHTML = `                <button onclick="triggerOTPSending()" id="btn_send_otp" class="sapatamu-btn flex-1">
                    Kirim OTP WA
                </button>`;
const replaceBtnHTML = `                <button onclick="triggerOTPSending()" id="btn_send_otp" class="sapatamu-btn flex-1">
                    Kirim Kode OTP
                </button>`;
if (content.includes(targetBtnHTML)) {
    content = content.replace(targetBtnHTML, replaceBtnHTML);
} else {
    console.log("Failed to find targetBtnHTML");
}

// Patch 3: Update triggerOTPSending JS
const targetJS = `    window.triggerOTPSending = async function() {
        const email = document.getElementById('reg_email').value.trim();
        const wa = document.getElementById('reg_wa').value.trim();
        const pass = document.getElementById('reg_pass').value.trim();
        const tnc = document.getElementById('reg_tnc').checked;

        if (!email || !wa || !pass) {
            return showSapaModal("Lengkapi Data", "Silakan lengkapi Email, WhatsApp, dan Password.", "⚠️ ");
        }
        if (!wa.startsWith("628")) {
            return showSapaModal("Format WA Salah", "Nomor WhatsApp wajib diawali format 628...", "⚠️ ");
        }
        if (!tnc) {
            return showSapaModal("Syarat & Ketentuan", "Harap setujui Syarat & Ketentuan dan Kebijakan Pembayaran sebelum melanjutkan.", "⚠️ ");
        }

        // Generate 6 digit OTP code
        generatedOTPCode = Math.floor(100000 + Math.random() * 900000).toString();

        setLoading('btn_send_otp', true);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                body: JSON.stringify({
                    action: "sendOTP",
                    whatsapp: wa,
                    otp: generatedOTPCode
                })
            });
            const res = await response.json();
            if (res.status === "success") {
                // Show OTP section
                document.getElementById('otp-section').classList.remove('hidden');
                document.getElementById('btn_send_otp').classList.add('hidden');
                document.getElementById('btn_verify_otp').classList.remove('hidden');

                startOTPTimer();
                showSapaModal("OTP Terkirim!", "Kode OTP 6-digit telah dikirimkan ke nomor WhatsApp Anda.", "📱");
            } else {
                showSapaModal("Gagal Kirim OTP", res.message, "❌");
            }
        } catch (e) {
                showSapaModal("Error OTP", "Gagal menghubungi server OTP: " + e.toString(), "⚠️ ");
        }
        setLoading('btn_send_otp', false);
    };`;
    
const replaceJS = `    window.triggerOTPSending = async function() {
        const email = document.getElementById('reg_email').value.trim();
        const wa = document.getElementById('reg_wa').value.trim();
        const pass = document.getElementById('reg_pass').value.trim();
        const tnc = document.getElementById('reg_tnc').checked;
        const channelRadio = document.querySelector('input[name="otp_channel"]:checked');
        const channel = channelRadio ? channelRadio.value : 'wa';

        if (!email || !wa || !pass) {
            return showSapaModal("Lengkapi Data", "Silakan lengkapi Email, WhatsApp, dan Password.", "⚠️ ");
        }
        if (!wa.startsWith("628")) {
            return showSapaModal("Format WA Salah", "Nomor WhatsApp wajib diawali format 628...", "⚠️ ");
        }
        if (!tnc) {
            return showSapaModal("Syarat & Ketentuan", "Harap setujui Syarat & Ketentuan dan Kebijakan Pembayaran sebelum melanjutkan.", "⚠️ ");
        }

        // Generate 6 digit OTP code
        generatedOTPCode = Math.floor(100000 + Math.random() * 900000).toString();

        setLoading('btn_send_otp', true);
        try {
            const response = await fetch(SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                body: JSON.stringify({
                    action: "sendOTP",
                    whatsapp: wa,
                    email: email,
                    channel: channel,
                    otp: generatedOTPCode
                })
            });
            const res = await response.json();
            if (res.status === "success") {
                // Show OTP section
                document.getElementById('otp-section').classList.remove('hidden');
                document.getElementById('btn_send_otp').classList.add('hidden');
                document.getElementById('btn_verify_otp').classList.remove('hidden');
                
                // Update label based on channel
                const lbl = document.getElementById('lbl_otp_input');
                if(lbl) lbl.innerText = channel === 'wa' ? "Masukkan 6 Digit OTP WhatsApp" : "Masukkan 6 Digit OTP Email";

                startOTPTimer();
                const msgDesc = channel === 'wa' ? "Kode OTP 6-digit telah dikirimkan ke nomor WhatsApp Anda." : "Kode OTP 6-digit telah dikirimkan ke Email Anda (cek inbox/spam).";
                showSapaModal("OTP Terkirim!", msgDesc, channel === 'wa' ? "📱" : "✉️");
            } else {
                showSapaModal("Gagal Kirim OTP", res.message, "❌");
            }
        } catch (e) {
                showSapaModal("Error OTP", "Gagal menghubungi server OTP: " + e.toString(), "⚠️ ");
        }
        setLoading('btn_send_otp', false);
    };`;

if (content.includes(targetJS)) {
    content = content.replace(targetJS, replaceJS);
} else {
    console.log("Failed to find targetJS");
}

fs.writeFileSync('daftar.html', content, 'utf8');
console.log('Success');
