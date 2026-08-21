/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./kiosk.html",
    "./checkin.html",
    "./onsite.html",
    "./analytics.html",
    "./welcome.html",
  ],
  theme: { extend: {} },
  corePlugins: { preflight: false },
}
