// app.js - ตัวควบคุมสเตท (State Manager) และการเชื่อมโยงระบบ UI เข้ากับฐานข้อมูล Supabase
import { config } from './config.js';
import { db, initSupabase } from './supabase.js';

// === ระบบ State ของแอปพลิเคชัน (App State) ===
const state = {
  menuItems: [],
  orders: [],
  cart: [],
  currentUser: null,
  activeView: 'menu',       // 'menu', 'order-status', 'login', 'dashboard'
  activeCategory: 'all',
  searchQuery: '',
  activeDashboardTab: 'orders', // 'orders', 'menu-manage', 'stats'
  selectedOrder: null,      // ออเดอร์ที่กำลังดูรายละเอียด หรือพิมพ์ใบเสร็จ
  currentCustomerOrderId: null, // ไอดีออเดอร์ล่าสุดของลูกค้าที่กำลังสั่ง
  supabaseUnsubscribe: null  // ฟังก์ชันยกเลิก realtime subscription ของ Supabase
};

// === สตาร์ทโปรเจกต์เมื่อหน้าเว็บโหลดเสร็จ ===
document.addEventListener('DOMContentLoaded', async () => {
  // โหลดเซสชันปัจจุบันของพนักงาน (ถ้ามี)
  state.currentUser = await db.getCurrentUser();
  
  // โหลดรายการเมนูอาหาร
  await loadMenuItems();
  
  // ดึงตะกร้าจาก LocalStorage ค้างไว้ (ถ้ามี)
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    state.cart = JSON.parse(savedCart);
    updateCartBadge();
  }

  // อัปเดตสถานะของตัวบ่งชี้การเชื่อมต่อ Supabase บนหัวเว็บ
  updateSupabaseIndicator();

  // ลงทะเบียนปุ่ม/ฟังก์ชันต่างๆ (Events Bindings)
  bindEvents();

  // เรนเดอร์หน้าจอเริ่มต้น
  renderView('menu');
  renderMenu();
});

// === การโหลดข้อมูลจากฐานข้อมูล (Data Fetching) ===
async function loadMenuItems() {
  showLoading(true);
  try {
    state.menuItems = await db.getMenuItems();
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการโหลดเมนูอาหาร', 'danger');
  } finally {
    showLoading(false);
  }
}

async function loadOrders() {
  if (!state.currentUser) return;
  try {
    state.orders = await db.getOrders();
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการโหลดรายการออเดอร์', 'danger');
  }
}

// === การสลับหน้าจอ (Router/Navigation) ===
function renderView(viewName) {
  state.activeView = viewName;
  
  // ซ่อนทุก Section
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.remove('active');
  });

  // แสดง Section ที่ต้องการ
  const activeSection = document.getElementById(`${viewName}-view`);
  if (activeSection) {
    activeSection.classList.add('active');
  }

  // เลื่อนกลับไปด้านบนสุด
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // ฟังก์ชันทำงานเฉพาะแต่ละหน้าจอ
  if (viewName === 'menu') {
    renderMenu();
  } else if (viewName === 'dashboard') {
    if (!state.currentUser) {
      renderView('login');
      return;
    }
    setupDashboard();
  } else if (viewName === 'order-status') {
    renderOrderStatusPage();
  }

  updateNavbar();
}

// อัปเดตเมนูบาร์และปุ่มควบคุม
function updateNavbar() {
  const staffBtn = document.getElementById('nav-staff-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');
  
  if (state.currentUser) {
    staffBtn.innerHTML = '<i class="fas fa-chart-line"></i> แดชบอร์ดหลังร้าน';
    staffBtn.onclick = () => renderView('dashboard');
    logoutBtn.style.display = 'inline-flex';
  } else {
    staffBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> พนักงานเข้าสู่ระบบ';
    staffBtn.onclick = () => renderView('login');
    logoutBtn.style.display = 'none';
  }
}

// === การแสดงผลฝั่งลูกค้า (Customer UI Renderers) ===

