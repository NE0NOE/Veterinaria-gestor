# 🐾 MaxG — Sistema de Gestión Integral para Clínicas Veterinarias

Plataforma web moderna y completa para la administración y operación clínica de centros veterinarios. Diseñada con una arquitectura modular y reactiva, permite gestionar citas médicas, expedientes de pacientes/mascotas, control de inventario de medicamentos y alimentos, compras a proveedores y analíticas en tiempo real.

---

## ✨ Características Principales

- 🩺 **Expedientes Clínicos & Mascotas:** Registro detallado de pacientes (especie, raza, edad, peso, alergias e historial médico).
- 📅 **Agenda de Citas Inteligente:** Creación y seguimiento de citas médicas, consultas, vacunación y cirugías con estados interactivos.
- 📦 **Control de Inventario Farmacéutico & Productos:** Monitoreo de stock, control de fechas de vencimiento, umbrales de reabastecimiento y categorías.
- 🛒 **Módulo de Compras & Proveedores:** Registro de órdenes de compra, control de proveedores y cálculo de costos.
- 🥣 **Calculadora Nutricional de Alimentos (`FoodCalculator`):** Herramienta para dosificación y cálculo calórico diario según peso, especie y nivel de actividad física del animal.
- 📊 **Dashboard & Métricas:** Gráficos estadísticos interactivos sobre atención médica, ingresos y volumen de consultas con `Recharts`.
- 🔐 **Autenticación & Control de Acceso:** Gestión segura de roles (Administrador, Veterinario, Recepción) respaldada por **Supabase Auth**.
- 🌓 **Tema Oscuro & Claro:** Soporte nativo para modo oscuro y diseño responsive adaptado a tablets y móviles.

---

## 🛠️ Stack Tecnológico

- **Frontend Core:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Empaquetador & Tooling:** [Vite](https://vitejs.dev/)
- **Estilos & UI:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/), [AOS](https://michalsnik.github.io/aos/)
- **Visualización de Datos:** [Recharts](https://recharts.org/)
- **Backend & Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, Auth)
- **Despliegue:** Optimizado para [Vercel](https://vercel.com/) (`vercel.json`)

---

## 📂 Estructura del Proyecto

```bash
Veterinaria-gestor/
├── src/
│   ├── components/         # Modales, selectores de mascotas, sidebar, navbar, rutas protegidas
│   ├── config/             # Constantes y configuraciones globales
│   ├── context/            # Proveedores de estado (AuthContext, ThemeContext)
│   ├── pages/
│   │   ├── admin/          # Vistas administrativas y auditoría
│   │   ├── dashboard/      # Paneles de control y estadísticas
│   │   ├── Appointments.tsx # Agenda general de citas
│   │   ├── CreateAppointment.tsx # Formulario dinámico de reserva médica
│   │   ├── FoodCalculator.tsx # Calculadora de raciones y balance nutricional
│   │   ├── Inventory.tsx   # Control de inventario de medicamentos
│   │   ├── Patients.tsx    # Gestión de dueños y pacientes
│   │   ├── Pets.tsx        # Ficha individual de mascotas
│   │   └── Purchases.tsx   # Gestión de compras a proveedores
│   ├── services/           # Clientes API y consultas a Supabase
│   ├── supabaseClient.ts   # Conexión inicializada con Supabase
│   └── types/              # Definiciones TypeScript de entidades
├── supabase/               # Migraciones y esquemas de base de datos SQL
└── vercel.json             # Configuración de rutas para SPA en Vercel
```

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** v18 o superior
- **npm**, **yarn** o **pnpm**
- Una cuenta y proyecto activo en **Supabase**

### 1. Clonar el repositorio
```bash
git clone https://github.com/NE0NOE/Veterinaria-gestor.git
cd Veterinaria-gestor
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto con las credenciales de tu proyecto de Supabase:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-llave-anonima-publica
```

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

### 5. Compilar para producción
```bash
npm run build
```

---

## 👤 Autor

- **Mendell Noe Parrales Molina** ([@NE0NOE](https://github.com/NE0NOE))
