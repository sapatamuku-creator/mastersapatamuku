/**
 * BACKEND SAPATAMU.KU - WELCOME SIGN WRAPPER (Unified Version)
 * This file delegates requests to the central getWelcomeData in Main.gs
 */

function handleWelcomeGet(e) {
  const ssId = e.parameter.ssId;
  const action_sub = e.parameter.action_sub || e.parameter.action;

  // Handler untuk request data (Fetch dari Frontend)
  if (action_sub === "getWelcomeData") {
    try {
      // getWelcomeData is defined in Main.gs
      const data = getWelcomeData(ssId); 
      return createResponse(data);
    } catch (err) {
      return createResponse({ status: "error", message: "WS Error: " + err.toString() });
    }
  }
  
  // Handler untuk memuat halaman HTML (jika dipanggil langsung)
  try {
    return HtmlService.createTemplateFromFile('Welcome')
        .evaluate()
        .setTitle('SapaTamu.ku - Welcome Sign')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return ContentService.createTextOutput("Error loading Welcome.html: " + err.toString());
  }
}
