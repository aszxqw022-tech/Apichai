# 🍽️ Apichai Restaurant Web Application

เว็บแอปพลิเคชันร้านอาหารสไตล์ Modern Light Mode ที่ให้ลูกค้าสั่งอาหารออนไลน์จากโต๊ะได้ทันที พร้อมระบบจัดการหลังร้านของพนักงาน (แดชบอร์ดรับออเดอร์, อัปเดตสถานะแบบ Real-time, จัดการวัตถุดิบและราคาอาหาร, รายงานยอดขาย, พิมพ์ใบเสร็จความร้อน) และการประมวลผลข้อมูลผ่านฐานข้อมูล Supabase

---

## 🚀 ฟังก์ชันการใช้งานเด่น (Key Features)

1. **โหมดลูกค้า (Customer Mode)**
   - สั่งซื้ออาหารพร้อมระบุข้อความพิเศษถึงก้นครัว (เช่น ไม่ใส่พริก, หวานน้อย)
   - ค้นหารายการอาหารและจัดกลุ่มตามประเภทหลัก
   - หน้าติดตามสถานะออเดอร์แบบสด (Live Status) และใบเสร็จดิจิทัลส่วนตัว
2. **โหมดพนักงาน (Staff Dashboard)**
   - แดชบอร์ดแบ่งคอลัมน์สถานะ (รอดำเนินการ -> กำลังปรุง -> เสิร์ฟแล้ว)
   - ฟังก์ชันจัดการเมนูอาหาร (เพิ่มอาหารใหม่, แก้ไขข้อมูล/ราคา, ปิดการขายอาหารที่หมดชั่วคราว)
   - สรุปยอดขาย รายการออเดอร์ และกราฟ/ตารางสถิติเมนูยอดนิยม
   - ปุ่มพิมพ์ใบเสร็จย่ออย่างรวดเร็ว (รองรับเครื่องพิมพ์สลิปความร้อน Thermal Printer ขนาด 80mm)
3. **ระบบสลับโหมดออฟไลน์ (Demo Mode & Supabase Integration)**
   - หากเปิดหน้าจอเป็นครั้งแรกโดยไม่มีฐานข้อมูล ตัวแอปจะรันในโหมดจำลอง (Demo Mode) ที่ใช้งานได้ครบทุกฟังก์ชันทันทีเพื่อทดสอบประสิทธิภาพ
   - พนักงานสามารถคลิกที่ปุ่มตัวบอกสถานะด้านบนของเว็บเพื่อกรอก URL และ Anon Key ของ Supabase เพื่อสลับเข้าใช้งานระบบจัดเก็บข้อมูลและ Real-time ในระบบคลาวด์ของจริงได้ทันที

---

## 🗄️ ขั้นตอนการตั้งค่าระบบฐานข้อมูล Supabase (Database Setup)

