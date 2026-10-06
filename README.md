# Retequeños · Ecosistema Digital (Retequeños OS)

Sistema integral de comercio electrónico y gestión operativa para **Retequeños** (Tacna, Perú). Incluye web de pedidos por WhatsApp, prototipo navegable de la app móvil y hub administrativo con monitor KDS de cocina en tiempo real conectado a una API REST segura con persistencia transaccional en disco.

---

## 📂 Estructura General del Proyecto

| Carpeta / Archivo | Descripción |
|---|---|
| [**`documentacion/`**](./documentacion/README.md) | **Centro de Documentación Oficial**. Contiene la [arquitectura técnica y diagramas](./documentacion/ARQUITECTURA_Y_SISTEMA.md), bitácoras de auditoría de seguridad, catálogo de mejoras y especificaciones. |
| [**`data/`**](./data/) | **Fuente Única de Verdad (Single Source of Truth)**. Base de datos persistente en disco con escrituras atómicas: [`orders.db.json`](./data/orders.db.json), [`catalog.db.json`](./data/catalog.db.json) y [`store.config.json`](./data/store.config.json). |
| [**`app/`**](./app/) | **Hub Operativo & App Móvil**. Panel de administración modular ([`admin.html`](./app/admin.html)) con monitor KDS, control de stock y métricas BI, junto al prototipo navegable de 26 pantallas ([`index.html`](./app/index.html)). |
| [**`web/`**](./web/) | **Web de Pedidos**. React 18 + Vite 6 + Tailwind CSS + Zustand. Catálogo modularizado, configurador dinámico de promos/pizzas/tequeños y checkout por WhatsApp. |
| [**`tools/`**](./tools/) | **Backend & Utilidades**. Servidor de producción nativo en Node.js ([`server.js`](./tools/server.js)), suite de pruebas automatizadas ([`test-system.js`](./tools/test-system.js)) y lanzadores de ejecución. |
| [**`capturas/`**](./capturas/) | Registro visual del sistema antes y después de las mejoras. |

---

## 📊 Transformación del Sistema: Antes vs. Después de las Auditorías

El ecosistema atravesó dos fases intensivas de auditoría técnica y blindaje arquitectónico:

| Dimensión | Estado Original (Antes) | Estado Auditado y Blindado (Después) |
|---|---|---|
| **Persistencia de Datos** | Servidor volátil en memoria (PowerShell). Los pedidos se borraban al cerrar la consola. | **Persistencia ACID** en disco ([`data/orders.db.json`](./data/orders.db.json)) con escrituras atómicas y respaldos automáticos. |
| **Integridad Financiera** | El cliente enviaba `precio` y `total` manipulables por HTTP; redondeo inexacto por coma flotante IEEE 754. | **Cálculo autoritativo en servidor** contra catálogo maestro. Redondeo en centavos enteros (`Math.round(x * 100)`) inmune a manipulación. |
| **Control de Acceso (BOLA/IDOR)** | Cualquiera con la URL podía ver o cancelar pedidos ajenos de otros clientes. | **Protección por Token de Acceso**. Lectura y cancelación pública exigen token secreto; panel protegido por sesión de usuario. |
| **Protección de Datos (PII)** | La API `/api/pedidos` exponía en texto plano teléfonos, nombres y direcciones a cualquier petición pública GET. | **Enmascaramiento de datos (PII)** para peticiones no autenticadas (`912***950`, `Juan P***`, `Calle Al***`). |
| **Seguridad Frontend (XSS / Inyecciones)** | Concatenación vulnerable de HTML (`innerHTML`) y exportación CSV susceptible a CSV Formula Injection (`=CMD|...`). | **Sanitización estricta**, interpolación segura y neutralización de prefijos `=`, `+`, `-`, `@` con apóstrofe en CSV. |
| **Aislamiento y Concurrencia** | El cliente web intentaba cargar scripts locales de `app/` provocando errores CORS en el navegador. | **Aislamiento estricto**: `web/` compila autónomamente; `app/` consume la API REST de `tools/server.js`. |
| **Batería de Pruebas** | 0 pruebas automatizadas. | **21 pruebas automatizadas de extremo a extremo** ([`tools/test-system.js`](./tools/test-system.js)) cubriendo seguridad, ACID y finanzas. |

> Consulta el informe técnico completo con ejemplos de código antes y después en: [**`documentacion/BITACORA_AUDITORIAS_Y_MEJORAS.md`**](./documentacion/BITACORA_AUDITORIAS_Y_MEJORAS.md).

---

## 🏗️ Arquitectura Modular y Seguridad de Producción

El proyecto fue auditado exhaustivamente y reestructurado bajo estándares profesionales de ingeniería de software para eliminar deuda técnica y garantizar estabilidad en producción:

