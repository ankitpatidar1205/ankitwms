# WMS Flow (Warehouse → Product → Inventory → Purchase → Sales)

Tere hisaab se system ka flow — step by step.

---

## 1. Setup (Pehle ye karo)

```
Company (ek company create)
    │
    ├── Warehouses (kam se kam 1 warehouse)
    │       └── Zones → Locations (optional, for bin/rack)
    │
    ├── Categories (product categories)
    ├── Suppliers (jisse saman khareedoge)
    ├── Customers / Clients (jinko bechoge)
    │
    └── Users (Company Admin, Warehouse Manager, etc.)
```

**Order:** Company → Warehouses (→ Zones → Locations) → Categories → Suppliers → Products.

---

## 2. Warehouse → Zone → Location

| Step | Kya karna | Kahan (UI) |
|------|-----------|------------|
| 1 | Warehouse banao | **Warehouses** → Add Warehouse |
| 2 | Us warehouse ke andar Zones (e.g. A, B, C) | **Warehouses** → Zones → Add Zone |
| 3 | Har zone ke andar Locations (e.g. A-01, A-02) | **Warehouses** → Locations → Add Location |

**Flow:** `Company → Warehouse → Zone → Location`  
Stock (ProductStock) warehouse level pe rehta hai; optional: location bhi link ho sakta hai.

---

## 3. Product

| Step | Kya karna | Kahan (UI) |
|------|-----------|------------|
| 1 | Category banao (e.g. Electronics, FMCG) | **Products** → Categories (ya Settings) |
| 2 | Supplier add karo | **Suppliers** → Add Supplier |
| 3 | Product banao (name, SKU, category, supplier) | **Products** → Add Product |

**Flow:** `Company → Category` + `Supplier` → **Product**  
Product ab master data hai; abhi tak quantity (inventory) 0 hai.

---

## 4. Inventory (Stock kahan rehta hai)

Stock **ProductStock** table mein rehta hai: **Product + Warehouse (+ optional Location)** = quantity.

| Kya | Kahan dikhega |
|-----|----------------|
| Stock list (product, warehouse, quantity) | **Sidebar → Stock Overview** (Inventory) |
| Product ki total stock | **Products** page → Stock column |
| Low/Out of stock | **Stock Overview** → tabs (In Stock / Low Stock / Out of Stock) |

**Stock kab badhta hai:**
- **Goods Receiving complete** karoge → received qty **ProductStock** mein add (company ke pehle warehouse par).
- **Inventory Adjustment** → manually + / − quantity.
- **Returns** (agar implement ho) → wapas stock add.

**Stock kab ghatta hai:**
- **Sales Order** → Pick → Pack → Ship (agar backend stock deduct karta ho).
- **Inventory Adjustment** → minus.
- **Movement** (location to location).

---

## 5. Purchase Order → Goods Receipt → Uske baad kya? (Full flow)

**PO bana → GR bani → uske baad ye flow hota hai:**

```
1. Purchase Order (PO) banao
   → Supplier select, products + quantities add, Save
   → PO status: Draft

2. PO Approve karo
   → Purchase Orders → Approve
   → PO status: Approved (ab is PO pe GR bana sakte ho)

3. Goods Receipt (GR) banao
   → Goods Receiving → Receive Goods → PO select karo → Create GRN
   → GRN number milta hai (GRN001, GRN002…)
   → GR status: Pending

4. Receive items karo
   → Goods Receiving → GR pe "Receive" click → har line pe Received Qty daalo (partial ya full)
   → Save & Update
   → Backend: jo qty receive ki, woh Inventory (ProductStock) mein add ho jati hai
   → GR status: In Progress (partial) ya Completed (sab receive)

5. Uske baad kya hota hai?
   → Stock Inventory mein dikhta hai (Stock Overview / Products → Stock column)
   → Ab ye stock use ho sakta hai:
      • Sales Order — customer ko bechne ke liye (Sales Orders → Create → pick/pack/ship)
      • Manual dekhna — Inventory (Stock Overview), Products page
      • Inventory Adjustment — manually + / −
      • Replenishment — location to location move (agar use karo)
```

**Short:** PO → Approve → GR banao → Receive (qty daalo, Save) → **Stock auto-update** → wahi stock Sales / Inventory / Adjustment mein use hota hai.