1. สมัครใช้งานและสร้างโปรเจกต์ใหม่บน [Supabase](https://supabase.com)
2. ไปที่เมนู **SQL Editor** ทางด้านซ้ายของหน้าแดชบอร์ด Supabase และกดสร้างคำสั่ง SQL ใหม่ (New Query)
3. คัดลอกโค้ด SQL ด้านล่างนี้ไปวางและกดปุ่ม **Run**:

```sql
-- 1. ตารางเมนูอาหาร (menu_items)
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL, -- 'appetizer', 'main', 'dessert', 'drink'
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ตารางรายการสั่งซื้อ (orders)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    table_number TEXT,
    notes TEXT,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'preparing', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ตารางรายการอาหารในแต่ละออเดอร์ (order_items)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    price_at_purchase NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- แทรกรายการอาหารเริ่มต้นลงในตาราง
INSERT INTO menu_items (name, description, price, category, image_url) VALUES
('ข้าวกะเพราหมูสับไข่ดาว', 'ข้าวหอมมะลิราดผัดกะเพราหมูสับรสจัดจ้าน เสิร์ฟพร้อมไข่ดาวกรอบนอกไข่แดงเยิ้มๆ', 69.00, 'main', 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600&auto=format&fit=crop&q=80'),
('ผัดไทยกุ้งสด', 'เส้นจันท์เหนียวนุ่ม ผัดกับน้ำซอสมะขามเปียกสูตรโบราณเข้มข้น และกุ้งสดตัวโต', 89.00, 'main', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80'),
('ปีกไก่ทอดน้ำปลา', 'ปีกไก่หมักน้ำปลาดีและสมุนไพรทอดจนสีเหลืองทอง กรอบนอกนุ่มใน เสิร์ฟคู่กับน้ำจิ้มแจ่วรสเด็ด', 79.00, 'appetizer', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80'),
('ส้มตำไทยไข่เค็ม', 'ส้มตำไทยรสชาติเปรี้ยวหวานนำ เผ็ดกำลังดี คลุกเคล้ากับไข่เค็มมันๆ นัวๆ', 65.00, 'appetizer', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&auto=format&fit=crop&q=80'),
('บัวลอยมะพร้าวอ่อน', 'บัวลอยเม็ดแป้งนุ่มนิ่มในน้ำกะทิคั้นสดหอมหวานมันกำลังดี ใส่เนื้อมะพร้าวอ่อนเคี้ยวเพลิน', 45.00, 'dessert', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80'),
('ข้าวเหนียวมะม่วง', 'ข้าวเหนียวมูนกะทิหอมหวานมัน เสิร์ฟพร้อมมะม่วงน้ำดอกไม้สุกสีทองหวานฉ่ำ โรยถั่วทองกรุบกรอบ', 99.00, 'dessert', 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80'),
('ชาไทยเย็นสูตรเข้มข้น', 'ชาไทยดั้งเดิม ต้มสด ชงเข้มข้น หอมมันกลมกล่อมด้วยนมสดแท้', 35.00, 'drink', 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80'),
('น้ำมะนาวอัญชัน', 'น้ำอัญชันสีม่วงครามสดใส ผสมน้ำมะนาวแท้รสเปรี้ยวอมหวาน ดับกระหายคลายร้อนได้อย่างดี', 35.00, 'drink', 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80');
```

4. **การสร้างบัญชีผู้เข้าใช้งานของพนักงาน (Staff Auth Setup)**:
   - ไปที่แถบเมนู **Authentication** -> **Users** ของ Supabase
   - กดปุ่ม **Add User** -> **Create User**
   - กรอกอีเมล (เช่น `admin@restaurant.com`) และรหัสผ่านที่พนักงานต้องการใช้งาน (สามารถใช้อีเมลและรหัสผ่านนี้ล็อกอินหลังบ้านได้จริงทันที)

---

## 🛠️ ขั้นตอนการเอาโค้ดขึ้น GitHub (Repository: `Apichai`)

คุณสามารถนำโปรเจกต์นี้ขึ้นสู่บัญชี GitHub ส่วนตัวของคุณได้ด้วยวิธีง่ายๆ 2 รูปแบบ:

### วิธีการที่ 1: ลากและวางหน้าเว็บ GitHub (ง่ายและไม่ต้องติดตั้งโปรแกรมเพิ่ม)
1. เข้าเว็บไซต์ [GitHub](https://github.com) และเข้าสู่ระบบบัญชีของคุณ
2. กดสร้าง Repository ใหม่ตั้งชื่อว่า `Apichai` (ตั้งค่าเป็น Public หรือ Private ก็ได้ตามสะดวก)
3. เมื่อสร้างเสร็จสิ้น จะมีลิงก์แนะนำ ให้คลิกหัวข้อ **"uploading an existing file"**
4. เปิดโฟลเดอร์ของแอปพลิเคชันนี้ขึ้นมาในเครื่อง และลากไฟล์ทั้งหมดไปวางลงในเบราว์เซอร์ของหน้าเว็บ GitHub:
   - `index.html`
   - `style.css`
   - `config.js`
   - `mockData.js`
   - `supabase.js`
   - `app.js`
   - `README.md`
5. รออัปโหลดเสร็จ จากนั้นกดปุ่ม **Commit changes**

---

### วิธีการที่ 2: ใช้คำสั่ง Git ใน VS Code หรือ Terminal ของเครื่องคุณ
เปิด Command Prompt หรือ Terminal ขึ้นมาในโฟลเดอร์โครงการ จากนั้นพิมพ์คำสั่งตามลำดับด้านล่างนี้:
```bash
# 1. เริ่มต้นสร้าง Local Git Repository
git init

# 2. เพิ่มไฟล์ทั้งหมดเข้าสู่สเตจเตรียมส่ง
git add .

# 3. Commit บันทึกเวอร์ชันแรก
git commit -m "Initialize Apichai Restaurant App"

# 4. ตั้งชื่อกิ่งหลักเป็น main
git branch -M main

# 5. เชื่อมต่อ Git โฮสต์ไปยัง GitHub ของคุณ (แทนที่ USERNAME ด้วยชื่อจริงของคุณ)
git remote add origin https://github.com/USERNAME/Apichai.git

# 6. อัปโหลดไฟล์ขึ้นสู่คลาวด์ GitHub
git push -u origin main
```

---

## 🌐 ขั้นตอนการเผยแพร่เว็บขึ้น Vercel (Vercel Deployment)

เนื่องจากเว็บนี้เป็นแอปพลิเคชันฝั่ง Client 100% (Static Site) การเผยแพร่บน Vercel จึงทำได้เร็วมากภายในเวลาไม่ถึง 1 นาที:

1. สมัครใช้งานหรือเข้าสู่ระบบที่ [Vercel](https://vercel.com) (แนะนำให้กดเชื่อมต่อด้วยบัญชี GitHub เพื่อความสะดวก)
2. เมื่ออยู่ในหน้าหลักของ Vercel ให้กดปุ่ม **Add New** -> **Project**
3. ภายใต้หัวข้อ **"Import Git Repository"** ให้หาและกดเลือกโปรเจกต์ที่ชื่อ `Apichai` แล้วกดปุ่ม **Import**
4. **การตั้งค่าโปรเจกต์ (Project Settings)**:
   - Vercel จะตรวจพบไฟล์หน้าแรกเป็น HTML5 อัตโนมัติ (ไม่จำเป็นต้องเปลี่ยนค่า Build Commands หรือ Install Commands ใดๆ)
   - ปล่อยค่าเริ่มต้นไว้ทั้งหมด
5. กดปุ่ม **Deploy**
6. เสร็จเรียบร้อย! ระบบจะส่งลิงก์โดเมนเข้าใช้งานเว็บจริงให้คุณทันที (เช่น `apichai-restaurant.vercel.app`)

---

## ⚙️ วิธีการเชื่อมต่อฐานข้อมูลจากหน้าเว็บที่ Deploy แล้ว
1. เข้าไปที่หน้าเว็บที่ Deploy บน Vercel สำเร็จแล้ว
2. สังเกตแถบด้านบนจะมีคำว่า **Demo Mode** ให้คลิกที่แถบนั้น (หรือคลิกรูปฟันเฟือง ⚙️)
3. ระบบจะเปิดหน้าต่างโมดอลตั้งค่าขึ้นมา ให้กรอก **Project URL** และ **Anon Key** ที่ได้มาจากหน้าแดชบอร์ดตั้งค่า API ของ Supabase
4. กดปุ่ม **บันทึกการเชื่อมต่อ (Save)**
5. แถบแจ้งสถานะจะเปลี่ยนเป็น **Live (Supabase)** และระบบทั้งหมดจะดึงข้อมูลเมนู ล็อกอินพนักงาน และอัปเดตสถานะออเดอร์จากฐานข้อมูลจริงของคุณทันที!