* **Backend Seguro en Node.js ([`tools/server.js`](./tools/server.js)):** Sustituyó el antiguo servidor en memoria de PowerShell. Ofrece I/O no bloqueante, persistencia atómica en disco (resistente a fallos de energía y reinicios), validación de orígenes CORS y protección estricta contra Path Traversal.
* **Fuente Única de Verdad (`data/`):** La configuración del negocio (teléfono oficial de WhatsApp `51912266950`, dirección `Calle Alto Lima 1488, Tacna`, Yape) y los 49 productos del catálogo maestro se sincronizan centralizadamente a través de la API REST (`/api/config`, `/api/catalog`).
* **Blindaje contra Stored XSS ([`app/js/admin/modules/kanban.module.js`](./app/js/admin/modules/kanban.module.js)):** Todos los datos ingresados por clientes o recibidos de la API se sanitizan e interpolan de forma segura antes de renderizarse en el tablero KDS, modales o comandas térmicas.
* **Ingreso del equipo:** El panel usa los usuarios **`administrador`** y **`caja`**, ambos con contraseña **`1234`**, sesiones del servidor y cookies `HttpOnly`. El administrador gestiona usuarios de caja e historial completo. Caja registra ventas y gestiona únicamente pedidos del día. Las cuentas nuevas solo se crean desde Usuarios con acceso de administrador. El PIN anterior requiere habilitarse expresamente con `--pin` o `RTQ_ADMIN_PIN`.
* **Configurador Web Tipado ([`ProductConfiguratorModal.tsx`](./web/src/components/configurator/)):** Se erradicó por completo la lógica heurística de "string-sniffing" en descripciones, adoptando un modelo fuertemente tipado (`ConfigurableItem` y `PromoConfig`).
* **Hub Operativo Modular ([`app/admin.html`](./app/admin.html)):** Organizado en 7 hojas de estilo modulares en [`app/css/admin/`](./app/css/admin/) y 14 submódulos especializados en [`app/js/admin/`](./app/js/admin/).

> Consulta el documento maestro de arquitectura: [**`documentacion/ARQUITECTURA_Y_SISTEMA.md`**](./documentacion/ARQUITECTURA_Y_SISTEMA.md).

---

## 🚀 Cómo Ejecutar el Sistema

### 1. Hub Operativo (KDS + Admin) y App Móvil
* **Desde Windows (1 Clic):**  
  Doble clic en **`Iniciar app (celular).cmd`**.  
  * **App móvil:** [http://localhost:3000](http://localhost:3000) (o desde tu celular en la misma red WiFi con la IP mostrada en consola).
  * **Panel Administrador & KDS:** [http://localhost:3000/admin](http://localhost:3000/admin) (usuarios **`administrador`** / **`caja`**, contraseña **`1234`**).
  * **API REST Pedidos (Persistente):** [http://localhost:3000/api/pedidos](http://localhost:3000/api/pedidos)
  * **API REST Catálogo Maestro:** [http://localhost:3000/api/catalog](http://localhost:3000/api/catalog)
  * **API REST Configuración:** [http://localhost:3000/api/config](http://localhost:3000/api/config)

### 2. Web de Pedidos (React + Vite)
* **Desarrollo:**
  ```bash
  cd web
  npm install
  npm run dev        # Disponible en http://localhost:5173
  ```
* **Compilación y Servidor Local (Sin Node externo):**
  * Ejecuta `Compilar web.cmd` (compila con el Node integrado de Antigravity IDE).
  * Ejecuta `Iniciar web.cmd` (sirve `web/dist` en http://localhost:5173).

### 3. Suite de Pruebas Automatizadas
* **Ejecutar pruebas del sistema:**  
  Doble clic en **`Ejecutar pruebas.cmd`** o ejecuta en terminal:
  ```bash
  node tools/test-system.js
  ```
  Ejecuta y valida **21 pruebas automatizadas**: persistencia ACID, autenticación por PIN, protección XSS, bloqueo de Path Traversal, sincronización del catálogo, control de acceso BOLA/IDOR, enmascaramiento de PII, cálculo autoritativo de precios y consistencia financiera.

---

## 📌 Datos de Configuración del Negocio

* **Fuente Centralizada:** [`data/store.config.json`](./data/store.config.json) (WhatsApp oficial `51912266950`, dirección `Calle Alto Lima 1488, Tacna`, horario, redes y número de Yape `912 266 950`).
* **Web:** [`web/src/config/site.ts`](./web/src/config/site.ts).
* **App Móvil:** [`app/js/mobile/data.js`](./app/js/mobile/data.js).

## Auditoría del front y nuevos módulos

El panel incluye acceso animado e historial de pedidos con búsqueda, filtros, detalle y CSV. Consulta [la auditoría del 3 de octubre de 2026](./documentacion/AUDITORIA_FRONT_2026-10-03.md). Para ejecutar las pruebas sin modificar la base del negocio: `node tools/test-access.js`. Reinicia el servidor si estaba activo antes de actualizar el código.

Consulta [el modelo de administrador y caja](./documentacion/ROLES_Y_CAJA.md) para conocer los permisos y el funcionamiento de Usuarios.

Reportes permite al administrador exportar pedidos, líneas de productos, métricas y el informe íntegro en CSV/JSON, con oportunidades y borradores de cupón basados en ventas reales. Consulta [Reportes y sugerencias](./documentacion/REPORTES_Y_SUGERENCIAS.md). Verificación del cálculo: `node tools/test-reports.js`. Integraciones se retiró del menú. El dashboard conserva su diseño y secciones originales; las métricas nuevas están dentro de Reportes.
