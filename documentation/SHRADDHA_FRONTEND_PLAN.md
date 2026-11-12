# LedgerGuard - Frontend Development Master Plan (28 Days)

**Intern:** Shraddha Mahendra Wagh  
**Role:** Associate L1 Intern (Web Development)  
**Company:** Infotact Solutions  
**Project:** LedgerGuard – Dynamic Multi-Tenant Zero-Knowledge Billing Engine  
**Assigned Responsibility:** Frontend Development & UI/UX Design  
**Target Git Branch:** `shraddha`  
**Contribution Target:** At least 20 meaningful GitHub contribution days across 28 days  

---

## 1. Executive Summary & Project Objective

LedgerGuard is an enterprise financial SaaS platform providing a dynamic, multi-tenant billing engine with zero-knowledge (ZK) privacy assurances. The application serves multi-tenant organizations that need transparent, automated subscription and billing workflows while guaranteeing data isolation and cryptographic privacy over proprietary billing transactions.

As the dedicated Frontend Developer on this 4-member engineering team:
- **My Focus:** Building a responsive, high-fidelity, human-designed financial SaaS web application.
- **Teammates:** Responsible for backend microservices, MongoDB database integration, multi-tenant routing, and cryptographic zero-knowledge primitives.
- **Design Philosophy:** Clean, restrained, highly functional financial dashboard (avoiding stereotypical AI gradients, glowing borders, or arbitrary animations). Focus on clarity, consistent typography, natural visual hierarchy, subtle slate borders, and practical usability.

---

## 2. Technical Stack & Architecture

### 2.1 Technology Stack
- **Framework & Runtime:** React 19 + TypeScript (strict typing)
- **Build Tool:** Vite (fast HMR, optimized bundle splitting)
- **Styling:** Tailwind CSS (utility-first, customized financial SaaS palette)
- **Routing:** React Router v7 / v6 (declarative protected & public routes)
- **Iconography:** Lucide React (standardized, minimalist financial & system icons)
- **Data Visualization:** Recharts (accessible, responsive revenue & transaction charts)
- **State Management & Services:** Modular service layer with clean separation between UI components, mock fallbacks, and live backend API clients.

