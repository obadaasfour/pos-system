# 🚀 Advanced POS System (Laravel 11 + React Vite + PostgreSQL)

A professional, real-time Point of Sale (POS) system built with modern technologies. Features include real-time notifications, multi-role management (Admin/Cashier), inventory tracking, and more.

---

## 🛠 Prerequisites

Ensure you have the following installed:
- **PHP**: 8.2+
- **Node.js**: 20+ (with npm)
- **PostgreSQL**: 14+
- **Composer**
- **XAMPP / Laragon** (or any local PHP server environment)

---

## 📥 Installation Steps

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd pos-system
```

### 2. Backend Setup
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```
> [!IMPORTANT]
> Configure your **PostgreSQL** database credentials in the `.env` file.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env (if applicable)
```

### 4. Database Migration & Seeding
```bash
cd ../backend
php artisan migrate --seed
```

---

## 🚀 Running the Project

### Manual Way:
1. **Backend Server**: `php artisan serve`
2. **Reverb (WebSockets)**: `php artisan reverb:start`
3. **Frontend Server**: `npm run dev`

### ⚡ Quick Start (Windows Only):
Run the provided `start_project.bat` for local XAMPP setup or **`run-pos.bat`** to launch everything via **Docker**.

### 🐳 Running with Docker (Professional/Recommended)
If you have Docker installed, you can run the entire system with a single command:
1. Ensure `Asus-Lp.local` resolves to your local machine (Check your `hosts` file).
2. Run the **`run-pos.bat`** script.
OR manually:
```bash
docker-compose up -d
```
The system will be accessible at:
- Frontend: [http://Asus-Lp.local:5173](http://Asus-Lp.local:5173)
- Backend: [http://Asus-Lp.local:8000](http://Asus-Lp.local:8000)
- Reverb: Port 8090


---

## 🔐 Default Credentials

Use these accounts to explore the system:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@pos.com` | `password` |
| **Cashier** | `cashier@example.com` | `password` |

---

## 🌟 Key Features
- **Real-time Order Processing**: Powered by Laravel Reverb.
- **Dynamic Inventory**: Automatic stock deduction and batch management.
- **User Roles**: Advanced permissions for Admins and Cashiers.
- **Responsive UI**: Optimized for tablets and desktops.
- **Arabic Support**: Fully localized interface.

---

## 📄 License
The Laravel framework is open-source software licensed under the [MIT license](https://opensource.org/licenses/MIT).
