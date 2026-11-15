# LedgerGuard – Frontend-Backend Integration Specification

**Author:** Shraddha Mahendra Wagh (Frontend Developer)  
**Team Responsibility:** Coordination between Frontend and Backend Modules  
**Last Updated:** Day 1 (2026-11-12)  

---

## 1. Overview & Current Status

LedgerGuard operates as a dynamic, multi-tenant billing platform. The frontend requires clear RESTful or RPC contracts to communicate with the backend services.

### Current Backend Status (from repository inspection)
- Backend is initialized in `backend/` by teammate Sai Sri / Vinay.
- Uses **Node.js, TypeScript, Mongoose, and MongoDB**.
- Current backend implementation contains:
  - `mongo.connection.ts`: Database connection handler.
  - `tenant.model.ts`: Tenant mongoose schema (`tenantId`, `databaseName`, `status: "active" | "inactive"`).
  - `tenant.service.ts`: Basic tenant operations.
- **Pending Backend Deliverables:**
  - HTTP Server layer (Express/Fastify API server with route handlers).
  - Authentication & JWT issuance (tenant-scoped).
  - REST endpoints for Invoices, Customers, Subscriptions, and Transactions.
  - Zero-Knowledge cryptographic verification endpoints or proof generation service.

---

## 2. API Contract Specification for Backend Teammates

To ensure seamless integration, the frontend service layer (`src/services/`) will be architected around the following endpoint specifications. Until live endpoints are running, the frontend uses TypeScript mock adapters conforming exactly to these contracts.

### 2.1 Authentication & Tenant Context
All authenticated requests must include the header:
```http
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_id>
```

#### `POST /api/v1/auth/login`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "tenantId": "tenant-corp-01"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "usr_01",
      "name": "Shraddha Wagh",
      "email": "user@example.com",
      "role": "admin"
    },
    "tenant": {
      "id": "tenant-corp-01",
      "name": "Acme Global Financials",
      "status": "active"
    }
  }
  ```

---

### 2.2 Tenants & Organizations

#### `GET /api/v1/tenants`
- **Response (200 OK):**
  ```json
  [
    {
      "tenantId": "tenant-corp-01",
      "name": "Acme Global Financials",
      "databaseName": "ledgerguard_tenant_acme",
      "status": "active",
      "createdAt": "2026-11-01T00:00:00.000Z"
    }
  ]
  ```

---

### 2.3 Dashboard Metrics

#### `GET /api/v1/dashboard/metrics`
- **Response (200 OK):**
  ```json
  {
    "totalRevenue": 142850.00,
    "revenueChangeMonthOverMonth": 12.4,
    "totalInvoices": 328,
    "paidInvoices": 294,
    "pendingInvoices": 26,
    "overdueInvoices": 8,
    "monthlyRevenue": [
      { "month": "Jun", "revenue": 18200 },
      { "month": "Jul", "revenue": 21400 },
      { "month": "Aug", "revenue": 24800 },
      { "month": "Sep", "revenue": 22900 },
      { "month": "Oct", "revenue": 27300 },
      { "month": "Nov", "revenue": 28250 }
    ]
  }
  ```

---

### 2.4 Invoices

#### `GET /api/v1/invoices`
- **Query Params:** `?page=1&limit=10&status=all&search=`
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "INV-2026-001",
        "customerName": "Vertex Technologies",
        "customerId": "cust_101",
        "amount": 4200.00,
        "currency": "USD",
        "status": "paid",
        "dueDate": "2026-11-20",
        "createdAt": "2026-11-05",
        "zkProofStatus": "verified"
      }
    ],
    "pagination": {
      "total": 328,
      "page": 1,
      "pages": 33
    }
  }
  ```

#### `POST /api/v1/invoices`
- **Request Body:**
  ```json
  {
    "customerId": "cust_101",
    "dueDate": "2026-11-30",
    "currency": "USD",
    "items": [
      {
        "description": "Enterprise Cloud Tier - Nov 2026",
        "quantity": 1,
        "unitPrice": 3500.00
      },
      {
        "description": "Dedicated Audit Node Addon",
        "quantity": 1,
        "unitPrice": 700.00
      }
    ],
    "notes": "Payment due within 15 days"
  }
  ```

---

### 2.5 Zero-Knowledge Privacy Verification

#### `GET /api/v1/zk/verify/:invoiceId`
- **Response (200 OK):**
  ```json
  {
    "invoiceId": "INV-2026-001",
    "isVerified": true,
    "zkProofHash": "0x7f9a2c...b81e4d",
    "verificationTimestamp": "2026-11-12T10:15:30Z",
    "privacyGuarantee": "Billing amount validated against blinded cryptographic commitments without exposing itemized business logic."
  }
  ```

---

## 3. Integration Action Items & Teammate Checklist

| Module | Responsible Teammate | Frontend Requirement | Status |
|:---|:---:|:---|:---:|
| Tenant Schema & DB | Vinay / Sai Sri | Connect tenant model to REST API | In Progress (Backend Model Ready) |
| HTTP API Server | Backend Team | Express server setup, CORS configuration | Pending Backend Action |
| Auth & JWT | Backend Team | Login endpoint + Bearer token verification | Pending Backend Action |
| Invoice Routes | Backend Team | CRUD operations on Invoices | Pending Backend Action |
| ZK Primitives | Security / ZK Lead | Proof generation & validation endpoint | Pending Backend Action |
| Frontend Service Layer | Shraddha Wagh | Build client with mock fallbacks | Ready / Designing |
