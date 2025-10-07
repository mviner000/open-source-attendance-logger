# ⏱️ Attendance System (Tauri + React + TypeScript)
## Created by Melvin Nogoy and TEAM giJ7

A cross-platform **desktop attendance tracking system** built with **Tauri**, **React**, and **TypeScript**.  
This app enables seamless attendance monitoring, local data storage, and synchronization — all packaged in a fast, secure, and lightweight desktop experience.

---

## 🚀 Overview

This Attendance System provides schools, organizations, and teams with an intuitive desktop solution to record, manage, and analyze attendance data.  

Designed to be **offline-first**, **secure**, and **lightweight**, it combines modern web UI technology with native Rust backend performance — powered by **Tauri v2**.

---

## 🧱 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | React + TypeScript + Vite |
| **Backend (Native)** | Rust (Tauri v2) |
| **UI Framework** | Tailwind CSS + Shadcn UI |
| **State Management** | React Hooks / Context |
| **Storage** | Local file system (via Tauri FS API) / Optional PostgreSQL sync |
| **Auth** | Session cookies or local config |
| **Logging** | Tauri logger (`RUST_LOG=debug`) |

---

## 🧭 Features

- ✅ Record and manage attendance for students or employees  
- 📅 Filter and export attendance by date or group  
- 🔐 Secure local data storage using Tauri APIs  
- ⚡ Offline support — works even without an internet connection  
- 🧩 Easy synchronization with backend services (future)  
- 🪶 Lightweight: built with Rust-native backend and small bundle size  
- 🖥️ Cross-platform (Windows, macOS, Linux)  

---

## 🧰 Development Setup

### 🧑‍💻 Prerequisites
Make sure you have the following installed:

- **Node.js** (v18+)
- **Rust & Cargo** (latest stable)
- **Bun** *(or npm/yarn/pnpm)*
- **VS Code** with:
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

## ⚙️ Installation & Setup

```bash
# 1️⃣ Clone the repository
git clone https://github.com/your-username/attendance-system
cd attendance-system

# 2️⃣ Install dependencies
bun install    # or npm install / yarn install

# 3️⃣ Run the Tauri app in development
RUST_LOG=debug bunx tauri dev

# 4️⃣ Build the desktop app
bunx tauri build
