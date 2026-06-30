// mockData.js - ข้อมูลตัวอย่างสำหรับรันในโหมด Demo/Offline
export const initialMenuItems = [
  {
    id: "m1",
    name: "ข้าวกะเพราหมูสับไข่ดาว",
    description: "ข้าวหอมมะลิราดผัดกะเพราหมูสับรสจัดจ้าน เสิร์ฟพร้อมไข่ดาวกรอบนอกไข่แดงเยิ้มๆ",
    price: 69.00,
    category: "main",
    image_url: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600&auto=format&fit=crop&q=80",
    is_available: true
  },
  {
    id: "m2",
    name: "ผัดไทยกุ้งสด",
    description: "เส้นจันท์เหนียวนุ่ม ผัดกับน้ำซอสมะขามเปียกสูตรโบราณเข้มข้น และกุ้งสดตัวโต",
    price: 89.00,
    category: "main",
    image_url: "https://images.unsplash.com/photo-1626804475315-86445582f3ef?w=600&auto=format&fit=crop&q=80",
    is_available: true
  },
  {
    id: "m3",
    name: "ปีกไก่ทอดน้ำปลา",
    description: "ปีกไก่หมักน้ำปลาดีและสมุนไพรทอดจนสีเหลืองทอง กรอบนอกนุ่มใน เสิร์ฟคู่กับน้ำจิ้มแจ่วรสเด็ด",
    price: 79.00,
    category: "appetizer",
    image_url: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80",
    is_available: true
  },
  {
    id: "m4",
    name: "ส้มตำไทยไข่เค็ม",
    description: "ส้มตำไทยรสชาติเปรี้ยวหวานนำ เผ็ดกำลังดี คลุกเคล้ากับไข่เค็มมันๆ นัวๆ",
    price: 65.00,
    category: "appetizer",
    image_url: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=80",
    is_available: true
  },
  {
    id: "m5",
    name: "บัวลอยมะพร้าวอ่อน",
    description: "บัวลอยเม็ดแป้งนุ่มนิ่มในน้ำกะทิคั้นสดหอมหวานมันกำลังดี ใส่เนื้อมะพร้าวอ่อนเคี้ยวเพลิน",
    price: 45.00,
    category: "dessert",
    image_url: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80",
    is_available: true
  },
  {
    id: "m6",
    name: "ข้าวเหนียวมะม่วง",
    description: "ข้าวเหนียวมูนกะทิหอมหวานมัน เสิร์ฟพร้อมมะม่วงน้ำดอกไม้สุกสีทองหวานฉ่ำ โรยถั่วทองกรุบกรอบ",
    price: 99.00,
    category: "dessert",
    image_url: "https://images.unsplash.com/photo-1608755673199-a6ab1cfdb59e?w=600&auto=format&fit=crop&q=80",
    is_available: true
  },
  {
    id: "m7",
    name: "ชาไทยเย็นสูตรเข้มข้น",
    description: "ชาไทยดั้งเดิม ต้มสด ชงเข้มข้น หอมมันกลมกล่อมด้วยนมสดแท้",
    price: 35.00,
    category: "drink",
    image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
    is_available: true
  },
  {
    id: "m8",
    name: "น้ำมะนาวอัญชัน",
    description: "น้ำอัญชันสีม่วงครามสดใส ผสมน้ำมะนาวแท้รสเปรี้ยวอมหวาน ดับกระหายคลายร้อนได้อย่างดี",
    price: 35.00,
    category: "drink",
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
    is_available: true
  }
];