### 2.2 Frontend Directory Structure
```
frontend/
├── public/                 # Static assets, branding logos, favicon
├── src/
│   ├── assets/             # Vector icons, illustration graphics
│   ├── components/         # Reusable UI primitives
│   │   ├── common/         # Buttons, Input, Modal, Dropdown, Badges, Tabs
│   │   ├── layout/         # Header, Sidebar, TenantSelector, UserMenu
│   │   ├── dashboard/      # StatCard, RevenueChart, QuickActions, ActivityFeed
│   │   ├── invoices/       # InvoiceTable, InvoiceForm, StatusBadge
│   │   ├── customers/      # CustomerTable, CustomerModal, FilterBar
│   │   └── zk/             # ZkProofBadge, PrivacyAuditModal
│   ├── layouts/            # DashboardLayout, AuthLayout, PublicLayout
│   ├── pages/              # Routed views
│   │   ├── landing/        # Product landing page & feature showcase
│   │   ├── auth/           # Login, Register, Forgot Password
│   │   ├── dashboard/      # Central metrics & overview
│   │   ├── invoices/       # Invoice management & generation
│   │   ├── customers/      # Tenant customer records
│   │   ├── subscriptions/  # Subscription plans & billing cycles
│   │   ├── transactions/   # Transaction ledger & payment statuses
│   │   ├── reports/        # Financial analytics & exportable reports
│   │   ├── tenants/        # Multi-tenant organization switcher & settings
│   │   └── settings/       # Profile, Security, ZK privacy controls
│   ├── services/           # API integration layer & mock fallbacks
│   │   ├── api.client.ts   # Axios/Fetch client with interceptors
│   │   ├── tenant.service.ts
│   │   ├── invoice.service.ts
│   │   ├── auth.service.ts
│   │   └── zk.service.ts
│   ├── types/              # Central TypeScript definitions
│   │   ├── tenant.ts
│   │   ├── invoice.ts
│   │   ├── customer.ts
│   │   ├── transaction.ts
│   │   └── auth.ts
│   ├── utils/              # Currency formatting, date helpers, validators
│   ├── App.tsx             # Root routing configuration
│   └── main.tsx            # Application entry point
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. 28-Day Development Timeline (20 Core Commit Days)

| Week | Day | Focus Area | Specific Deliverables |
|:---:|:---:|:---|:---|
| **W1** | **Day 1** | Project Setup & Architecture | Repository inspection, Git branch setup (`shraddha`), documentation creation, Vite React TS initialization. |
| **W1** | **Day 2** | UI Framework & Foundations | Tailwind CSS integration, design tokens (colors, typography, spacing), base CSS reset. |
| **W1** | **Day 3** | Core Design System Primitives | Reusable components: Button, Input, Card, Badge, Modal, Tooltip, EmptyState. |
| **W1** | **Day 4** | Application Layout & Shell | Responsive Sidebar, Top Navigation Bar, Tenant Selector dropdown, Breadcrumbs. |
| **W1** | **Day 5** | Marketing & Landing Page | Product value proposition, ZK privacy highlights, pricing tiers overview, responsive footer. |
| **W1** | **Day 6** | Authentication Interfaces | Tenant-aware Login, Registration, Password recovery, form validation, error states. |
| **W1** | **Day 7** | Dashboard Architecture | Dashboard grid layout, responsive containers, widget skeleton loaders. |
| **W2** | **Day 8** | Dashboard Financial Metrics | Metric cards (Total Revenue, Invoices, Paid/Pending ratio), monthly revenue area chart. |
| **W2** | **Day 9** | Invoice Management View | Invoices table, status badges (Paid, Pending, Overdue, Draft), action menus. |
| **W2** | **Day 10** | Invoice Creation Engine | Multi-item invoice builder, auto-calculating tax/discounts, client-side validation. |
| **W2** | **Day 11** | Customer Directory | Customer listing, search, status filter, customer detail view drawer. |
| **W2** | **Day 12** | Transaction History & Audit | Immutable transaction logs, payment status indicators, zero-knowledge verification proof hashes. |
| **W2** | **Day 13** | Subscription & Plan Management | Tier comparison cards, billing frequency switchers, plan upgrade/downgrade modals. |
| **W2** | **Day 14** | Universal Search & Filter Engine | Debounced search bar, date range picker, multi-attribute column filters. |
| **W3** | **Day 15** | Tenant & Organization Controls | Multi-tenant organization switcher, tenant isolation visual indicator, tenant metadata settings. |
| **W3** | **Day 16** | API Client & Service Layer | Unified HTTP client, mock-to-live toggle, error boundary handling, request interceptors. |
| **W3** | **Day 17** | Auth Guards & Route Protection | Protected route wrappers, session state persistence, redirect handlers. |
| **W3** | **Day 18** | Analytics & Reporting View | Revenue breakdown charts, export data utilities (CSV/PDF preview), billing trends. |
| **W3** | **Day 19** | Zero-Knowledge & Security View | Cryptographic proof verification status screen, data privacy toggles, audit trails. |
| **W3** | **Day 20** | User Profile & Tenant Settings | Account profile settings, API key management UI, notification preferences. |
| **W4** | **Day 21** | Comprehensive Mobile Responsiveness | Breakpoint testing, mobile navigation drawer, responsive tables with horizontal scroll indicators. |
| **W4** | **Day 22** | Form Validation & Edge Case Testing | Deep testing of boundary values, form error tooltips, resilient inputs. |
| **W4** | **Day 23** | UI Polish & Accessibility (a11y) | Keyboard navigation, ARIA attributes, contrast ratios, focus rings. |
| **W4** | **Day 24** | Loading, Error & Empty States | Skeleton loaders, offline fallbacks, friendly empty-state illustrations. |
| **W4** | **Day 25** | Teammate Backend Integration Sync | Real API synchronization with backend endpoints implemented by teammates. |
| **W4** | **Day 26** | Cross-Browser Verification | Safari, Chrome, Edge, and Firefox rendering validation; bundle optimization. |
| **W4** | **Day 27** | Documentation & Screenshots | Comprehensive internship presentation report, feature screenshots, architecture diagrams. |
| **W4** | **Day 28** | Final Presentation & Viva Prep | End-to-end user journey demonstration, review Q&A documentation, final code freeze. |

---

## 4. Quality Standards & Git Discipline

1. **Branch Isolation:** All commits exclusively on `shraddha`. Never push to `main`.
2. **Commit Hygiene:** Use conventional commits (`feat:`, `fix:`, `style:`, `docs:`, `refactor:`).
3. **Pre-commit Verification:** Every commit must pass `npm run build` with zero TypeScript or syntax errors.
4. **Clean Git Tree:** No committed `node_modules`, build artifacts, `.env` secrets, or temporary files.
