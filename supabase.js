// supabase.js - จัดการการเชื่อมต่อฐานข้อมูล Supabase และรองรับการทำงานในโหมด Demo
import { config } from './config.js';
import { mockDB } from './mockData.js';

let supabaseClient = null;

// ฟังก์ชันสร้าง Supabase Client เมื่อต้องการใช้
export function initSupabase() {
  if (config.isSupabaseConfigured()) {
    try {
      const { url, anonKey } = config.getSupabaseConfig();
      // ดึงจาก window.supabase ที่โหลดมาจาก CDN
      if (window.supabase) {
        supabaseClient = window.supabase.createClient(url, anonKey);
        console.log('Supabase initialized successfully!');
        return true;
      } else {
        console.error('Supabase library not loaded yet.');
      }
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
    }
  }
  supabaseClient = null;
  return false;
}

// โหลดครั้งแรกตอนเริ่มแอป
initSupabase();

export const db = {
  // === จัดการเมนูอาหาร (Menu Items) ===
  async getMenuItems() {
    if (!supabaseClient) {
      return mockDB.getMenuItems();
    }
    try {
      const { data, error } = await supabaseClient
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase error, falling back to mock:', e);
      return mockDB.getMenuItems();
    }
  },

  async addMenuItem(itemData) {
    if (!supabaseClient) {
      return mockDB.addMenuItem(itemData);
    }
    try {
      const { data, error } = await supabaseClient
        .from('menu_items')
        .insert([{
          name: itemData.name,
          description: itemData.description,
          price: parseFloat(itemData.price),
          category: itemData.category,
          image_url: itemData.image_url,
          is_available: true
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase error, falling back to mock:', e);
      return mockDB.addMenuItem(itemData);
    }
  },

  async updateMenuItem(itemId, updatedData) {
    if (!supabaseClient) {
      return mockDB.updateMenuItem(itemId, updatedData);
    }
    try {
      const { data, error } = await supabaseClient
        .from('menu_items')
        .update({
          name: updatedData.name,
          description: updatedData.description,
          price: parseFloat(updatedData.price),
          category: updatedData.category,
          image_url: updatedData.image_url,
          is_available: updatedData.is_available
        })
        .eq('id', itemId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase error, falling back to mock:', e);
      return mockDB.updateMenuItem(itemId, updatedData);
    }
  },

  async deleteMenuItem(itemId) {
    if (!supabaseClient) {
      return mockDB.deleteMenuItem(itemId);
    }
    try {
      const { error } = await supabaseClient
        .from('menu_items')
        .delete()
        .eq('id', itemId);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('Supabase error, falling back to mock:', e);
      return mockDB.deleteMenuItem(itemId);
    }
  },

  // === จัดการคำสั่งซื้อ (Orders) ===
  async getOrders() {
    if (!supabaseClient) {
      // ดึงออเดอร์ใน Mock DB
      return mockDB.getOrders();
    }
    try {
      // ดึงข้อมูลออเดอร์พร้อมกับรายการอาหารในออเดอร์
      const { data: orders, error: orderError } = await supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (orderError) throw orderError;

      const { data: orderItems, error: itemsError } = await supabaseClient
        .from('order_items')
        .select('*, menu_items(name)');
      
      if (itemsError) throw itemsError;

      // จัดกลุ่มรายการสั่งซื้อเข้ากับตัวออเดอร์หลัก
      return orders.map(order => {
        const items = orderItems
          .filter(item => item.order_id === order.id)
          .map(item => ({
            id: item.id,
            menu_item_id: item.menu_item_id,
            name: item.menu_items ? item.menu_items.name : 'Unknown Item',
            quantity: item.quantity,
            price_at_purchase: item.price_at_purchase
          }));
        return { ...order, items };
      });
    } catch (e) {
      console.error('Supabase error, falling back to mock:', e);
      return mockDB.getOrders();
    }
  },

  async addOrder(orderData) {
    if (!supabaseClient) {
      return mockDB.addOrder(orderData);
    }
    try {
      // 1. บันทึกตาราง orders หลัก
      const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .insert([{
          customer_name: orderData.customer_name,
          table_number: orderData.table_number,
          notes: orderData.notes || '',
          total_amount: orderData.total_amount,
          status: 'pending'
        }])
        .select()
        .single();
      
      if (orderError) throw orderError;

      // 2. บันทึกตาราง order_items รายย่อย
      const itemsToInsert = orderData.cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }));

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // ดึงรายละเอียดออเดอร์พร้อมข้อมูลครบถ้วนเพื่อส่งคืน
      const menuItems = await this.getMenuItems();
      const itemsWithNames = orderData.cart.map((cartItem, idx) => {
        const menuItem = menuItems.find(m => m.id === cartItem.id);
        return {
          id: `oi_sup_${idx}`,
          menu_item_id: cartItem.id,
          name: menuItem ? menuItem.name : 'Unknown Item',
          quantity: cartItem.quantity,
          price_at_purchase: cartItem.price
        };
      });

      return {
        ...order,
        items: itemsWithNames
      };
    } catch (e) {
      console.error('Supabase error, falling back to mock:', e);
      return mockDB.addOrder(orderData);
    }
  },

  async updateOrderStatus(orderId, status) {
    if (!supabaseClient) {
      return mockDB.updateOrderStatus(orderId, status);
    }
    try {
      const { data, error } = await supabaseClient
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Supabase error, falling back to mock:', e);
      return mockDB.updateOrderStatus(orderId, status);
    }
  },

  // === ระบบยืนยันตัวตน (Authentication) ===
  async loginStaff(email, password) {
    if (!supabaseClient) {
      // โหมด Demo: ยอมรับ email/password ใดๆ แต่ถ้าเป็น admin/admin123 จะบันทึกเป็นชื่อ Admin
      if ((email === 'admin@restaurant.com' || email === 'admin') && password === 'admin123') {
        const mockUser = { email: 'admin@restaurant.com', role: 'manager' };
        localStorage.setItem('demo_session', JSON.stringify(mockUser));
        return { user: mockUser, error: null };
      }
      return { user: null, error: new Error('อีเมลหรือรหัสผ่าน Demo ไม่ถูกต้อง (แนะนำ: admin@restaurant.com / admin123)') };
    }
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (e) {
      return { user: null, error: e };
    }
  },

  async logoutStaff() {
    if (!supabaseClient) {
      localStorage.removeItem('demo_session');
      return { error: null };
    }
    try {
      const { error } = await supabaseClient.auth.signOut();
      return { error };
    } catch (e) {
      return { error: e };
    }
  },

  async getCurrentUser() {
    if (!supabaseClient) {
      const demoUser = localStorage.getItem('demo_session');
      return demoUser ? JSON.parse(demoUser) : null;
    }
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user;
    } catch (e) {
      return null;
    }
  },

  // === ระบบ Real-time ดึงข้อมูลออเดอร์เมื่อมีการเปลี่ยนแปลง ===
  subscribeToOrders(onUpdate) {
    if (!supabaseClient) {
      // โหมด Demo: ใช้การจำลองอัปเดตสถานะแบบ Local ในหน้าเว็บแทน
      return () => {}; 
    }
    
    // ติดตามความเปลี่ยนแปลงในตาราง orders
    const channel = supabaseClient
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
        // เมื่อข้อมูลออเดอร์หลักเปลี่ยน ให้เรียก callback เพื่อโหลดข้อมูลใหม่
        console.log('Realtime update detected:', payload);
        onUpdate(payload);
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }
};
