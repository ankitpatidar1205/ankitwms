# Product Requirement Document (PRD): Warehouse Management System (WMS)

## 1. Executive Summary
The WMS is a comprehensive web-based platform designed to manage end-to-end warehouse operations, including multi-tenancy support for different companies, real-time inventory tracking, specialized user dashboards, and AI-driven reorder predictions. The system aims to provide precision in stock management from procurement (Inbound) to fulfillment (Outbound).

---

## 2. Target User Roles & Dashboards

The system implements a role-based access control (RBAC) model with five distinct dashboards tailored to specific operational needs.

### 2.1. Super Admin Dashboard (Top Level)
**Purpose:** Overarching management of the entire platform and SaaS instance.
- **Key Features:**
    - **Company Management:** Create, update, and monitor different client companies (tenants).
    - **Global Analytics:** View total system usage, active companies, and performance metrics.
    - **User Administration:** High-level control over all users across all companies.
    - **System Health:** Server status and log monitoring.

### 2.2. Company Admin Dashboard (Business Owner Level)
**Purpose:** Management of a specific company's warehouses, staff, and overall performance.
- **Key Features:**
    - **Warehouse Configuration:** Add and configure physical warehouses.
    - **Staff Management:** Create accounts for managers, pickers, and packers within their company.
    - **Financial Overview:** View sales trends, top-selling products, and revenue analytics.
    - **Strategic Reports:** Access company-wide inventory and performance reports.

### 2.3. Warehouse Manager Dashboard (Operations Level)
**Purpose:** Day-to-day management of a specific warehouse location.
- **Key Features:**
    - **Inventory Monitoring:** Real-time visibility of stock levels in their assigned warehouse.
    - **Location/Zone Management:** Define aisles, racks, shelves, and bins (Physical Layout).
    - **Task Oversight:** Monitor pending pick lists, packing tasks, and incoming goods receipts.
    - **Capacity Planning:** Manage warehouse space utilization (Planned feature).

### 2.4. Inventory Manager Dashboard (Stock Specialist Level)
**Purpose:** Ensuring stock accuracy and procurement efficiency.
- **Key Features:**
    - **Product Master:** Manage product details, SKUs, and pricing.
    - **Smart Reorder:** Utilize the AI Prediction system to identify stockout risks.
    - **Purchase Orders:** Create and manage procurement requests from suppliers.
    - **Goods Receiving:** Process incoming shipments and update stock levels.
    - **Stock Adjustments:** Perform cycle counts and manual stock corrections.

### 2.5. Picker/Packer Dashboard (Execution Level)
**Purpose:** High-efficiency interface for mobile or desktop task execution.
- **Key Features:**
    - **Pick Lists:** View prioritized lists of items to be picked from specific locations.
    - **Packing Interface:** Verify picked items and prepare them for shipment.
    - **Barcode Support:** Rapid verification of SKUs during task execution.
    - **Assignment Management:** Track individual productivity and assigned tasks.

---

## 3. Core Modules & Menu Navigation

### 3.1. Dashboard (The Command Center)
- **Visual Analytics:** Real-time charts showing Sales Trends, Stock Health, and Pending Tasks.
- **Quick Links:** Access to most frequent actions like "Add Inventory" or "Create Order".

### 3.2. Inventory Management
- **All Items View:** Table view of all stock with filters (In Stock, Low Stock, Out of Stock).
- **Stock Status Tags:** Clear color-coded visibility (Green: Healthy, Orange: Low, Red: Critical).
- **Last Movement Tracking:** Timestamped records of the last update to any stock item.
- **Stock Adjustments:** Module to manually increase, decrease, or move stock.

### 3.3. Product Master
- **Detailed Attributes:** SKU, Barcode, Color, Dimensions, Weight, Category.
- **Pricing:** Tracking of Cost Price vs. Selling Price.
- **Supplier Link:** Association of products with specific vendors.

### 3.4. Purchase & Inbound
- **Suppliers:** Database of vendors with contact details and terms.
- **Purchase Orders (PO):** Multi-stage workflow (Draft -> Approved -> Received).
- **Goods Receipt Note (GRN):** Interface to record physical receipt of items against a PO.

### 3.5. Sales & Outbound
- **Customers:** Management of buyer profiles and history.
- **Sales Orders:** Interface for manual order entry or bulk import.
- **Pick Lists:** System-generated lists optimized for warehouse traversal.
- **Packing Tasks:** Quality check step before dispatch.
- **Shipments:** Final stage where tracking numbers are added and stock is officially deducted.

### 3.6. Smart Reorder (AI Predictions)
- **Sales Velocity:** Automatic calculation of units sold per day (based on 30-day history).
- **Risk Analysis:** Prediction of "Days Left" until a product hits zero stock.
- **Suggestion Engine:** Automatic calculation of reorder quantity based on lead times and safety stock.

### 3.7. Reports & Analytics
- **Dynamic Reports:** Generate PDF/CSV reports for Inventory, Performance, and Orders.
- **Automated Scheduling:** Set reports to be generated Daily, Weekly, or Monthly.

---

## 4. Standard Operating Procedures (Process Flows)

### 4.1. Inbound Flow (Procurement)
1.  **Inventory Manager** identifies a need (via Smart Reorder) and creates a **Purchase Order**.
2.  **PO** is approved by the **Company Admin**.
3.  When the shipment arrives, the **Warehouse Manager** creates a **Goods Receipt Note**.
4.  **Warehouse Staff** verifies the quantity and quality.
5.  Upon saving the GRN, the **ProductStock** is automatically increased.

### 4.2. Outbound Flow (Fulfillment)
1.  **Sales Order** is received and enters `CONFIRMED` status.
2.  System generates a **Pick List** based on product locations.
3.  A **Picker** retrieves items from shelves and marks them as **PICKED**.
4.  A **Packer** double-checks items and moves the order to **PACKED** status.
5.  A **Shipment** is created. When marked as **SHIPPED**, the inventory is officially **DEDUCTED** from the system.

### 4.3. Internal Flow (Warehouse Quality)
1.  **Movements:** Stock is moved from "Receiving Area" to "Bulk Storage" via the Inventory Transfer interface.
2.  **Cycle Counting:** Periodic manual counts are recorded. If a discrepancy exists (e.g., system says 10, physical is 9), an **Adjustment** is created to sync the system.

---

## 5. Technical Specification

- **Frontend:** React (Vite) + Ant Design (UI) + Tailwind CSS.
- **Backend:** Node.js (Express) using a RESTful API architecture.
- **Database:** Sequelize ORM with MySQL support for production-grade data integrity.
- **Performance:** Optimized indexing on SKUs and Batch numbers for millisecond-level lookups.
- **Multi-tenancy:** Strict `companyId` filtering at the Service layer to ensure total data isolation between clients.

---

## 6. Future Enhancements (Roadmap)
- **Mobile App:** Native Android/iOS app for barcode scanning in the aisles.
- **Integration:** APIs for Shopify, Amazon, and WooCommerce synchronization.
- **Logistics:** Real-time integration with shipping carriers (FedEx, UPS, DHL).
- **Advanced Forecasting:** Using machine learning for seasonal demand prediction.
