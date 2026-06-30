// config.js - การตั้งค่า Supabase และระบบจำลอง
export const config = {
  getSupabaseConfig() {
    const url = localStorage.getItem('supabase_url') || '';
    const anonKey = localStorage.getItem('supabase_anon_key') || '';
    return { url, anonKey };
  },

  setSupabaseConfig(url, anonKey) {
    if (url) localStorage.setItem('supabase_url', url.trim());
    else localStorage.removeItem('supabase_url');
    
    if (anonKey) localStorage.setItem('supabase_anon_key', anonKey.trim());
    else localStorage.removeItem('supabase_anon_key');
  },

  isSupabaseConfigured() {
    const { url, anonKey } = this.getSupabaseConfig();
    return url.length > 0 && anonKey.length > 0;
  },

  // เช็คว่ากำลังใช้งานในโหมด Demo หรือไม่ (ถ้าไม่ได้ตั้งค่า Supabase จะเป็นโหมด Demo อัตโนมัติ)
  isDemoMode() {
    return !this.isSupabaseConfigured();
  }
};
