const SB_URL = "https://llrapesaaoliyjrrrsjh.supabase.co";
const SB_KEY = "sb_publishable_414hQDyPBaFi0fnzmIKyZw_Iwa09Q0u";

async function run() {
  try {
    // Check sortir_vendors
    console.log("Fetching sortir_vendors...");
    const res = await fetch(`${SB_URL}/rest/v1/sortir_vendors?select=*`, {
      headers: {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