// เรนเดอร์เมนูอาหารในหน้าแรก
function renderMenu() {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

  // กรองเมนูตามหมวดหมู่และคำค้นหา
  const filteredItems = state.menuItems.filter(item => {
    const matchesCategory = state.activeCategory === 'all' || item.category === state.activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(state.searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (filteredItems.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <i class="fas fa-search" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
        <p>ไม่พบรายการอาหารที่ตรงกับความต้องการของคุณ</p>
      </div>
    `;
    return;
  }

  filteredItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    if (!item.is_available) {
      card.innerHTML += `<div class="out-of-stock-overlay">วัตถุดิบหมด</div>`;
    }

    card.innerHTML += `
      <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}" class="menu-image" alt="${item.name}">
      <div class="menu-info">
        <h3>${item.name}</h3>
        <p>${item.description || 'ไม่มีคำบรรยายเพิ่มเติม'}</p>
        <div class="menu-meta">
          <span class="menu-price">฿${parseFloat(item.price).toFixed(2)}</span>
          <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${item.id}" ${!item.is_available ? 'disabled' : ''}>
            <i class="fas fa-plus"></i> สั่งซื้อ
          </button>
        </div>
      </div>
    `;

    // ผูก Event คลิกปุ่มสั่งซื้อเพื่อเปิดรายละเอียด
    const addBtn = card.querySelector('.add-to-cart-btn');
    if (addBtn) {
      addBtn.onclick = (e) => {
        e.stopPropagation();
        openFoodDetailModal(item);
      };
    }

    grid.appendChild(card);
  });
}

// เปิดโมดอลระบุจำนวนอาหารและข้อความโน้ตเพิ่มเติม
function openFoodDetailModal(item) {
  const modal = document.getElementById('food-detail-modal');
  document.getElementById('detail-food-img').src = item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
  document.getElementById('detail-food-name').textContent = item.name;
  document.getElementById('detail-food-desc').textContent = item.description || 'ไม่มีคำบรรยายเพิ่มเติม';
  document.getElementById('detail-food-price').textContent = `฿${parseFloat(item.price).toFixed(2)}`;
  
  const qtyInput = document.getElementById('detail-qty');
  const noteInput = document.getElementById('detail-note');
  
  qtyInput.value = 1;
  noteInput.value = '';

  // ปุ่มคอนโทรลจำนวน
  document.getElementById('detail-qty-minus').onclick = () => {
    if (qtyInput.value > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
  };
  document.getElementById('detail-qty-plus').onclick = () => {
    qtyInput.value = parseInt(qtyInput.value) + 1;
  };

  // ปุ่มกดเพิ่มลงตะกร้าสินค้า
  document.getElementById('btn-add-to-cart-confirm').onclick = () => {
    const quantity = parseInt(qtyInput.value);
    const notes = noteInput.value.trim();
    addToCart(item, quantity, notes);
    closeModal('food-detail-modal');
  };

  openModal('food-detail-modal');
}

// === ระบบจัดการตะกร้าสินค้า (Cart logic) ===
function addToCart(item, quantity, notes) {
  // ตรวจสอบว่าในตะกร้ามีสินค้านี้อยู่แล้วที่มีโน้ตเหมือนกันหรือไม่
  const existingIndex = state.cart.findIndex(c => c.id === item.id && c.notes === notes);

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += quantity;
  } else {
    state.cart.push({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      image_url: item.image_url,
      quantity: quantity,
      notes: notes
    });
  }

  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartBadge();
  showToast(`เพิ่ม "${item.name}" ลงตะกร้าแล้ว!`, 'success');
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const totalItems = state.cart.reduce((acc, item) => acc + item.quantity, 0);
  
  if (totalItems > 0) {
    badge.textContent = totalItems;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// เรนเดอร์รายการสินค้าในโมดอลตะกร้าสินค้า (Cart Drawer)
function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  container.innerHTML = '';

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
        <i class="fas fa-shopping-basket" style="font-size: 3rem; margin-bottom: 1rem; display:block;"></i>
        ตะกร้าสินค้าของคุณยังว่างเปล่า
      </div>
    `;
    document.getElementById('cart-checkout-form').style.display = 'none';
    document.getElementById('cart-checkout-footer').style.display = 'none';
    return;
  }

  document.getElementById('cart-checkout-form').style.display = 'block';
  document.getElementById('cart-checkout-footer').style.display = 'block';

  let subtotal = 0;

  state.cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}" class="cart-item-image">
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <span class="cart-item-price">฿${item.price.toFixed(2)}</span>
        ${item.notes ? `<span class="cart-item-note">"${item.notes}"</span>` : ''}
      </div>
      <div class="cart-item-actions">
        <div class="quantity-controller">
          <button class="cart-qty-minus" data-idx="${index}">-</button>
          <span>${item.quantity}</span>
          <button class="cart-qty-plus" data-idx="${index}">+</button>
        </div>
        <button class="btn btn-danger btn-icon btn-sm cart-item-delete" data-idx="${index}" style="width:30px; height:30px; margin-top:5px;">
          <i class="fas fa-trash-alt" style="font-size: 0.8rem;"></i>
        </button>
      </div>
    `;

    // ตัวปรับจำนวนสินค้าในตะกร้า
    row.querySelector('.cart-qty-minus').onclick = () => {
      if (item.quantity > 1) {
        state.cart[index].quantity -= 1;
      } else {
        state.cart.splice(index, 1);
      }
      saveAndRefreshCart();
    };

    row.querySelector('.cart-qty-plus').onclick = () => {
      state.cart[index].quantity += 1;
      saveAndRefreshCart();
    };

    row.querySelector('.cart-item-delete').onclick = () => {
      state.cart.splice(index, 1);
      saveAndRefreshCart();
      showToast('ลบรายการสินค้าแล้ว', 'info');
    };

    container.appendChild(row);
  });

  // อัปเดตราคา
  document.getElementById('cart-subtotal').textContent = `฿${subtotal.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `฿${subtotal.toFixed(2)}`;
}

function saveAndRefreshCart() {
  localStorage.setItem('cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartDrawer();
}

// จัดส่งคำสั่งซื้อ (Checkout Process)
async function processCheckout(e) {
  e.preventDefault();
  
  if (state.cart.length === 0) {
    showToast('ตะกร้าสินค้ายังไม่มีของ กรุณาเลือกสั่งอาหารก่อนครับ', 'warning');
    return;
  }

  const customerName = document.getElementById('checkout-name').value.trim();
  const tableNumber = document.getElementById('checkout-table').value;
  const notes = document.getElementById('checkout-notes').value.trim();
  const totalAmount = state.cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (!customerName) {
    showToast('กรุณากรอกชื่อผู้สั่งอาหาร', 'warning');
    return;
  }

  showLoading(true);
  try {
    const orderData = {
      customer_name: customerName,
      table_number: tableNumber,
      notes: notes,
      total_amount: totalAmount,
      cart: state.cart
    };

    const newOrder = await db.addOrder(orderData);
    
    // บันทึกไอดีออเดอร์นี้ในสเตทเพื่อให้ลูกค้าติดตามสถานะ
    state.currentCustomerOrderId = newOrder.id;
    localStorage.setItem('last_order_id', newOrder.id);
    
    // เคลียร์ตะกร้า
    state.cart = [];
    localStorage.removeItem('cart');
    updateCartBadge();

    closeModal('cart-drawer');
    showToast('ส่งรายการสั่งอาหารสำเร็จ! กำลังเตรียมออเดอร์ให้คุณ', 'success');

    // ส่งลูกค้าไปยังหน้าติดตามสถานะสั่งซื้อ
    renderView('order-status');
  } catch (error) {
    console.error('Checkout error:', error);
    showToast('ไม่สามารถส่งรายการสั่งซื้อได้ กรุณาลองอีกครั้ง', 'danger');
  } finally {
    showLoading(false);
  }
}

// === หน้าจอติดตามสถานะคำสั่งซื้อของลูกค้า (Customer Receipt / Order Status) ===
async function renderOrderStatusPage() {
  const orderId = state.currentCustomerOrderId || localStorage.getItem('last_order_id');
  const container = document.getElementById('order-status-container');
  
  if (!orderId) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border:1.5px solid var(--border-color);">
        <i class="fas fa-file-invoice" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1.5rem;"></i>
        <h3>ไม่พบรายการสั่งซื้อล่าสุด</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">คุณยังไม่มีประวัติการทำรายการสั่งซื้อ หรือออเดอร์หมดอายุแล้ว</p>
        <button class="btn btn-primary" onclick="renderView('menu')">ไปที่หน้าเมนูอาหาร</button>
      </div>
    `;
    return;
  }

  showLoading(true);
  try {
    // ดึงออเดอร์ทั้งหมดเพื่อหาออเดอร์ไอดีนี้ (ทั้ง Supabase และ Mock)
    const allOrders = await db.getOrders();
    const order = allOrders.find(o => o.id === orderId);

    if (!order) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border:1.5px solid var(--border-color);">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--warning); margin-bottom: 1.5rem;"></i>
          <h3>ไม่พบข้อมูลออเดอร์</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">ไอดีออเดอร์ <code>${orderId}</code> ไม่มีในระบบ</p>
          <button class="btn btn-primary" onclick="renderView('menu')">กลับหน้าเมนูอาหาร</button>
        </div>
      `;
      return;
    }

    // สร้างกล่องสรุปสถานะใบเสร็จดิจิทัล
    let statusLabel = 'รอดำเนินการ';
    let statusDesc = 'ร้านค้าได้รับคำสั่งซื้อของคุณแล้วและรอพนักงานยืนยัน';
    let stepClassPending = 'completed';
    let stepClassPrep = '';
    let stepClassDone = '';

    if (order.status === 'preparing') {
      statusLabel = 'กำลังปรุงอาหาร';
      statusDesc = 'เชฟของเรากำลังจัดเตรียมอาหารจานโปรดของคุณในครัว';
      stepClassPending = 'completed';
      stepClassPrep = 'active';
    } else if (order.status === 'completed') {
      statusLabel = 'พร้อมเสิร์ฟ / เสร็จสิ้น';
      statusDesc = 'อาหารของคุณจัดเตรียมเสร็จสิ้นเรียบร้อยแล้ว!';
      stepClassPending = 'completed';
      stepClassPrep = 'completed';
      stepClassDone = 'completed active';
    } else if (order.status === 'cancelled') {
      statusLabel = 'ยกเลิกคำสั่งซื้อ';
      statusDesc = 'คำสั่งซื้อของคุณถูกปฏิเสธหรือยกเลิกโดยทางร้าน';
      stepClassPending = 'danger active';
    }

    const timeStr = new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let itemsHtml = '';
    order.items.forEach(item => {
      itemsHtml += `
        <div class="receipt-item-row">
          <span>${item.name} <strong>x${item.quantity}</strong></span>
          <span>฿${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="receipt-card">
        <div class="receipt-header">
          <h2>ใบเสร็จดิจิทัล & ติดตามสถานะ</h2>
          <p>หมายเลขออเดอร์: <strong>${order.id.substring(0, 8).toUpperCase()}</strong></p>
          <p>โต๊ะ: <strong>${order.table_number || 'ไม่ได้ระบุ'}</strong> | เวลาสั่ง: ${timeStr}</p>
        </div>

        <div style="text-align: center; margin: 1rem 0;">
          <span class="supabase-indicator ${order.status === 'cancelled' ? 'demo' : order.status === 'completed' ? 'live' : 'demo'}" style="display:inline-flex; font-size:1rem; padding:0.5rem 1rem;">
            สถานะ: ${statusLabel}
          </span>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.5rem;">${statusDesc}</p>
        </div>

        <!-- แท็กสถานะ Timeline -->
        <div class="status-timeline">
          <div class="status-step ${stepClassPending}">
            <div class="status-icon"><i class="fas fa-check"></i></div>
            <div class="status-label">รับออเดอร์</div>
          </div>
          <div class="status-step ${stepClassPrep}">
            <div class="status-icon"><i class="fas fa-fire"></i></div>
            <div class="status-label">กำลังปรุง</div>
          </div>
          <div class="status-step ${stepClassDone}">
            <div class="status-icon"><i class="fas fa-utensils"></i></div>
            <div class="status-label">เสิร์ฟแล้ว</div>
          </div>
        </div>

        <div style="border-top: 1px dashed var(--border-color); padding-top: 1.5rem;">
          <h4 style="margin-bottom: 0.75rem;">รายการสั่งซื้อของคุณ (ของ ${order.customer_name})</h4>
          <div class="receipt-items-list">
            ${itemsHtml}
          </div>
          
          ${order.notes ? `
            <div style="background-color:var(--bg-primary); padding:0.75rem; border-radius:var(--radius-sm); font-size:0.85rem; border:1px solid var(--border-color); margin-bottom:1rem;">
              <strong>บันทึกเพิ่มเติม:</strong> "${order.notes}"
            </div>
          ` : ''}

          <div class="cart-summary" style="margin-top: 1rem;">
            <div class="summary-row total">
              <span>ราคาสุทธิ</span>
              <span>฿${parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: center;">
          <button class="btn btn-secondary" id="btn-refresh-status"><i class="fas fa-sync-alt"></i> อัปเดตสถานะ</button>
          <button class="btn btn-outline" onclick="renderView('menu')"><i class="fas fa-plus"></i> สั่งเพิ่ม</button>
        </div>
      </div>
    `;

    document.getElementById('btn-refresh-status').onclick = () => renderOrderStatusPage();

  } catch (err) {
    console.error('Error rendering status page:', err);
    showToast('เกิดข้อผิดพลาดในการดึงสถานะออเดอร์', 'danger');
  } finally {
    showLoading(false);
  }
}

// === ระบบหลังร้านสำหรับพนักงาน (Staff View / Back-office Dashboard) ===

// ตั้งค่าพนักงานล็อกอิน
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  showLoading(true);
  try {
    const { user, error } = await db.loginStaff(email, password);
    if (error) {
      showToast(error.message, 'danger');
      return;
    }

    state.currentUser = user;
    showToast('เข้าสู่ระบบของพนักงานสำเร็จ!', 'success');
    renderView('dashboard');
  } catch (err) {
    showToast('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'danger');
  } finally {
    showLoading(false);
  }
}

// พนักงานออกจากระบบ
async function handleLogout() {
  showLoading(true);
  try {
    await db.logoutStaff();
    state.currentUser = null;
    if (state.supabaseUnsubscribe) {
      state.supabaseUnsubscribe();
      state.supabaseUnsubscribe = null;
    }
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    renderView('menu');
  } catch (e) {
    showToast('เกิดข้อผิดพลาดในการออกจากระบบ', 'danger');
  } finally {
    showLoading(false);
  }
}

// ตั้งค่าและเรนเดอร์แดชบอร์ดหลังร้าน
async function setupDashboard() {
  // โหลดรายการเมนูและคำสั่งซื้อ
  await loadMenuItems();
  await loadOrders();

  // เรนเดอร์แท็บแดชบอร์ด
  switchDashboardTab(state.activeDashboardTab);

  // ตั้งค่าระบบ Real-time (หรือจำลองอัปเดตแบบ Real-time ทุก 10 วินาทีในโหมด Demo)
  if (state.supabaseUnsubscribe) {
    state.supabaseUnsubscribe();
  }

  if (config.isSupabaseConfigured()) {
    state.supabaseUnsubscribe = db.subscribeToOrders(async (payload) => {
      console.log('Realtime Order updated! Reloading orders...');
      await loadOrders();
      if (state.activeView === 'dashboard') {
        if (state.activeDashboardTab === 'orders') {
          renderDashboardOrders();
        } else if (state.activeDashboardTab === 'stats') {
          renderDashboardStats();
        }
      }
      showToast('มีการอัปเดตออเดอร์ใหม่ในระบบ!', 'info');
    });
  }
}

// การเปลี่ยนแท็บย่อยในหน้าแดชบอร์ดหลังร้าน
function switchDashboardTab(tabName) {
  state.activeDashboardTab = tabName;
  
  // จัดคลาส CSS ปุ่มแท็บ
  document.querySelectorAll('.dashboard-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeTabBtn = document.getElementById(`tab-${tabName}-btn`);
  if (activeTabBtn) activeTabBtn.classList.add('active');

  // ซ่อนหน้าแท็บทั้งหมด
  document.querySelectorAll('.dashboard-tab-content').forEach(content => {
    content.style.display = 'none';
  });

  // แสดงแท็บที่เลือก
  document.getElementById(`dashboard-${tabName}-content`).style.display = 'block';

  // เรนเดอร์ข้อมูลแท็บ
  if (tabName === 'orders') {
    renderDashboardOrders();
  } else if (tabName === 'menu-manage') {
    renderDashboardMenuManage();
  } else if (tabName === 'stats') {
    renderDashboardStats();
  }
}

// เรนเดอร์การจัดการคำสั่งซื้อ (Order Board)
function renderDashboardOrders() {
  const pendingList = document.getElementById('list-orders-pending');
  const preparingList = document.getElementById('list-orders-preparing');
  const completedList = document.getElementById('list-orders-completed');

  pendingList.innerHTML = '';
  preparingList.innerHTML = '';
  completedList.innerHTML = '';

  // สรุปจำนวนตัวเลข
  let pendingCount = 0;
  let preparingCount = 0;
  let completedCount = 0;

  state.orders.forEach(order => {
    if (order.status === 'cancelled') return; // ไม่แสดงออเดอร์ยกเลิกในบอร์ดหลัก

    const card = document.createElement('div');
    card.className = 'order-card';
    card.onclick = () => openOrderDetailModal(order);

    let itemsSummary = '';
    order.items.forEach(item => {
      itemsSummary += `
        <div class="order-summary-item">
          <span>${item.name} <strong>x${item.quantity}</strong></span>
        </div>
      `;
    });

    const timeStr = new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    card.innerHTML = `
      <div class="order-card-header">
        <span class="order-id">#${order.id.substring(0, 6).toUpperCase()}</span>
        <span class="order-table">${order.table_number || 'กลับบ้าน'}</span>
      </div>
      <div class="order-customer">${order.customer_name}</div>
      <div class="order-summary-items">
        ${itemsSummary}
      </div>
      <div class="order-card-footer">
        <span class="order-time"><i class="far fa-clock"></i> ${timeStr}</span>
        <span class="order-total-price">฿${parseFloat(order.total_amount).toFixed(2)}</span>
      </div>
    `;

    if (order.status === 'pending') {
      pendingList.appendChild(card);
      pendingCount++;
    } else if (order.status === 'preparing') {
      preparingList.appendChild(card);
      preparingCount++;
    } else if (order.status === 'completed') {
      completedList.appendChild(card);
      completedCount++;
    }
  });

  // อัปเดตตัวเลขหัวคอลัมน์
  document.getElementById('badge-orders-pending').textContent = pendingCount;
  document.getElementById('badge-orders-preparing').textContent = preparingCount;
  document.getElementById('badge-orders-completed').textContent = completedCount;

  // หากไม่มีรายการเลยให้ใส่กล่อง Empty
  if (pendingCount === 0) pendingList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem 0; font-size:0.9rem;">ไม่มีออเดอร์รอดำเนินการ</div>`;
  if (preparingCount === 0) preparingList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem 0; font-size:0.9rem;">ไม่มีออเดอร์กำลังปรุง</div>`;
  if (completedCount === 0) completedList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:2rem 0; font-size:0.9rem;">ไม่มีออเดอร์ที่จัดส่งเสร็จสิ้น</div>`;
}

// เปิดโมดอลแสดงรายละเอียดคำสั่งซื้อแบบเต็มตัวเพื่อเปลี่ยนสถานะหรือพิมพ์ใบเสร็จ
function openOrderDetailModal(order) {
  state.selectedOrder = order;
  const modal = document.getElementById('order-detail-modal');

  document.getElementById('detail-order-id').textContent = `#${order.id.toUpperCase()}`;
  document.getElementById('detail-order-customer').textContent = order.customer_name;
  document.getElementById('detail-order-table').textContent = order.table_number || 'สั่งกลับบ้าน';
  document.getElementById('detail-order-time').textContent = new Date(order.created_at).toLocaleString('th-TH');
  
  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1.5px solid var(--border-color);">
        <span>${item.name} <strong style="color:var(--accent-color)">x${item.quantity}</strong></span>
        <span>฿${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
      </div>
    `;
  });
  document.getElementById('detail-order-items-list').innerHTML = itemsHtml;
  document.getElementById('detail-order-notes').textContent = order.notes || 'ไม่มีบันทึกเพิ่มเติม';
  document.getElementById('detail-order-total').textContent = `฿${parseFloat(order.total_amount).toFixed(2)}`;

  // ปรับการแสดงผลปุ่มอัปเดตสถานะ
  const actionsContainer = document.getElementById('detail-order-actions');
  actionsContainer.innerHTML = '';

  if (order.status === 'pending') {
    actionsContainer.innerHTML = `
      <button class="btn btn-primary" id="btn-order-accept" style="flex:1;"><i class="fas fa-fire"></i> ยืนยันคำสั่งซื้อ & เริ่มปรุง</button>
      <button class="btn btn-danger" id="btn-order-cancel" style="width:120px;"><i class="fas fa-times"></i> ยกเลิกออเดอร์</button>
    `;
    document.getElementById('btn-order-accept').onclick = () => updateOrderStatus(order.id, 'preparing');
    document.getElementById('btn-order-cancel').onclick = () => updateOrderStatus(order.id, 'cancelled');
  } else if (order.status === 'preparing') {
    actionsContainer.innerHTML = `
      <button class="btn btn-primary" id="btn-order-complete" style="flex:1; background-color:var(--success);"><i class="fas fa-check-double"></i> ปรุงเสร็จสิ้น & พร้อมเสิร์ฟ</button>
    `;
    document.getElementById('btn-order-complete').onclick = () => updateOrderStatus(order.id, 'completed');
  } else {
    actionsContainer.innerHTML = `
      <div style="color:var(--success); font-weight:600; text-align:center; width:100%;"><i class="fas fa-check-circle"></i> รายการสั่งซื้อเสร็จสิ้นเรียบร้อยแล้ว</div>
    `;
  }

  // ปล่อยปุ่ม Print ใบเสร็จ
  document.getElementById('btn-print-receipt').onclick = () => {
    preparePrintReceipt(order);
    window.print();
  };

  openModal('order-detail-modal');
}

// อัปเดตสถานะรายการอาหารหลัก
async function updateOrderStatus(orderId, status) {
  showLoading(true);
  try {
    await db.updateOrderStatus(orderId, status);
    showToast(`อัปเดตสถานะออเดอร์สำเร็จ!`, 'success');
    closeModal('order-detail-modal');
    await loadOrders();
    renderDashboardOrders();
  } catch (err) {
    showToast('ล้มเหลวในการอัปเดตสถานะคำสั่งซื้อ', 'danger');
  } finally {
    showLoading(false);
  }
}

// จัดเตรียมส่วนการพิมพ์ใบเสร็จ (HTML ที่ซ่อนไว้พิมพ์)
function preparePrintReceipt(order) {
  const printSection = document.getElementById('print-receipt-section');
  
  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <div class="print-item-row">
        <span>${item.name} x${item.quantity}</span>
        <span>฿${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
      </div>
    `;
  });

  const orderTimeStr = new Date(order.created_at).toLocaleString('th-TH');

  printSection.innerHTML = `
    <div class="print-header">
      <div class="print-title">APICHAI RESTAURANT</div>
      <div style="font-size: 8pt; margin-top: 1mm;">ใบเสร็จรับเงินอย่างย่อ</div>
    </div>
    
    <div class="print-meta-row">
      <span>เลขที่ใบเสร็จ:</span>
      <span>#${order.id.substring(0, 8).toUpperCase()}</span>
    </div>
    <div class="print-meta-row">
      <span>วันที่ / เวลา:</span>
      <span>${orderTimeStr}</span>
    </div>
    <div class="print-meta-row">
      <span>โต๊ะ:</span>
      <span>${order.table_number || 'กลับบ้าน'}</span>
    </div>
    <div class="print-meta-row">
      <span>ลูกค้า:</span>
      <span>${order.customer_name}</span>
    </div>
    
    <div class="print-items" style="border-top: 1px dashed #000000; margin-top:2mm; padding-top:2mm;">
      ${itemsHtml}
    </div>
    
    ${order.notes ? `
      <div style="font-size: 8pt; font-style: italic; margin-bottom: 2mm;">
        หมายเหตุ: "${order.notes}"
      </div>
    ` : ''}

    <div class="print-total-row">
      <span>ยอดรวมสุทธิ:</span>
      <span>฿${parseFloat(order.total_amount).toFixed(2)}</span>
    </div>
    
    <div class="print-footer">
      <div>ขอบคุณที่ใช้บริการ / Thank you!</div>
      <div style="margin-top: 1mm; font-size: 7pt;">ใบเสนอราคานี้ออกโดยระบบดิจิทัล</div>
    </div>
  `;
}

// เรนเดอร์หน้าจอแท็บจัดการเมนู (Menu Management)
function renderDashboardMenuManage() {
  const tbody = document.getElementById('menu-manage-tbody');
  tbody.innerHTML = '';

  state.menuItems.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'}" class="menu-table-image" alt="${item.name}">
      </td>
      <td style="font-weight:600;">${item.name}</td>
      <td style="color:var(--text-secondary); max-width:200px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${item.description || '-'}</td>
      <td style="font-weight:700; color:var(--accent-color);">฿${parseFloat(item.price).toFixed(2)}</td>
      <td style="text-transform: capitalize;">${getCategoryThaiName(item.category)}</td>
      <td>
        <label class="switch">
          <input type="checkbox" class="toggle-availability" data-id="${item.id}" ${item.is_available ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary btn-icon btn-sm edit-menu-btn" data-id="${item.id}" style="width:34px; height:34px;"><i class="fas fa-edit" style="font-size:0.8rem;"></i></button>
          <button class="btn btn-danger btn-icon btn-sm delete-menu-btn" data-id="${item.id}" style="width:34px; height:34px;"><i class="fas fa-trash-alt" style="font-size:0.8rem;"></i></button>
        </div>
      </td>
    `;

    // ผูก Event ทริกเกอร์เปลี่ยนสถานะเปิดปิดขาย
    tr.querySelector('.toggle-availability').onchange = async (e) => {
      const isAvailable = e.target.checked;
      await db.updateMenuItem(item.id, { ...item, is_available: isAvailable });
      showToast(`เปลี่ยนสถานะ "${item.name}" เป็น ${isAvailable ? 'พร้อมจำหน่าย' : 'ปิดจำหน่ายถาวร'}`, 'info');
      await loadMenuItems();
    };

    // ปุ่มแก้ไขอาหาร
    tr.querySelector('.edit-menu-btn').onclick = () => openMenuFormModal(item);

    // ปุ่มลบรายการอาหาร
    tr.querySelector('.delete-menu-btn').onclick = async () => {
      if (confirm(`คุณต้องการลบเมนู "${item.name}" ใช่หรือไม่? ไม่สามารถกู้คืนข้อมูลได้`)) {
        showLoading(true);
        try {
          await db.deleteMenuItem(item.id);
          showToast(`ลบเมนูสำเร็จ!`, 'success');
          await loadMenuItems();
          renderDashboardMenuManage();
        } catch (e) {
          showToast('ไม่สามารถลบเมนูได้', 'danger');
        } finally {
          showLoading(false);
        }
      }
    };

    tbody.appendChild(tr);
  });
}

function getCategoryThaiName(category) {
  const names = {
    appetizer: 'ของทานเล่น',
    main: 'จานหลัก',
    dessert: 'ของหวาน',
    drink: 'เครื่องดื่ม'
  };
  return names[category] || category;
}

// เปิดโมดอลฟอร์มเพิ่ม/แก้ไขรายการอาหาร
function openMenuFormModal(item = null) {
  const modal = document.getElementById('menu-item-modal');
  const modalTitle = document.getElementById('menu-item-modal-title');
  
  const form = document.getElementById('menu-item-form');
  const idInput = document.getElementById('form-item-id');
  const nameInput = document.getElementById('form-item-name');
  const descInput = document.getElementById('form-item-desc');
  const priceInput = document.getElementById('form-item-price');
  const categoryInput = document.getElementById('form-item-category');
  const imgInput = document.getElementById('form-item-img');

  if (item) {
    modalTitle.textContent = 'แก้ไขรายการอาหาร';
    idInput.value = item.id;
    nameInput.value = item.name;
    descInput.value = item.description || '';
    priceInput.value = item.price;
    categoryInput.value = item.category;
    imgInput.value = item.image_url || '';
  } else {
    modalTitle.textContent = 'เพิ่มรายการอาหารใหม่';
    form.reset();
    idInput.value = '';
  }

  // กดส่งฟอร์มเพื่อบันทึกข้อมูล
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const itemData = {
      name: nameInput.value.trim(),
      description: descInput.value.trim(),
      price: parseFloat(priceInput.value),
      category: categoryInput.value,
      image_url: imgInput.value.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
    };

    if (!itemData.name || isNaN(itemData.price)) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }

    showLoading(true);
    try {
      if (idInput.value) {
        // แก้ไข
        await db.updateMenuItem(idInput.value, itemData);
        showToast('แก้ไขข้อมูลเมนูอาหารสำเร็จ!', 'success');
      } else {
        // เพิ่มใหม่
        await db.addMenuItem(itemData);
        showToast('เพิ่มเมนูอาหารใหม่สำเร็จ!', 'success');
      }
      closeModal('menu-item-modal');
      await loadMenuItems();
      renderDashboardMenuManage();
    } catch (err) {
      showToast('บันทึกข้อมูลเมนูไม่สำเร็จ', 'danger');
    } finally {
      showLoading(false);
    }
  };

  openModal('menu-item-modal');
}

// เรนเดอร์หน้าวิเคราะห์ข้อมูลยอดขายและสถิติการสั่งซื้อ (Stats View)
function renderDashboardStats() {
  const totalRevenueEl = document.getElementById('stat-total-revenue');
  const totalOrdersEl = document.getElementById('stat-total-orders');
  const averageTicketEl = document.getElementById('stat-avg-ticket');
  const popularListEl = document.getElementById('list-popular-items');

  // กรองเฉพาะออเดอร์ที่เสร็จสิ้น (completed)
  const completedOrders = state.orders.filter(o => o.status === 'completed');
  
  // 1. คำนวณรายได้ทั้งหมด
  const totalRevenue = completedOrders.reduce((acc, o) => acc + parseFloat(o.total_amount), 0);
  totalRevenueEl.textContent = `฿${totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // 2. จำนวนคำสั่งซื้อทั้งหมด
  totalOrdersEl.textContent = state.orders.length;

  // 3. ยอดคำสั่งซื้อเฉลี่ย
  const avgTicket = completedOrders.length > 0 ? (totalRevenue / completedOrders.length) : 0;
  averageTicketEl.textContent = `฿${avgTicket.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // 4. สรุปรายการอาหารที่ยอดนิยม
  const itemsCount = {};
  state.orders.forEach(order => {
    if (order.status === 'cancelled') return; // ไม่นำออเดอร์ที่ยกเลิกมารวม
    order.items.forEach(item => {
      itemsCount[item.name] = (itemsCount[item.name] || 0) + item.quantity;
    });
  });

  // แปลงและเรียงลำดับความฮิต
  const sortedPopularItems = Object.entries(itemsCount)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5); // เอา 5 อันดับแรก

  popularListEl.innerHTML = '';
  if (sortedPopularItems.length === 0) {
    popularListEl.innerHTML = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted);">ไม่มีข้อมูลสถิติเมนูยอดนิยม</div>`;
    return;
  }

  sortedPopularItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom: 1px solid var(--border-color); font-size:0.95rem;`;
    row.innerHTML = `
      <span><strong>${idx + 1}.</strong> ${item.name}</span>
      <span style="font-weight:600; color:var(--accent-color);">${item.qty} จาน</span>
    `;
    popularListEl.appendChild(row);
  });
}

// === ระบบโมดอลและการแจ้งเตือน (Modal utilities & Toasts) ===
function openModal(modalId) {
  document.getElementById(modalId).classList.add('open');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

function showLoading(show) {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.display = show ? 'flex' : 'none';
  }
}

// แสดงการแจ้งเตือนป๊อปอัป (Toast notification)
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // กำหนดไอคอนตามประเภท
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';
  if (type === 'danger') icon = 'fa-exclamation-circle';

  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.5rem;">
      <i class="fas ${icon}" style="font-size:1.1rem;"></i>
      <span class="toast-text">${message}</span>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // ปุ่มกดปิด toast ทันที
  toast.querySelector('.toast-close').onclick = () => {
    toast.remove();
  };

  container.appendChild(toast);

  // หายไปเองหลัง 4 วินาที
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// === ระบบหน้าป๊อปอัปสำหรับเชื่อมต่อคีย์จำลอง Supabase จากหน้าเว็บ ===
function openSupabaseConfigModal() {
  const { url, anonKey } = config.getSupabaseConfig();
  document.getElementById('config-url').value = url;
  document.getElementById('config-anon-key').value = anonKey;
  openModal('supabase-config-modal');
}

async function handleSaveSupabaseConfig(e) {
  e.preventDefault();
  const url = document.getElementById('config-url').value.trim();
  const anonKey = document.getElementById('config-anon-key').value.trim();

  // เซฟลงเครื่อง
  config.setSupabaseConfig(url, anonKey);
  
  // ลองสั่งเชื่อมต่อ Supabase ใหม่
  const isOk = initSupabase();

  closeModal('supabase-config-modal');
  updateSupabaseIndicator();

  // ทำการดึงรายการข้อมูลเมนูอาหารใหม่จากฐานข้อมูล
  await loadMenuItems();
  
  if (isOk) {
    showToast('เชื่อมต่อฐานข้อมูล Supabase สำเร็จแล้ว!', 'success');
  } else {
    showToast('ปิดการเชื่อมต่อ Supabase แล้ว เปลี่ยนกลับเข้าสู่ Demo Mode', 'info');
  }

  // หากหน้าจอปัจจุบันคือแดชบอร์ด ต้องเชื่อมข้อมูลใหม่
  if (state.activeView === 'dashboard') {
    setupDashboard();
  } else {
    renderView('menu');
  }
}

// ตัวชี้วัดสเตตัส Supabase
function updateSupabaseIndicator() {
  const indicator = document.getElementById('supabase-status-indicator');
  if (config.isSupabaseConfigured()) {
    indicator.className = 'supabase-indicator live';
    indicator.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:var(--success)"></span> Live (Supabase)';
  } else {
    indicator.className = 'supabase-indicator demo';
    indicator.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:var(--warning)"></span> Demo Mode';
  }
}

// === ผูก Events เข้ากับปุ่มและฟิลเตอร์ต่างๆ (Event Bindings) ===
function bindEvents() {
  // เมนูนำทางย่อย (Filters)
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.onclick = (e) => {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      state.activeCategory = e.target.getAttribute('data-category');
      renderMenu();
    };
  });

  // ค้นหาอาหาร (Search)
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.oninput = (e) => {
      state.searchQuery = e.target.value.trim();
      renderMenu();
    };
  }

  // ปุ่มรถเข็นสินค้า (Open Cart Drawer)
  document.getElementById('nav-cart-btn').onclick = () => {
    renderCartDrawer();
    openModal('cart-drawer');
  };

  // ปุ่มตั้งค่า Supabase
  document.getElementById('supabase-status-indicator').onclick = openSupabaseConfigModal;
  document.getElementById('btn-open-config-cog').onclick = openSupabaseConfigModal;

  // จัดส่งฟอร์มตั้งค่า
  document.getElementById('supabase-config-form').onsubmit = handleSaveSupabaseConfig;

  // ฟอร์มส่งออเดอร์ลูกค้า
  document.getElementById('cart-checkout-form').onsubmit = processCheckout;

  // ฟอร์มพนักงานล็อกอิน
  document.getElementById('staff-login-form').onsubmit = handleLogin;
  document.getElementById('nav-logout-btn').onclick = handleLogout;

  // แดชบอร์ดสลับแท็บ
  document.getElementById('tab-orders-btn').onclick = () => switchDashboardTab('orders');
  document.getElementById('tab-menu-manage-btn').onclick = () => switchDashboardTab('menu-manage');
  document.getElementById('tab-stats-btn').onclick = () => switchDashboardTab('stats');

  // เพิ่มเมนูอาหารใหม่ (Staff)
  document.getElementById('btn-add-new-menu').onclick = () => openMenuFormModal();

  // ปุ่มปิดโมดอลทุกอัน
  document.querySelectorAll('.modal-close, .modal-cancel-btn').forEach(btn => {
    btn.onclick = (e) => {
      const modalId = e.target.closest('.modal-backdrop').id;
      closeModal(modalId);
    };
  });

  // ปิดปุ่มเมื่อคลิกนอกพื้นที่โมดอล
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop.id);
      }
    };
  });
}