| Step | Kya karna | Kahan (UI) |
|------|-----------|------------|
| 1 | Supplier add | **Suppliers** → Add |
| 2 | PO banao (supplier, products, qty) | **Purchase Orders** → Create |
| 3 | PO Approve | **Purchase Orders** → Approve |
| 4 | GR banao (PO select) | **Goods Receiving** → Receive Goods → PO select → Create GRN |
| 5 | Receive (qty + Good/Damaged) | **Goods Receiving** → Receive → Save & Update |
| 6 | Stock check | **Stock Overview** (Inventory) ya **Products** → Stock column |

**Important:** Kam se kam **1 Warehouse** hona chahiye; receive karte hi stock **existing inventory record** mein add hota hai (naya row nahi banta).

---

## 6. Sales Order → Quantity kab minus hogi? (SO banate hi ya Delivered ke baad?)

**Answer: Quantity minus Delivered (ya Shipped) ke baad honi chahiye — SO banate hi nahi.**

| Kab minus karein? | Kya hota hai |
|-------------------|--------------|
| **SO banate hi** | Order cancel hone par stock wapas add karna padega; available stock confusing. |
| **Delivered / Shipped ke baad** | Jab actually goods nikal chuke, tab stock reduce — sahi flow. |

**Flow:**

```
Sales Order (SO) banao → Pick → Pack → Shipment banao
    │
    ▼
Shipment ka delivery status = SHIPPED ya DELIVERED karo
    │
    ▼
Tab backend: order ki items ki quantity ProductStock se minus karega
    │
    ▼
Stock Overview / Products me quantity kam dikhegi
```

**Short:** SO banate hi quantity **nahi** ghatani; **Delivered (ya Shipped)** mark karte hi quantity minus hoti hai.

---

## 7. Flow Summary (Ek line mein)

| Module      | Flow |
|------------|------|
| **Warehouse** | Company → Warehouse → Zone → Location |
| **Product**   | Company → Category + Supplier → Product |
| **Inventory** | Product + Warehouse → ProductStock (quantity). Stock Overview / Products se dekho. |
| **Purchase**  | Supplier → PO (Approve) → Goods Receiving → Receive → **Stock add (ProductStock)** |
| **Sales**     | Customer → SO → Pick → Pack → Shipment → **Delivered/Shipped pe stock minus** |

---

## 8. Database (Backend) — jahan data rehta hai

| Concept        | Table(s) |
|----------------|----------|
| Warehouse      | `warehouses`, `zones`, `locations` |
| Product        | `categories`, `products` |
| Inventory      | `product_stocks` (productId, warehouseId, quantity) |
| Purchase       | `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items` |
| Stock update   | GR complete → `product_stocks.quantity` increase (GOOD qty only) |
| Sales          | `customers`, `sales_orders`, `order_items`, `pick_lists`, `packing_tasks`, `shipments` |

---

**Short:**  
**Warehouse** = jagah (building → zones → locations).  
**Product** = cheez (name, SKU, category, supplier).  
**Inventory** = wahi cheez kitni hai (ProductStock = product + warehouse + quantity).  
**Purchase** = supplier se order (PO) → receive (GR) → jitna receive kiya (GOOD), utna **inventory (Stock Overview / Products)** mein add.

---

## 9. Inventory ke saare modules ka flow (Stock Overview + sub-pages)

Inventory section mein ye sab modules hain — har ek kya karta hai aur kaise flow karta hai.

### 9.1 Overview (Stock Overview) — `/inventory`

| Kya hai | Kahan | Flow |
|--------|--------|------|
| **Stock Overview** | Sidebar → **Inventory** → **Overview** | Saari **ProductStock** (product + warehouse + location + quantity) ek jagah dikhti hai. In Stock / Low Stock / Out of Stock tabs se filter kar sakte ho. |

**Data:** `product_stocks` table (productId, warehouseId, locationId, quantity, reserved).  
**Stock yahan kaise aata hai:** GR complete → add; Shipment Delivered/Shipped → minus; Adjustment → +/−; Movement → location se location.

---

### 9.2 By Best Before Date — `/inventory/by-best-before-date`

