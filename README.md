# 💰 Finanzas Personales

Aplicación web moderna, privada e interactiva para la gestión integral de finanzas personales, control presupuestario, flujo de caja y seguimiento de inversiones.

Diseñada para funcionar **100% de manera local**, garantizando la privacidad de tus datos mediante contenedores Docker y almacenamiento persistente en tu propia máquina.

---

## ✨ Características Principales

- **💼 Cuentas de Salario con Ciclo Mensual:**
  - Cada mes se actualiza el saldo automáticamente a 0.
  - Permite ingresar el salario disponible para el mes activo mediante el botón *Actualizar Salario*.
  - Descuenta gastos mes a mes y genera un **Extracto Mensual** detallado por categorías.

- **📈 Cuentas de Inversión y Aportes Mensuales:**
  - Panel especializado para registrar aportes periódicos mes a mes.
  - Seguimiento histórico del capital aportado frente al saldo total de la cartera.

- **💵 Soporte Multidivisa en Tiempo Real (PEN / USD):**
  - Manejo transparente de cuentas en Soles (PEN) y Dólares (USD).
  - Conversión de divisas automática para calcular el **Patrimonio Neto Total** consolidado.

- **📊 Gráficos Financieros y Flujo de Caja:**
  - **Diagrama Sankey:** Visualización clara de las fuentes de ingreso (Salario, Liquidación, etc.) y su distribución en gastos y ahorro neto.
  - **Tendencia de Flujo de Caja:** Comparativa entre ingresos, egresos y tasa de ahorro.
  - **Evolución del Patrimonio:** Curva histórica del crecimiento de tu patrimonio neto.
  - **Top de Categorías:** Identificación visual de tus mayores gastos mensuales.

- **🔒 Privacidad y Modo Local Total:**
  - Acceso directo sin necesidad de credenciales ni inicio de sesión en entorno local.
  - Tus datos financieros nunca salen de tu ordenador; se guardan en volúmenes Docker dedicados (`whisper-mysql` y `whisper-storage`).
  - Inicio automático garantizado tras reiniciar el sistema (`restart: unless-stopped`).

---

## 🚀 Puesta en Marcha Rápida (Docker)

### Prerrequisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y en ejecución.

### Iniciar la aplicación
En la raíz del proyecto, ejecuta:

```bash
docker compose -f docker-compose.local.yml up -d
```

Una vez iniciados los contenedores, abre tu navegador y entra en:

👉 **[http://localhost:8080](http://localhost:8080)**

---

## 🛠️ Tecnologías Utilizadas

- **Backend:** [Laravel](https://laravel.com/) (PHP 8.3)
- **Frontend:** [React](https://react.dev/) + [Inertia.js](https://inertiajs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Visualización:** [Recharts](https://recharts.org/) & Lucide Icons
- **Base de Datos:** MySQL 8.0
- **Contenedores:** Docker & Docker Compose

---

## 📂 Comandos Útiles

- **Ver el estado de los contenedores:**
  ```bash
  docker compose -f docker-compose.local.yml ps
  ```

- **Ver logs en tiempo real:**
  ```bash
  docker compose -f docker-compose.local.yml logs -f app
  ```

- **Detener la aplicación:**
  ```bash
  docker compose -f docker-compose.local.yml down
  ```

---

## 📄 Licencia

Este proyecto está bajo la Licencia [MIT](LICENSE.md).
