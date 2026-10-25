# Dubai Food POS - Comprehensive Testing Checklist

Yeh checklist software ko end-to-end test karne ke liye banayi gayi hai. Har feature ko step-by-step test karein aur check karein ke sab theek kaam kar raha hai.

---

## 📋 1. Startup & Splash Screen (Software Launch)
- [ ] **App Launch:** Desktop icon ya shortcut se software open karein.
- [ ] **Splash Screen:** Splash screen smoothly load ho aur loading status display kare.
- [ ] **Main Window:** Splash screen band hone ke baad POS login / main screen maximize ho kar open ho.
- [ ] **Console Errors:** Koi fatal error ya crash na ho.

---

## 📦 2. Sync Queue & Database Space (Storage Optimization)
- [ ] **Cloud Sync Status:** Settings -> Synchronization me ja kar check karein ke Cloud Sync OFF hai.
- [ ] **Database Space:** Software run hone par `sync_queue` me naye orders ka bekar data accumulate na ho raha ho.
- [ ] **Offline Speed:** Internet disconnect hone par bhi software bina kisi rukawat ke fast chale.

---

## 👤 3. Customer Panel (Favourite OFF by Default & Temp Customers)
- [ ] **Default Checkbox State:** POS screen par customer add/edit karne ke liye dialog open karein.
  - *Expected:* "Save as Favourite" checkbox **by default UNCHECKED (OFF)** hona chahiye.
- [ ] **Normal Order without Favourite:**
  - Customer ka Name, Phone aur Address enter karein (checkbox ko UNCHECK hi rehne dein).
  - Order punch karein aur print nikaalein.
  - *Expected:* Receipt par customer ka name aur phone print hona chahiye.
  - Customers management screen me check karein — yeh temporary customer permanent database list ko bloat nahi karega.
- [ ] **Save as Favourite Customer (When explicitly checked):**
  - Customer panel open karein, name aur phone daalein aur "Save as Favourite" par **tick lagayein**.
  - Save karein.
  - *Expected:* Customer permanently save hona chahiye aur dobara phone number type karne par autocomplete suggestion aana chahiye.

---

## 🍽️ 4. Order Types & Table Management
- [ ] **Dine-In Order:**
  - Table select karein (maslan Table 1).
  - Items cart me add karein aur order save / KOT print karein.
  - *Expected:* Table green/occupied show ho.
- [ ] **Order Type Switch (Dine-In to Takeaway):**
  - Wohi order open karein aur type change kar ke "Takeaway" ya "Delivery" karein.
  - *Expected:* Purani table automatically release (free/green) ho jani chahiye, table stuck nahi honi chahiye.
- [ ] **Table Switch:**
  - Ek occupied table ko doosri khali table par shift karein.
  - *Expected:* Purani table free ho jaye aur nayi table occupied ho jaye.
- [ ] **Takeaway & Delivery Orders:**
  - Takeaway aur Delivery orders place karein. Delivery me rider select karein.
  - Checkout smoothly complete ho aur table occupied na ho.

---

## 💰 5. Cart, Discounts & Checkout
- [ ] **Item Addition:** Categories switch kar ke items add karein, variants aur add-ons select karein.
- [ ] **Discounts:**
  - Item level discount aur full order flat/percentage discount apply karein.
  - *Expected:* Calculation 100% accurate ho aur total bilkul sahi bane.
- [ ] **Payment Methods:**
  - Cash payment se checkout karein.
  - Card payment se checkout karein.
  - Split payment (Cash + Card) test karein.
  - *Expected:* Payment instantly record ho aur order complete ho kar nayi cart ready ho jaye.

---

## 🖨️ 6. Printing System & Thermal Printer
- [ ] **Receipt Print:**
  - Order complete hone par thermal receipt print ho.
  - Check karein header, logo, customer name, items, tax, discount aur footer theek print ho rahe hain.
- [ ] **Kitchen Slip (KOT):**
  - KOT print trigger karein aur verify karein ke kitchen slip fast aur bina dialog ke silent print ho rahi hai.
- [ ] **Reprint Order:**
  - Orders history me ja kar kisi purane order ka "Reprint Receipt" karein.
  - *Expected:* Receipt foran reprint ho jaye.

---

## 📊 7. Dashboard & Orders History (Performance Test)
- [ ] **Dashboard Loading Speed:**
  - Dashboard par click karein.
  - *Expected:* Dashboard page instantly load ho (koi lag ya freeze na ho kyunki ab sirf aaj ke active orders load hote hain).
- [ ] **Today's Stats:**
  - Sales total, active orders count, aur payment summaries check karein.
- [ ] **Orders Screen:**
  - Orders list screen open karein.
  - *Expected:* Orders ki list bina loading delay ke open ho aur order expand karne par items aur payment details foran nazar aayein.

---

## 💾 8. Backup & Restore System
- [ ] **Create Backup:**
  - Settings -> Backup me ja kar manual backup create karein.
  - *Expected:* Backup `.zip` file successfully create ho.
- [ ] **Restore Safety:**
  - Backup restore karne par database clean load ho aur live WAL/SHM file theek se reset ho jaye.

---

## 🚪 9. Software Close & Process Termination (Crucial Test)
- [ ] **Close via Close Button (X):**
  - Software ko top-right close button (X) se close karein.
- [ ] **Task Manager Check:**
  - Keyboard se `Ctrl + Shift + Esc` daba kar **Windows Task Manager** open karein.
  - "Details" ya "Processes" tab me check karein:
    - [ ] `powershell.exe` (Print worker) band ho chuka ho.
    - [ ] `node.exe` (Backend process) band ho chuka ho.
    - [ ] `Restaurant POS.exe` / `Electron` process mukammal band ho chuka ho.
  - *Expected Result:* Background me koi bhi lingering ya atka hua process nahi hona chahiye!
