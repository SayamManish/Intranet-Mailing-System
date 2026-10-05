# 📬 INTRANET MAILING & REALTIME LAN COMMUNICATION SYSTEM

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/Database-better--sqlite3-lightgrey.svg)](https://github.com/WiseLibs/better-sqlite3)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-black.svg)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS%20v3-06B6D4.svg)](https://tailwindcss.com/)
[![Security](https://img.shields.io/badge/Security-IDOR%20Protected%20%7C%20Airgapped-red.svg)]()

A secure, modern, LAN-based internal communication web application engineered for organizations, college campuses, ethical hacking laboratories, and enterprises. The system facilitates private internal mailing, file attachments, realtime socket chat, presence detection, custom folders, contacts directory, and an administrative dashboard over a Local Area Network without relying on external cloud mail servers or the public internet.

---

## 📑 Table of Contents

- [Core Concept & Architectural Highlights](#-core-concept--architectural-highlights)
- [Feature Matrix](#-feature-matrix)
- [Technology Stack](#-technology-stack)
- [Database Schema](#-database-schema)
- [Project Monorepo Structure](#-project-monorepo-structure)
- [Quick Start Guide](#-quick-start-guide)
- [Demo Seed Accounts](#-demo-seed-accounts)
- [How to Run & Access on LAN (Multi-Device)](#-how-to-run--access-on-lan-multi-device)
- [Windows Firewall Configuration](#-windows-firewall-configuration)
- [REST API Endpoints](#-rest-api-endpoints)
- [Realtime WebSockets Events](#-realtime-websockets-events)
- [Cybersecurity Hardening](#-cybersecurity-hardening)
- [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🌟 Core Concept & Architectural Highlights

1. **Air-gapped / LAN-Centric Design**:
   - Strictly isolated to the local subnet.
   - External domains (`@gmail.com`, `@yahoo.com`, etc.) are blocked by security validation to enforce organizational boundary containment.
   - Server binds to `0.0.0.0`, allowing any device connected to the same Wi-Fi router or Ethernet switch to communicate seamlessly.
2. **True Full-Stack Relational Relational Architecture**:
   - Zero mock data. Real SQLite database with WAL (Write-Ahead Logging) and cascading foreign keys.
   - Parameterized queries to eliminate SQL Injection.
   - Fine-grained ownership checks to prevent Insecure Direct Object References (IDOR).
3. **Realtime LAN Collaboration**:
   - Realtime typing indicators, presence tracking (Online/Offline), instant message delivery, and toast alerts powered by Socket.IO.
4. **Modern Enterprise SaaS UI/UX**:
   - Dark/Light mode switcher with persistence.
   - Skeleton loaders, empty states, rich modal dialogs, and smooth micro-animations.

---

## 🚀 Feature Matrix

### ✉️ Mailing & Message Management
- **Unified Mailbox**: Inbox, Sent, Drafts, Starred, Important, Archived, and Trash folders.
- **Internal Autocomplete**: Select recipients from registered organization members with instant search suggestions.
- **Threading & History**: Preserves conversation relationship (`parent_email_id`) with chronological thread bubbles.
- **Reply, Reply All & Forward**: Pre-populates recipients and previous conversation quotes.
- **Bulk Operations**: Multi-select toolbar for batch delete, mark read/unread, and move to custom folders.
- **Attachments**: Multi-file drag-and-drop support, MIME/size validation, and authorized file download.
- **Drafts System**: Auto-save drafts and resume editing anytime.

### 📁 Custom Folders
- Create, rename, color-code, and delete custom folders.
- Move emails into folders with live email count badges.

### 👥 Contacts & Directory
- Organization-wide user directory searchable by name, employee ID, or department.
- Add members to personal contacts with custom nicknames and notes.
- One-click "Send Mail" and "Start Chat" shortcuts.

### 💬 Realtime Peer Chat
- Instant 1-on-1 socket messaging across LAN.
- Online presence indicator with live user status.
- Realtime typing indicator ("Alice is typing...").
- Auto-scroll to latest messages.

### 📊 Dashboard & System Telemetry
- Real statistics cards: Total Inbox, Unread Messages, Sent, and Starred.
- Live email flow activity area chart built with Recharts.
- Recent emails and active chat widgets.

### 🛡️ Administrative Portal
- System overview: Active users count, email packets, chat volume, and attachment disk storage in MB.
- Member management: Activate or deactivate accounts.
- Department distribution analytics.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS v3, React Router v7, Lucide React, Axios, Socket.IO Client, Recharts |
| **Backend** | Node.js (v20+), Express.js, Socket.IO, JWT, bcryptjs, Multer, Helmet, CORS, express-rate-limit |
| **Database** | SQLite via `better-sqlite3` (WAL Mode enabled) |
| **Storage** | Server-side local filesystem (`server/uploads/`) with UUID sanitization |

---

## 🗄️ Database Schema

The system uses a relational SQLite database (`server/database/intranet.sqlite`):

- `users` (id, employee_id, name, email, password_hash, department, designation, profile_image, role, is_active, last_seen, created_at)
- `emails` (id, sender_id, subject, body, parent_email_id, is_draft, created_at, updated_at)
- `email_recipients` (id, email_id, recipient_id, type [to/cc/bcc], is_read, read_at, is_starred, is_important, is_deleted, is_archived, folder_id)
- `email_sender_metadata` (id, email_id, user_id, is_starred, is_important, is_deleted, is_archived, folder_id)
- `attachments` (id, email_id, original_name, stored_name, file_path, mime_type, file_size, created_at)
- `folders` (id, user_id, name, color, created_at)
- `contacts` (id, user_id, contact_user_id, nickname, notes, created_at)
- `chat_conversations` (id, created_at, updated_at)
- `chat_participants` (id, conversation_id, user_id, joined_at, last_read_at)
- `chat_messages` (id, conversation_id, sender_id, message, is_read, created_at)
- `notifications` (id, user_id, type, title, message, related_id, is_read, created_at)

---

## 📂 Project Monorepo Structure

```
intranet-mailing-system/
├── client/                      # Frontend React + Vite SPA
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Navbar, Sidebar, Modal, ToastContainer, EmptyState, SkeletonLoader
│   │   │   └── mail/            # MailToolbar, MailItem, MailDetail, ComposeModal, FolderModal
│   │   ├── context/             # AuthContext, ThemeContext, SocketContext
│   │   ├── layouts/             # MainLayout
│   │   ├── pages/               # Login, Register, Dashboard, Mailbox, Contacts, Chat, Profile, Settings, Admin
│   │   ├── services/            # Axios API client with LAN host auto-detection
│   │   ├── App.jsx              # Application router
│   │   ├── index.css            # Tailwind & custom scrollbar directives
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js           # Bound to 0.0.0.0 with API proxy
│
├── server/                      # Backend Node.js & Express API
│   ├── controllers/             # Auth, Email, Folder, Contact, Chat, Notification, Profile, Attachment, Admin
│   ├── database/
│   │   ├── db.js                # better-sqlite3 instance with WAL mode
│   │   ├── init.js              # Schema migrations & index creation
│   │   └── seed.js              # Database demo seeder
│   ├── middleware/              # JWT auth, Multer file upload, security
│   ├── routes/                  # REST API routes
│   ├── sockets/                 # Socket.IO presence, typing, messaging handlers
│   ├── utils/                   # Notification & event dispatchers
│   ├── uploads/                 # Local directory for attachments
│   ├── server.js                # Express & Socket.IO server entry
│   └── package.json
│
├── .env.example
├── .gitignore
├── package.json                 # Monorepo root script orchestration
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher (v20+ recommended)
- npm v9+

### 1. Install Dependencies
In the root directory, run:
```bash
npm run install:all
```
*(This installs root dependencies along with client and server node_modules automatically)*

### 2. Initialize and Seed Database
Populate the database with demo users, sample emails, threaded replies, custom folders, contacts, and chat history:
```bash
npm run seed
```

### 3. Run the Application
Run both backend and frontend concurrently:
```bash
npm run dev
```

- **Frontend Web Portal**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Demo Seed Accounts

All demo users share the password: **`Password123!`**

| Name | Role | Department | Email / Login ID |
| :--- | :--- | :--- | :--- |
| **System Administrator** | Admin | IT & Infrastructure | `admin@organization.local` (or `EMP-001`) |
| **Alice Walker** | User | Cyber Security Lab | `alice@organization.local` (or `EMP-002`) |
| **Bob Smith** | User | Network Operations | `bob@organization.local` (or `EMP-003`) |
| **Charlie Davis** | User | Software Engineering | `charlie@organization.local` (or `EMP-004`) |
| **David Evans** | User | Information Security | `david@organization.local` (or `EMP-005`) |
| **Emma Watson** | User | Quality Assurance | `emma@organization.local` (or `EMP-006`) |

*(Tip: On the Login screen, click any of the 4 quick demo buttons to auto-populate credentials instantly)*

---

## 🌐 How to Run & Access on LAN (Multi-Device)

Because the system is engineered specifically for intranet operation, other devices on your Wi-Fi or Ethernet switch (laptops, desktops, tablets, smartphones) can access it.

### Step 1: Find your Host Computer's Local IP Address
On your Windows host computer:
1. Open PowerShell or Command Prompt.
2. Run:
   ```cmd
   ipconfig
   ```
3. Locate the **IPv4 Address** under your active Wi-Fi or Ethernet adapter (e.g. `192.168.1.105` or `10.0.0.12`).

### Step 2: Start the System
Ensure your server and client are running (`npm run dev`).
- The backend listens on `0.0.0.0:5000`.
- The frontend Vite server listens on `0.0.0.0:5173`.

### Step 3: Connect from Another Device
1. Connect the second computer/phone to the **same Wi-Fi / LAN network**.
2. Open a web browser on that device and navigate to:
   ```
   http://YOUR_HOST_IP:5173
   ```
   *(Example: `http://192.168.1.105:5173`)*
3. Log in with any demo account (e.g. `bob@organization.local` on machine 2, `alice@organization.local` on machine 1) and test internal mail or realtime chat!

---

## 🛡️ Windows Firewall Configuration

If another computer on the LAN cannot reach your host machine, Windows Firewall may be blocking inbound connections on ports `5173` and `5000`.

### Allow via Windows PowerShell (Run as Administrator):
```powershell
New-NetFirewallRule -DisplayName "Intranet Mailing Client" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Intranet Mailing Server" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

---

## 📡 REST API Endpoints

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a new internal organization user.
- `POST /api/auth/login` - Authenticate using email/employee ID and password.
- `GET /api/auth/me` - Fetch verified profile of authenticated token.
- `POST /api/auth/change-password` - Change account password.

### ✉️ Emails (`/api/emails`)
- `GET /api/emails/inbox` - Retrieve paginated inbox messages.
- `GET /api/emails/sent` - Retrieve sent mailbox.
- `GET /api/emails/drafts` - Retrieve drafts.
- `GET /api/emails/starred` - Retrieve starred items.
- `GET /api/emails/important` - Retrieve important items.
- `GET /api/emails/archived` - Retrieve archived items.
- `GET /api/emails/trash` - Retrieve deleted items.
- `GET /api/emails/dashboard-stats` - Retrieve live mailbox statistics.
- `GET /api/emails/search?q=...` - Search messages across subject, body, sender.
- `GET /api/emails/:id` - Get email details with thread history (IDOR Protected).
- `POST /api/emails/compose` - Dispatch internal email (Multi-part with attachments).
- `POST /api/emails/drafts` - Save or update draft.
- `POST /api/emails/batch` - Batch actions (delete, mark read, move folder).
- `PUT /api/emails/:id/star` - Toggle star state.
- `PUT /api/emails/:id/important` - Toggle important state.
- `PUT /api/emails/:id/read` - Mark as read/unread.
- `PUT /api/emails/:id/move` - Move to custom folder.
- `DELETE /api/emails/:id` - Move to trash or permanently delete.

### 📁 Custom Folders (`/api/folders`)
- `GET /api/folders` - List user's custom folders with message count.
- `POST /api/folders` - Create a folder.
- `PUT /api/folders/:id` - Rename or change color.
- `DELETE /api/folders/:id` - Delete folder.
- `GET /api/folders/:id/emails` - List emails in folder.

### 👥 Contacts (`/api/contacts`)
- `GET /api/contacts` - List user's saved contacts.
- `GET /api/contacts/directory` - Search organization members.
- `POST /api/contacts` - Save contact with nickname & notes.
- `DELETE /api/contacts/:id` - Remove contact.

### 💬 Chat (`/api/chat`)
- `GET /api/chat/conversations` - List active 1-on-1 conversations with unread count.
- `POST /api/chat/conversations` - Initialize conversation with peer.
- `GET /api/chat/conversations/:id/messages` - Retrieve message history.
- `POST /api/chat/conversations/:id/messages` - Send message (REST fallback).

### 📎 Attachments (`/api/attachments`)
- `GET /api/attachments/download/:id` - Authorized download of email attachment.

### 🛡️ Admin (`/api/admin`)
- `GET /api/admin/stats` - System telemetry and disk metrics.
- `GET /api/admin/users` - Directory audit.
- `PUT /api/admin/users/:id/status` - Toggle active/deactivated state.

---

## 🔒 Cybersecurity Hardening

1. **Strict IDOR Mitigation**:
   - Every email reading and attachment download route verifies that `req.user.id` is either the author (`sender_id`) or an authorized recipient in `email_recipients`. Unauthorized attempts return `403 Forbidden`.
2. **Parameterized Queries**:
   - `better-sqlite3` prepared statements ensure zero possibility of SQL Injection.
3. **Password Security**:
   - Plaintext passwords are never stored. Passwords are salted and hashed using `bcryptjs` with 10 salt rounds.
4. **Isolated Attachment Handling**:
   - Uploads are assigned sanitized UUID filenames with validated extensions (`.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.zip`, etc.) and stored outside public web roots. File path traversal (`../`) is blocked.
5. **Rate Limiting & Helmet Headers**:
   - `express-rate-limit` prevents brute-force login and DOS attempts.
   - `helmet` sets security headers (X-Frame-Options, CSP, XSS Protection).

---

## ❓ Troubleshooting & FAQ

**Q: Cannot connect from another device on Wi-Fi?**
- Ensure both devices are on the same Wi-Fi SSID / subnet.
- Check that your host computer's firewall allows inbound TCP on ports `5000` and `5173`.
- Verify you are typing the correct IPv4 address from `ipconfig`.

**Q: How do I reset the database to a clean demo state?**
- Run `npm run seed` at any time to regenerate clean demo records.

---

## 📄 License
Internal Organizational / Ethical Hacking Lab Project. All rights reserved.