export const initialOrders = [
  {
    id: "o1",
    customer_name: "สมชาย รักดี",
    table_number: "T3",
    notes: "กะเพราไม่ใส่พริกไทย และขอช้อนส้อมเพิ่มด้วยครับ",
    total_amount: 148.00,
    status: "pending",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(), // 15 mins ago
    items: [
      { id: "oi1", menu_item_id: "m1", name: "ข้าวกะเพราหมูสับไข่ดาว", quantity: 1, price_at_purchase: 69.00 },
      { id: "oi2", menu_item_id: "m3", name: "ปีกไก่ทอดน้ำปลา", quantity: 1, price_at_purchase: 79.00 }
    ]
  },
  {
    id: "o2",
    customer_name: "สมศรี วิเศษ",
    table_number: "T5",
    notes: "ผัดไทยไม่ใส่ถั่วลิสง (แพ้ถั่วครับ)",
    total_amount: 124.00,
    status: "preparing",
    created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 mins ago
    items: [
      { id: "oi3", menu_item_id: "m2", name: "ผัดไทยกุ้งสด", quantity: 1, price_at_purchase: 89.00 },
      { id: "oi4", menu_item_id: "m7", name: "ชาไทยเย็นสูตรเข้มข้น", quantity: 1, price_at_purchase: 35.00 }
    ]
  },
  {
    id: "o3",
    customer_name: "มานี มีตา",
    table_number: "T1",
    notes: "หวานน้อยทั้งบัวลอยและน้ำมะนาวค่ะ",
    total_amount: 80.00,
    status: "completed",
    created_at: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
    items: [
      { id: "oi5", menu_item_id: "m5", name: "บัวลอยมะพร้าวอ่อน", quantity: 1, price_at_purchase: 45.00 },
      { id: "oi6", menu_item_id: "m8", name: "น้ำมะนาวอัญชัน", quantity: 1, price_at_purchase: 35.00 }
    ]
  }
];

// ฟังก์ชันสำหรับจำลองฐานข้อมูลใน LocalStorage
export const mockDB = {
  getMenuItems() {
    const data = localStorage.getItem('mock_menu_items');
    if (!data) {
      localStorage.setItem('mock_menu_items', JSON.stringify(initialMenuItems));
      return initialMenuItems;
    }
    return JSON.parse(data);
  },

  saveMenuItems(items) {
    localStorage.setItem('mock_menu_items', JSON.stringify(items));
  },

  getOrders() {
    const data = localStorage.getItem('mock_orders');
    if (!data) {
      localStorage.setItem('mock_orders', JSON.stringify(initialOrders));
      return initialOrders;
    }
    return JSON.parse(data);
  },

  saveOrders(orders) {
    localStorage.setItem('mock_orders', JSON.stringify(orders));
  },

  addOrder(orderData) {
    const orders = this.getOrders();
    const menuItems = this.getMenuItems();
    
    // แปลงตะกร้าเป็นรายการซื้อ
    const items = orderData.cart.map((cartItem, idx) => {
      const menuItem = menuItems.find(m => m.id === cartItem.id);
      return {
        id: `oi_${Date.now()}_${idx}`,
        menu_item_id: cartItem.id,
        name: menuItem ? menuItem.name : 'Unknown Item',
        quantity: cartItem.quantity,
        price_at_purchase: cartItem.price
      };
    });

    const newOrder = {
      id: `o_${Date.now()}`,
      customer_name: orderData.customer_name,
      table_number: orderData.table_number,
      notes: orderData.notes || '',
      total_amount: orderData.total_amount,
      status: 'pending',
      created_at: new Date().toISOString(),
      items: items
    };

    orders.unshift(newOrder); // ใส่ไว้หน้าสุด
    this.saveOrders(orders);
    return newOrder;
  },

  updateOrderStatus(orderId, status) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      this.saveOrders(orders);
      return order;
    }
    return null;
  },

  addMenuItem(itemData) {
    const items = this.getMenuItems();
    const newItem = {
      id: `m_${Date.now()}`,
      name: itemData.name,
      description: itemData.description || '',
      price: parseFloat(itemData.price),
      category: itemData.category,
      image_url: itemData.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      is_available: true
    };
    items.push(newItem);
    this.saveMenuItems(items);
    return newItem;
  },

  updateMenuItem(itemId, updatedData) {
    const items = this.getMenuItems();
    const idx = items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
      items[idx] = {
        ...items[idx],
        name: updatedData.name,
        description: updatedData.description || '',
        price: parseFloat(updatedData.price),
        category: updatedData.category,
        image_url: updatedData.image_url || items[idx].image_url,
        is_available: updatedData.is_available !== undefined ? updatedData.is_available : items[idx].is_available
      };
      this.saveMenuItems(items);
      return items[idx];
    }
    return null;
  },

  deleteMenuItem(itemId) {
    let items = this.getMenuItems();
    items = items.filter(i => i.id !== itemId);
    this.saveMenuItems(items);
  }
};