| Kya hai | Flow |
|--------|------|
| **By Best Before Date** | Stock ko **best-before / expiry date** ke hisaab se dekhte ho. FEFO (First Expiry First Out) planning ke liye. |

**Use:** Expiry wale products (F&B, pharma) ko date ke hisaab se dekhna / pick karna.

---

### 9.3 By Location — `/inventory/by-location`

| Kya hai | Flow |
|--------|------|
| **By Location** | Stock **warehouse → zone → location** ke hisaab se dikhta hai. Konse location pe kitna stock hai, wahi view. |

**Use:** Pick path, replenishment, cycle count — sab location-level stock dekh ke karte ho.

---

### 9.4 Adjustments — `/inventory/adjustments`

| Kya hai | Flow |
|--------|------|
| **Adjustments** | **Manual + / −** quantity. Reason (damage, found, count correction, etc.) daal kar **ProductStock** update hota hai. |

**Flow:**

```
Inventory → Adjustments → New Adjustment
   → Product + Warehouse (optional Location) select
   → Quantity change (+ increase, − decrease)
   → Reason select/enter
   → Save
   → ProductStock.quantity update
```

**Kab use:** Damage, stock found, count correction, write-off, opening balance.

---

### 9.5 Cycle Counts — `/inventory/cycle-counts`

| Kya hai | Flow |
|--------|------|
| **Cycle Count** | **Physical count** karte ho (location/warehouse/product); system count se **compare** karke variance nikalte ho. Variance fix karne ke liye **Adjustment** bana sakte ho. |

**Flow:**

```
Inventory → Cycle Counts → Create Cycle Count
   → Warehouse / Location / Product scope choose
   → Count karo (physical)
   → Enter counted quantity
   → System quantity vs counted → variance
   → Variance resolve (adjustment create) → Stock correct
```

**Use:** Stock accuracy maintain karna bina full shutdown kiye.

---

### 9.6 Batches — `/inventory/batches`

| Kya hai | Flow |
|--------|------|
| **Batches** | **Batch/Lot** level pe stock (batch number, manufacture/expiry date). Batch track karte ho — konsa batch kahan hai, kab expire hoga. |

**Flow:**

```
Batch create → Batch number + product + warehouse (+ location)
   → Quantity, manufacture date, expiry (optional)
   → GR / Adjustment se batch stock add
   → Sales/Pick pe batch select (FEFO) ya batch-wise dispatch
```

**Use:** Traceability, expiry, recall, FEFO.

---

### 9.7 Movements — `/inventory/movements`

| Kya hai | Flow |
|--------|------|
| **Movements** | **Location se location** (ya warehouse to warehouse) stock **move**. From Location → To Location, quantity. Isse **ProductStock** source location se minus, destination pe add. |

**Flow:**

```
Inventory → Movements → Create Movement
   → Product select
   → From Warehouse / From Location
   → To Warehouse / To Location
   → Quantity
   → Save
   → Source location stock − ; Destination location stock +
```

**Use:** Replenishment (bulk → pick face), transfer between warehouses, internal moves.

---

### 9.8 Ek line mein — Inventory modules flow summary

| Module | Route | Kya karta hai |
|--------|--------|----------------|
| **Overview** | `/inventory` | Saari stock dikhao, In/Low/Out of Stock |
| **By Best Before Date** | `/inventory/by-best-before-date` | Stock expiry date ke hisaab se |
| **By Location** | `/inventory/by-location` | Stock warehouse/zone/location wise |
| **Adjustments** | `/inventory/adjustments` | Manual +/− quantity, reason ke sath |
| **Cycle Counts** | `/inventory/cycle-counts` | Physical count → variance → adjustment |
| **Batches** | `/inventory/batches` | Batch/lot level stock, expiry, traceability |
| **Movements** | `/inventory/movements` | Location to location stock move |

---

### 9.9 Stock kab badhta / ghatta hai (recap)

| Stock badhta hai | Stock ghatta hai |
|------------------|-------------------|
| **Goods Receiving** (GR) complete → GOOD qty add | **Shipment** Delivered/Shipped → order qty minus |
| **Adjustment** (+ quantity) | **Adjustment** (− quantity) |
| **Return** (RMA approved → wapas stock) | **Movement** (source location se minus) |
| **Movement** (destination location pe add) | — |
