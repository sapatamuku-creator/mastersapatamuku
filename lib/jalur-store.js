// [v3.0 T2.1] jalur-store — centralize localStorage keys, no route/backend change
// Keys lama: kiosk_jalur_id, checkin_jalur_id, onsite_jalur_id, kiosk_cam_on, checkin_cam_on, onsite_cam_on
// Keys baru: gb:jalur:kiosk, gb:jalur:checkin, gb:jalur:onsite, gb:cam:kiosk, etc — tetap baca fallback lama agar tidak reset user
const PREFIX = 'gb:';
const LEGACY_MAP = {
  'gb:jalur:kiosk': 'kiosk_jalur_id',
  'gb:jalur:checkin': 'checkin_jalur_id',
  'gb:jalur:onsite': 'onsite_jalur_id',
  'gb:cam:kiosk': 'kiosk_cam_on',
  'gb:cam:checkin': 'checkin_cam_on',
  'gb:cam:onsite': 'onsite_cam_on',
  'gb:quick:kiosk': 'quick_checkin_on',
  'gb:quick:checkin': 'quick_checkin_on',
  'gb:quick:onsite': 'quick_checkin_on',
};

export function getJalur(key, defVal){
  try{
    let v = localStorage.getItem(PREFIX+key) || localStorage.getItem(key);
    if(v==null && LEGACY_MAP[PREFIX+key]) v = localStorage.getItem(LEGACY_MAP[PREFIX+key]);
    return v==null ? defVal : v;
  }catch(e){ return defVal; }
}
export function setJalur(key, val){
  try{
    localStorage.setItem(PREFIX+key, val);
    // keep legacy for backward compat 1 cycle
    const leg = LEGACY_MAP[PREFIX+key];
    if(leg) localStorage.setItem(leg, val);
  }catch(e){}
}
export function getCamEnabled(page){
  const v = getJalur('cam:'+page, null);
  if(v==null) {
    // fallback legacy per page
    const leg = localStorage.getItem(page+'_cam_on') || localStorage.getItem('kiosk_cam_on') || localStorage.getItem('checkin_cam_on');
    return leg==='1';
  }
  return v==='1';
}
export function setCamEnabled(page, enabled){
  setJalur('cam:'+page, enabled?'1':'0');
}
