# Guion de diapositivas para GPT — n8n en RETEQUE-OS (Sistemas Operativos II)

> **Para qué sirve:** dárselo a ChatGPT junto con `SO2_DISENO_DESPLIEGUE_N8N.md` (fuente principal) y `ARQUITECTURA_N8N_WHATSAPP.md` (contexto funcional) para que genere la presentación.
> **Contenido:** 26 diapositivas más una final de preguntas, entre 25 y 30 minutos. Las marcadas como *opcional* se pueden quitar si hay menos tiempo.
> **Fecha:** 2 de noviembre de 2026.

---

## Parte 1. Instrucciones para pegar en GPT

```text
Vas a crear una presentación técnica en español para el curso Sistemas Operativos II sobre el diseño y la
arquitectura de la implementación de n8n en el proyecto RETEQUE-OS. Te adjunto tres archivos:
1) SO2_DISENO_DESPLIEGUE_N8N.md: fuente principal de datos.
2) ARQUITECTURA_N8N_WHATSAPP.md: contexto funcional.
3) SO2_GUION_DIAPOSITIVAS.md: este guion, con el contenido y la especificación de cada imagen.

Reglas obligatorias:
- Sigue el guion diapositiva por diapositiva, en el mismo orden y con los mismos títulos.
- No inventes datos, cifras, comandos, nombres de variables ni componentes. Si algo no está en los archivos, no lo agregues.
- Copia literalmente las cifras medidas (262 ms, 11 ms, 267 ms, 77 ms), los nombres de archivos, las variables
  y los comandos. Escríbelos en fuente monoespaciada.
- Todo lo que el guion marca como «por implementar» debe verse con borde discontinuo y la etiqueta
  «Por implementar». No lo presentes como algo ya desplegado.
- Formato 16:9. Máximo 6 viñetas por diapositiva y 14 palabras por viñeta. El detalle va en las notas del orador.
- Sin emojis. Sin fotos de archivo. Sin logotipos de terceros (Docker, n8n, Meta, Supabase, Vercel): usa solo
  etiquetas de texto. El único logotipo permitido es el de Retequeños, en la portada.
- Los diagramas deben ser vectoriales y editables (formas y conectores de PowerPoint, o SVG/Mermaid).
  No generes los diagramas como imágenes de IA: los modelos de imagen deforman el texto técnico.
  Cada etiqueta debe aparecer exactamente como la escribe el guion.
- Respeta la guía visual de la Parte 2.
- Entrega: un archivo .pptx con notas del orador. Si no puedes generar .pptx, entrega por cada diapositiva
  el texto, las notas y el código Mermaid o SVG de cada diagrama.
```

---

## Parte 2. Guía visual

### 2.1 Paleta (tomada de la web del proyecto, `web/tailwind.config.js`)

| Uso | Color | Hex |
|---|---|---|
| Títulos, acentos, franja de portada | Rojo Retequeños | `#D31728` |
| Hallazgos, riesgos, fallos, «bloqueado» | Rojo oscuro | `#B30F1E` |
| Advertencias, «por implementar» (etiqueta) | Amarillo | `#F5A623` |
| Fondo de diapositiva | Crema | `#FFF9F2` |
| Fondo de tarjetas y tablas | Crema claro | `#FFFDF9` |
| Texto principal | Gris carbón | `#1F2937` |
| Texto secundario, Internet y sistemas externos | Gris | `#6B7280` |

**Colores semánticos de los diagramas** (usar siempre los mismos):

| Zona o elemento | Borde | Relleno |
|---|---|---|
| Vercel (tienda y panel) | `#111827` | `#F3F4F6` |
| VPS y sus contenedores | `#1D4ED8` | `#EFF6FF` |
| n8n | `#F47B20` | `#FFF4EC` |
| Supabase (PostgreSQL y Storage) | `#059669` | `#ECFDF5` |
| Meta / WhatsApp | `#16B959` | `#EFFBF3` |
| Kernel Linux y conceptos del SO | `#7C3AED` | `#F5F3FF` |
| Riesgo o hallazgo | `#B30F1E` | `#FFF0F1` |

### 2.2 Tipografía

- Títulos: **Plus Jakarta Sans** negrita, 32–36 pt. Texto: Plus Jakarta Sans regular, 18–22 pt. Si no está disponible, usar Outfit o una sans-serif del sistema.
- Código, comandos, rutas, variables y nombres de procesos: **JetBrains Mono** o **Consolas**, 14–16 pt.

### 2.3 Convenciones de los diagramas

| Elemento | Representación |
|---|---|
| Componente existente | Rectángulo de esquinas redondeadas, borde **continuo** de 2 px |
| Componente por implementar | Borde **discontinuo** + etiqueta amarilla «Por implementar» en la esquina superior derecha |
| Contenedor Docker | Rectángulo con el nombre del servicio en monoespaciada en la parte superior (`api`, `n8n`…) |
| Red o zona (Vercel, VPS, red de Docker) | Rectángulo grande con fondo de color suave y título en la esquina superior izquierda |
| Flujo de datos o petición | Flecha **continua** con etiqueta del protocolo o la ruta |
| Evento o señal | Flecha **discontinua** |
| Bloqueo, rechazo o fallo | Flecha o bloque en rojo oscuro con una ✕ dibujada como forma (no como emoji) |
| Resultado correcto | Marca de verificación dibujada como forma, en verde `#059669` |
| Valores de ejemplo (PID, IP) | En cursiva con la etiqueta «(ejemplo)» |

Cada diagrama lleva en la esquina inferior derecha, en 10 pt gris, la fuente: «Fuente: SO2_DISENO_DESPLIEGUE_N8N.md, sección N».

---

## Parte 3. Diapositivas

### Diapositiva 1 — Portada

**Texto:**
- Título: «Diseño y arquitectura de la implementación de n8n en RETEQUE-OS»
- Subtítulo: «Despliegue sobre Linux analizado desde el sistema operativo»
- «Sistemas Operativos II · Noviembre de 2026»
- «[Integrantes]» · «[Docente]» (marcadores para completar a mano)

**Imagen:**
- Logo `web/public/assets/brand/logo-retequenos.png` arriba a la izquierda, con el 15 % del ancho de la diapositiva.
- Franja vertical roja `#D31728` en el borde izquierdo, con el 2 % del ancho. Fondo crema `#FFF9F2`.
- Nada más: sin fotos ni ilustraciones.

**Notas del orador:** presentar el proyecto (ecosistema digital de Retequeños, Tacna) y el enfoque: cómo se ejecuta n8n en un servidor Linux y por qué cada decisión responde a un concepto del curso.

---

### Diapositiva 2 — Contexto: qué es RETEQUE-OS

**Texto (izquierda, 40 %):**
- Retequeños, Tacna: tequeños, pizzas, pastelitos y bebidas.
- Tienda web React: escritorio y web móvil `/app` (PWA).
- Panel admin: KDS de cocina, caja, catálogo, reportes.
- API propia en Node.js, sin dependencias externas.
- n8n: orquestará WhatsApp y avisos (por implementar).

**Imagen (derecha, 60%): diagrama de contexto (nivel 1 del modelo C4)**
- Rectángulo grande central «RETEQUE-OS» con 4 cajas dentro:
  1. «Tienda web y web móvil /app» (zona Vercel)
  2. «Panel admin» (zona Vercel)
  3. «API de negocio — tools/backend» (zona VPS)
  4. «n8n» (zona n8n, **borde discontinuo**, «Por implementar»)
- Actores a la izquierda, como figuras simples de persona: «Cliente» y «Personal (admin, caja)».
- Sistemas externos a la derecha: «WhatsApp Cloud API (Meta)», «Supabase: PostgreSQL + Storage».
- Flechas:
  - Cliente → Tienda: «compra»
  - Cliente ⇄ WhatsApp Cloud API: «mensajes»
  - Personal → Panel: «opera»
  - Tienda → API y Panel → API: «/api/*»
  - WhatsApp Cloud API → API: «webhook firmado»
  - API ⇄ Supabase: «RPC HTTPS»
  - API → n8n (discontinua): «eventos»
  - n8n → API: «/internal/*»

**Notas:** solo la API escribe datos del negocio; n8n reacciona a eventos y pide acciones a la API.

---

### Diapositiva 3 — Objetivo y requisitos no funcionales

**Texto:** una frase: «Ejecutar n8n y la API de negocio en una VPS Linux, con aislamiento, durabilidad y recuperación automática.»

**Imagen: tabla de 3 columnas y 6 filas** (copiar el contenido exacto de la sección 1 del documento fuente)

| Requisito | Meta del MVP | Mecanismo del SO |
|---|---|---|
| Disponibilidad | 24/7, recuperación automática | `systemd`, políticas de reinicio, *healthchecks* |
| Latencia del webhook de Meta | 200 en menos de 1 s | Bucle de eventos sin bloqueos |
| Durabilidad | Ningún evento aceptado se pierde | WAL de PostgreSQL, volúmenes, *outbox* |
| Aislamiento | Un fallo en n8n no afecta a la API | *namespaces*, *cgroups*, redes separadas |
| Seguridad | Solo 80 y 443 expuestos | Cortafuegos, permisos, capacidades |
| Recuperación | RPO ≤ 24 h, RTO ≤ 2 h | Respaldos con `systemd` y prueba de restauración |

- Encabezado con fondo `#D31728` y texto blanco; filas alternas `#FFFDF9` y `#FFF9F2`. La tercera columna en color `#7C3AED`, porque es la parte del curso.

**Notas:** cada requisito se resuelve más adelante con un mecanismo concreto del sistema operativo.

---

### Diapositiva 4 — Principio de diseño: n8n coordina, la API decide

**Texto (abajo, 3 viñetas):**
- n8n nunca escribe en la base del negocio.
- Meta llama a la API, no a n8n.
- Comprobante recibido no es pago confirmado.

**Imagen: diagrama de flujo de izquierda a derecha** (base: sección 3 de `ARQUITECTURA_N8N_WHATSAPP.md`, diagrama Mermaid)
- Columna 1: «Tienda web y web móvil /app», «Panel admin», «Cliente en WhatsApp» → «WhatsApp Cloud API».
- Columna 2: «API de negocio — tools/backend».
- Columna 3: «Supabase PostgreSQL» y «Supabase Storage privado».
- Columna 4: «Despachador de eventos» (**discontinuo**, «Por implementar») y «n8n» (**discontinuo**, «Por implementar»).
- Flechas con etiqueta exacta:
  - Tienda → API: «/api/* (reescritura de Vercel)»
  - Panel → API: «/api/* con sesión»
  - WhatsApp Cloud API → API: «Webhook firmado»
  - API ⇄ Supabase PostgreSQL: «RPC HTTPS»
  - API → Supabase PostgreSQL: «Inserta evento en la misma transacción»
  - API → Storage: «Comprobantes»
  - Despachador → PostgreSQL: «Reclama eventos»
  - Despachador → n8n (discontinua): «Webhook interno»
  - n8n → API: «/internal/* con token de servicio»
  - API → WhatsApp Cloud API: «Mensajes salientes»
- Marcar la API con un borde más grueso (3 px): es el único punto que escribe datos.

**Notas:** explicar la separación de responsabilidades y por qué evita repartir reglas de negocio en decenas de nodos de n8n.

---

### Diapositiva 5 — Despliegue físico

**Imagen (ocupa toda la diapositiva): diagrama de despliegue con zonas** (base: sección 4 de `ARQUITECTURA_N8N_WHATSAPP.md`)
- Zona «Internet» (gris) arriba con un círculo «Internet».
- Zona «Vercel» (izquierda) con 2 cajas: «Tienda web: web/dist» y «Panel: app/».
- Zona «VPS Linux — Docker Compose» (centro, azul) con 5 contenedores:
  - `caddy :80 :443`
  - `api :3000`
  - `outbox-worker` (**discontinuo**, «Por implementar»)
  - `n8n :5678` con la nota «sin puerto público»
  - `n8n-db (PostgreSQL)`
- Zona «Supabase» (derecha, verde): «PostgreSQL + Storage».
- Zona «Meta» (derecha abajo, verde WhatsApp): «Graph API».
- Flechas:
  - Internet → Tienda y Panel
  - Tienda y Panel → `caddy`: «/api/* reescrito»
  - Graph API → `caddy`: «POST /webhooks/whatsapp»
  - `caddy` → `api`
  - `api` ⇄ Supabase
  - `outbox-worker` ⇄ Supabase
  - `outbox-worker` → `n8n`
  - `n8n` → `api`
  - `n8n` ⇄ `n8n-db`
  - `api` → Graph API
- Abajo, una tabla pequeña de 3 filas: `api.ejemplo.pe` → Caddy → API (pública; `/internal/*` responde 404) · `www.ejemplo.pe` y `admin.ejemplo.pe` → Vercel · n8n → sin dominio (túnel SSH).

**Notas:** Render se retira; los webhooks de Meta necesitan un servidor siempre encendido; Supabase gratuito solo durante el desarrollo.

---

### Diapositiva 6 — Dos niveles de virtualización

**Texto (derecha, 35 %):**
- La VPS es una máquina virtual con su propio kernel.
- Los contenedores comparten el kernel de la VPS.
- Contenedor = procesos + *namespaces* + *cgroups* + overlay2.
- Una VM por servicio costaría varios kernels en 4 GiB.

**Imagen (izquierda, 65 %): pila de capas de abajo hacia arriba** (base: sección 3, diagrama Mermaid)
1. «Servidor físico del proveedor» (gris)
2. «Hipervisor KVM del proveedor» (gris), con una nota a la derecha: «*steal time*: columna `st` en `top`»
3. «VPS: 2 vCPU · 4 GiB RAM» (azul)
4. «Kernel Linux» (violeta `#7C3AED`), dividido en 5 cajas pequeñas: «planificador EEVDF», «memoria virtual», «cgroups v2», «namespaces», «netfilter»
5. «Docker Engine: dockerd · containerd · runc» (azul)
6. Fila de 5 contenedores: `caddy`, `api`, `outbox-worker` (discontinuo), `n8n`, `n8n-db`
- A la derecha de la pila, una llave que abarque las capas 1 a 3 con el texto «Virtualización completa», y otra que abarque las capas 4 a 6 con «Virtualización a nivel de SO».

**Notas:** diferencia entre hipervisor y contenedores; qué se aísla y qué se comparte.

---

### Diapositiva 7 — Anatomía de un contenedor

**Imagen (ocupa el 75 %): tres bloques unidos alrededor del contenedor `api`**
- **Bloque central:** un proceso dibujado como círculo con el texto «`node tools/server.js`» y dos etiquetas:
  - «PID 1 dentro del contenedor»
  - «PID 4321 en el host *(ejemplo)*»
- **Anillos de *namespaces*** alrededor del proceso: seis segmentos etiquetados `pid`, `net`, `mnt`, `uts`, `ipc` y `user (opcional)`. Nota debajo: «Comando: `ls -l /proc/<pid>/ns`».
- **Bloque «cgroup v2»** (violeta), a la derecha, como una «ficha» con tres líneas en monoespaciada:
  - `cpu.max = 100000 100000` → «1.0 CPU»
  - `memory.max = 268435456` → «256 MiB»
  - `pids.max`
- **Bloque «overlay2»**, debajo, como capas apiladas:
  - «Capa de imagen: `node:24-alpine`» (solo lectura, gris)
  - «Capa de imagen: `COPY tools/`» (solo lectura, gris)
  - «Capa escribible del contenedor — efímera» (amarillo, con la nota «se pierde al recrear»)
  - A un costado, un cilindro «volumen» conectado con la etiqueta «persistente».

**Texto (25 %):**
- *Namespaces*: qué ve el proceso.
- *cgroups*: cuánto puede usar.
- overlay2: qué archivos tiene.

**Notas:** un contenedor no es una máquina virtual; es un proceso con vista y límites restringidos.

---

### Diapositiva 8 — Sistema base y seguridad en capas

**Texto (izquierda, 40 %):**
- Ubuntu Server LTS, kernel 6.x con cgroups v2.
- Usuario `deploy` con `sudo`; root sin SSH.
- SSH solo con claves y `fail2ban`.
- `America/Lima` y NTP activo.
- *Swap* de 2 GiB con `vm.swappiness=10`.
- `unattended-upgrades` solo para seguridad.

**Imagen (derecha, 60 %): círculos concéntricos (modelo de cebolla), de afuera hacia adentro**
1. «Internet»
2. «`ufw`: entrantes solo 22, 80, 443»
3. «SSH con claves + `fail2ban`»
4. «Caddy TLS · `/internal/*` → 404»
5. «Redes Docker separadas · `n8n_db` sin salida»
6. «Contenedor: `USER node` · `cap_drop: ALL` · `no-new-privileges` · `read_only` · AppArmor»
7. Centro: «API: token de servicio · HMAC de Meta»
- Recuadro de advertencia rojo fuera de los círculos: «Grupo `docker` ≈ root: usar `sudo docker`».

**Notas:** defensa en profundidad; por qué pertenecer al grupo `docker` equivale a tener privilegios de root.

---

### Diapositiva 9 — Procesos por contenedor

**Imagen (65 %): árboles de procesos lado a lado** (base: diagrama Mermaid de la sección 5.1)
- `api`: `tini (PID 1)` → `node server.js` → caja «pool libuv» con 4 hilos dibujados como líneas paralelas, rotulados `T1`–`T4`.
- `n8n`: `tini (PID 1)` → «n8n principal» → «task runner (proceso aparte)».
- `n8n-db`: `postmaster` → 4 hijos: «backend por conexión», «checkpointer», «wal writer», «autovacuum».
- `caddy`: «binario Go» con la nota «goroutines sobre hilos del SO (M:N)».
- `outbox-worker`: `tini` → `node outbox-worker.js` (**discontinuo**, «Por implementar»).
- Los nodos padre se unen a los hijos con líneas; los hilos se dibujan distinto de los procesos (línea ondulada frente a caja).

**Texto (35 %):**
- Node: un hilo de JavaScript y un *pool* de 4 hilos.
- PostgreSQL: un proceso por conexión.
- n8n en modo regular; *queue mode* si se satura.
- `N8N_CONCURRENCY_PRODUCTION_LIMIT=5` funciona como semáforo contador.

**Notas:** diferencia entre proceso e hilo en cada servicio; por qué el despachador es un proceso separado (aislamiento de fallos).

---

### Diapositiva 10 — Hallazgo H1: el inicio de sesión bloquea el servidor

**Imagen A (arriba, 55 %): gráfico de barras horizontales agrupadas**
- Dos grupos:
  - «Bloqueo máximo del bucle de eventos»: `scryptSync` **262 ms** (rojo oscuro) y `scrypt` asíncrono **11 ms** (verde)
  - «Tiempo total»: **267 ms** y **77 ms**
- Eje X de 0 a 300 ms, con marcas cada 50 ms. Etiqueta numérica al final de cada barra.
- Pie del gráfico (10 pt): «Medido: 8 verificaciones de contraseña · Windows · Node 24.16 · 6 CPU lógicas · `UV_THREADPOOL_SIZE=4`».

**Imagen B (abajo, 45 %): dos líneas de tiempo de 0 a 270 ms**
- **Fila «Actual — `scryptSync`»:**
  - pista «Hilo principal»: un solo bloque rojo continuo de 0 a 262 ms con el texto «ninguna otra petición se atiende»
  - debajo, 4 pistas «pool libuv» vacías
- **Fila «Propuesto — `scrypt`»:**
  - pista «Hilo principal» con marcas cortas (≤ 11 ms) separadas
  - 4 pistas «pool libuv T1–T4» con bloques en paralelo que terminan antes de 80 ms

**Texto:** una línea: «Decisión: `crypto.scrypt` asíncrono en `users.repository.js` y `postgres.repositories.js`.»

**Notas:** llamada bloqueante en un proceso de un solo hilo; el *pool* de libuv como hilos del sistema operativo; experimento E3.

---

### Diapositiva 11 — Hallazgo H2: PID 1 y señales

**Imagen: dos diagramas de secuencia lado a lado, en vertical**
- **Izquierda, título «Sin init (actual)»:**
  - `docker stop` → `SIGTERM` → `node (PID 1)`
  - nota roja: «sin manejador: el kernel no aplica la acción por defecto al init del *namespace*»
  - un reloj dibujado como forma con «10 s (`stop_grace_period`)»
  - `SIGKILL` → «peticiones cortadas · código 137»
- **Derecha, título «Con `init: true` + manejador (diseño)»:**
  - `docker stop` → `SIGTERM` → `tini (PID 1)` → reenvía → `node (PID 7 *ejemplo*)`
  - `server.close()` → «termina las peticiones en curso (máx. 8 s)» → «código 0»
  - marca verde: «menos de 1 s típico»

**Texto (abajo):**
- `tini` reenvía señales y recoge procesos zombis.
- Experimento E4: `time docker stop rtq-api`.

**Notas:** semántica especial de PID 1 en Linux; relación con un apagado ordenado.

---

### Diapositiva 12 — Planificación de CPU y tareas programadas

**Imagen A (izquierda, 55 %): línea de tiempo de cuota del cgroup**
- Título: `cpu.max = "50000 100000"` (0.5 CPU, `outbox-worker`).
- Eje X: 0 a 300 ms, dividido en 3 periodos de 100 ms con líneas verticales.
- En cada periodo: bloque azul de 50 ms «ejecuta» y bloque rayado rojo de 50 ms «estrangulado».
- Nota: «se cuenta en `cpu.stat` → `nr_throttled`».

**Imagen B (derecha, 45 %): barras verticales de topes de CPU**
- `caddy` 0.5 · `api` 1.0 · `outbox-worker` 0.5 · `n8n` 1.0 · `n8n-db` 0.5.
- Línea horizontal discontinua en 2.0 rotulada «vCPU de la VPS».
- Nota: «Suma 3.5 > 2: son topes, no reservas».

**Tabla pequeña (abajo, a lo ancho):**

| Tarea | Mecanismo |
|---|---|
| Vencer pedidos cada 5 min | *Schedule* de n8n (`WF-07`) |
| Respaldo 3:30 a. m. | `rtq-backup.timer` con `Persistent=true` |
| Prioridad del respaldo | `Nice=10` · `IOSchedulingClass=idle` |

**Notas:** EEVDF desde Linux 6.6; por qué `systemd` y no `cron` para los respaldos (recupera ejecuciones perdidas).

---

### Diapositiva 13 — Memoria y OOM killer

**Imagen A (arriba, a lo ancho): barra horizontal apilada de 4 GiB**
- Segmentos, de izquierda a derecha, con su etiqueta:
  - «SO + Docker ≈ 0.5 GiB» (gris)
  - `caddy` 128 MiB
  - `api` 256 MiB
  - `outbox-worker` 128 MiB
  - `n8n` 1 GiB
  - `n8n-db` 512 MiB
  - «Caché de páginas y margen ≈ 1.5 GiB» (rayado)
- Encima, una llave sobre los cinco contenedores: «Límites `memory.max`: 2 GiB en total».

**Imagen B (abajo izquierda): medidor vertical del contenedor `api`**
- Barra de 0 a 256 MiB.
- Línea en 192 MiB rotulada `--max-old-space-size=192` → «V8 recolecta basura antes».
- Línea roja en 256 MiB rotulada `memory.max` → «OOM killer → código 137».

**Texto (abajo derecha):**
- n8n nunca recibe imágenes: los comprobantes van a Storage.
- Historial de ejecuciones: 14 días (`EXECUTIONS_DATA_MAX_AGE=336`).
- `max_connections=30`: un proceso por conexión.

**Notas:** OOM killer por cgroup; experimento E2 (código de salida 137).

---

### Diapositiva 14 — Productor–consumidor: el *outbox*

**Imagen (70 %): de izquierda a derecha**
- **Productores:** tres cajas de la zona VPS apiladas: «`POST /api/public/orders`», «`POST /webhooks/whatsapp`», «`PATCH` de estado (KDS)». Flecha común hacia la tabla: «INSERT en la misma transacción».
- **Tabla `event_outbox`** dibujada como cuadrícula de 6 filas con columnas `id` · `event_type` · `status` · `attempts` · `locked_until`. Estados de ejemplo, uno por fila: `pending`, `pending`, `processing`, `processing`, `delivered`, `dead` (en rojo).
- **Consumidores:** «outbox-worker A» y «outbox-worker B» (ambos discontinuos). Flechas «`UPDATE … FOR UPDATE SKIP LOCKED`» que toman filas **distintas**: las filas de A sombreadas en azul y las de B en naranja.
- Flecha hacia «n8n»: «`POST /webhook/rtq-events` (Header Auth)». Flecha de vuelta: «200 al final del flujo → `delivered`».
- **Recuadro inferior «reserva por tiempo»:** línea de tiempo `t0` «reclama» → `t0 + 60 s` «`locked_until`»; una ✕ roja en `t0 + 20 s` «el consumidor muere»; después de `t0 + 60 s`, «el evento vuelve a estar disponible».

**Texto (30 %):** tabla de equivalencias

| Concepto | Diseño |
|---|---|
| *Buffer* | `event_outbox` |
| Exclusión mutua | `SKIP LOCKED` |
| Lock con tiempo | `locked_until` |
| Espera sin ocupar CPU | 1 s → 10 s |
| Entrega | al menos una vez |

**Notas:** por qué no hay espera activa; por qué la reserva por tiempo reemplaza al bloqueo de fila cuando cada llamada RPC es una transacción corta; experimentos E5 y E7.

---

### Diapositiva 15 — Condiciones de carrera: idempotencia y *compare-and-swap*

**Imagen A (izquierda, 55 %): diagrama de secuencia**
- Participantes: «Cajero A», «Cajero B», «API», «PostgreSQL».
- A y B leen el pago con `version = 3`.
- A → API: «verify (version 3)» → `UPDATE … WHERE version = 3` → «1 fila» → «200» (verde).
- B → API: «verify (version 3)» → `UPDATE … WHERE version = 3` → «0 filas» → «409 · el panel recarga» (rojo).

**Imagen B (derecha, 45 %): diagrama de secuencia**
- Participantes: «n8n», «API», «`idempotency_keys`».
- n8n → API: «`Idempotency-Key: <event_id>`» → la clave no existe → «ejecuta y guarda la respuesta».
- n8n → API (reintento, flecha discontinua): la misma clave → existe → «devuelve la respuesta anterior».
- Al pie: «Efecto exactamente una vez».

**Texto (abajo):**
- Orden fijo de bloqueos: primero `orders`, luego `payments`.
- Transacciones cortas, sin llamadas a Meta dentro.

**Notas:** la carrera de «comprobar y luego actuar» entre dos `await`, resuelta por la restricción única (código `23505` → 409); prevención de interbloqueos; experimento E6.

---

### Diapositiva 16 — Redes de Docker y puertos

**Imagen (70 %): tres rectángulos de red superpuestos parcialmente**
- `edge`: `caddy` y `api`
- `backend`: `api`, `outbox-worker` (discontinuo) y `n8n`
- `n8n_db`: `n8n` y `n8n-db`, con la etiqueta «`internal: true`» y un globo terráqueo tachado: «sin salida a Internet»
- `api` aparece en la intersección de `edge` y `backend`; `n8n`, en la intersección de `backend` y `n8n_db`.
- Encima de `caddy`: flechas desde Internet en «443» y «80 (ACME)». Una flecha `/internal/*` termina en una ✕ roja: «404».
- Nota junto a las redes: «DNS interno `127.0.0.11`: `api`, `n8n` por nombre».
- Fuera de la VPS: «Laptop del administrador» → flecha «túnel SSH puerto 22» → «`127.0.0.1:5678` del host» → `n8n`.

**Texto (30 %):** tabla de puertos simplificada

| Ruta | Puerto | Público |
|---|---|---|
| Internet → `caddy` | 443 / 80 | Sí |
| `caddy` → `api` | 3000 | No |
| `outbox-worker` → `n8n` | 5678 | No |
| `n8n` → `n8n-db` | 5432 | No |
| Administrador → editor | 22 (túnel) | Solo SSH |

**Notas:** un *namespace* de red por contenedor, *bridge* y pares `veth`; por qué la API escucha con `--lan` dentro del contenedor (H4).

---

### Diapositiva 17 — Docker se salta el cortafuegos *(opcional)*

**Imagen: flujo de un paquete por netfilter, de izquierda a derecha**
- «Paquete entrante a `:5678`» → «`PREROUTING` (nat): DNAT de Docker» → se bifurca:
  - **Camino real (rojo):** «`FORWARD`: `DOCKER-USER` → `DOCKER` (acepta)» → «contenedor».
  - **Camino que se esperaría (gris, discontinuo, con ✕):** «`INPUT`: reglas de `ufw`», con la nota «no se evalúan para este paquete».
- Debajo, dos tarjetas comparativas:
  - Roja: `ports: ["5678:5678"]` → «editor de n8n expuesto».
  - Verde: `ports: ["127.0.0.1:5678:5678"]` → «solo *loopback* del host».

**Texto:** «Diseño: solo `caddy` publica 80 y 443.» · «Experimento E10.»

**Notas:** las cadenas de iptables de Docker se evalúan antes que las de `ufw`.

---

### Diapositiva 18 — Hallazgo H3: la IP real del cliente

**Imagen (70 %): cadena de 4 saltos en horizontal**
- `Navegador (203.0.113.25 *ejemplo*)` → `Vercel (reescribe /api/*)` → `caddy` → `api`.
- Debajo de cada flecha, la IP que ve el siguiente salto como `remoteAddress`:
  - Vercel ve «203.0.113.25»
  - Caddy ve «IP de Vercel (variable)»
  - API ve «IP de `caddy` en `edge` (172.18.0.x *ejemplo*)»
- Sobre la cadena, una etiqueta tipo sobre que viaja: «`X-Forwarded-For: 203.0.113.25, <IP de Vercel>`», con una advertencia amarilla: «no verificable: Vercel no publica IP de salida fijas».
- A la derecha, dos tarjetas:
  - Roja con ✕: «Bloqueo por IP → bloquea a todo el personal».
  - Verde con marca: «Bloqueo por usuario + límite por teléfono».

**Texto (30 %):**
- Cada salto es una conexión TCP nueva.
- `remoteAddress` solo ve el salto anterior.
- Alternativa: servir el panel desde la VPS.

**Notas:** relación con sockets y NAT; por qué no se puede confiar en una cabecera que el cliente puede falsificar. Las direcciones son de documentación (RFC 5737) y de ejemplo.

---

### Diapositiva 19 — Almacenamiento y durabilidad

**Imagen A (izquierda, 50 %): overlay2 y volúmenes**
- Pila: «`node:24-alpine` (solo lectura)» → «`tools/` (solo lectura)» → «capa escribible (efímera)».
- En el contenedor `api`: candado con «`read_only: true`» y una caja «`tmpfs /tmp`».
- Cilindros de volumen conectados a su ruta:
  - `caddy_data` → `/data`
  - `n8n_data` → `/home/node/.n8n`
  - `n8n_db_data` → `/var/lib/postgresql/data`

**Imagen B (derecha, 50 %): dos caminos de escritura, de arriba abajo**
- **«JSON actual»:** `writeFileSync(tmp)` → `renameSync` → «caché de páginas» → «disco… eventualmente». Advertencia amarilla: «sin `fsync`: atómico pero no durable».
- **«PostgreSQL»:** `COMMIT` → «WAL» → `fsync` → marca verde «confirmado y durable» → «el *checkpointer* escribe las páginas después».

**Texto (abajo):**
- Permisos: UID 1000 (`node`), archivos `.env` con `600`.
- `N8N_ENCRYPTION_KEY` se guarda aparte: sin ella, las credenciales son ilegibles.
- Registros: `max-size 10m`, `max-file 3`.

**Notas:** atomicidad frente a durabilidad (H5); por qué un disco lleno detiene a PostgreSQL.

---

### Diapositiva 20 — Arranque, apagado y actualización

**Imagen A (arriba, 60 %): línea de tiempo tipo Gantt del arranque** (base: diagrama de secuencia de la sección 12.1)
- Filas: «kernel», «systemd», «docker.service», `n8n-db`, `api`, `n8n`, `caddy`, `outbox-worker`.
- Barras de inicio escalonadas: `n8n-db` y `api` arrancan en paralelo después de `docker.service`.
- Una marca verde «saludable» al final de la barra de cada servicio con *healthcheck* (`pg_isready`, `/health`, `/healthz`).
- Flechas de dependencia: `n8n-db` saludable → `n8n`; `api` saludable → `caddy`; `api` y `n8n` saludables → `outbox-worker`.

**Imagen B (abajo, 40 %): 5 pasos en fila con una flecha de retorno**
- «1. Respaldo» → «2. Cambiar `N8N_VERSION` (nunca `latest`)» → «3. `pull` + `up -d`» → «4. Comprobar `/healthz`» → «5. Listo».
- Flecha roja desde el paso 4 hacia el paso 2: «si falla: versión anterior + restaurar».

**Texto:** `restart: unless-stopped` · `depends_on: service_healthy` · Experimento E8.

**Notas:** orden de arranque basado en la salud real del servicio y no solo en su inicio.

---

### Diapositiva 21 — Respaldo y recuperación

**Imagen (70 %): tubería de izquierda a derecha**
- `rtq-backup.timer` («03:30 · `Persistent=true`») → `rtq-backup.service` («`Nice=10` · `IOSchedulingClass=idle`») → `backup.sh`, con 4 pasos numerados apilados:
  1. «`pg_dump` de `n8n-db`»
  2. «exportar workflows»
  3. «`pg_dump` de Supabase (contenedor `postgres:17`, `--env-file`)»
  4. «`tar` | `age` (cifrado)»
- → `rclone` → nube «almacenamiento remoto».
- Aparte, una caja con candado «Gestor de contraseñas: `N8N_ENCRYPTION_KEY`, archivos `.env`», unida con una línea punteada a la etiqueta «se guardan aparte».
- Dos insignias arriba a la derecha: «RPO 24 h» y «RTO 2 h».

**Texto (30 %):**
- Restauración probada una vez al mes (E9).
- El `pg_dump` debe ser de la misma versión mayor que el servidor.
- Supabase gratuito: verificar qué respaldos incluye el plan.

**Notas:** un respaldo que nunca se restauró no está comprobado.

---

### Diapositiva 22 — Capacidad y rendimiento *(opcional)*

**Imagen A (izquierda): tarjetas con cifras grandes**
- «3 paneles × 1 consulta cada 2.5 s × 2 RPC ≈ **144 llamadas/min**»
- «500 pedidos/mes × 6–8 eventos ≈ **4 000 eventos/mes**»
- «Respuesta del KDS: **crece con todos los pedidos**», en rojo, con la nota H6.

**Imagen B (derecha): flecha de «cuello de botella»**
- «CPU: holgada» (verde) · «Memoria: holgada» (verde) · «Latencia a Supabase» (amarillo) · «Tamaño de respuesta del KDS» (rojo).

**Texto:** «2 vCPU y 4 GiB sobran para el MVP.»

**Notas:** el primer límite previsible es de red y de datos, no de CPU.

---

### Diapositiva 23 — Laboratorio (1/2): E1 a E5

**Imagen: tabla de 4 columnas** (copiar exactamente de la sección 16)

| ID | Concepto | Comando clave | Resultado esperado |
|---|---|---|---|
| E1 | *Namespaces* | `nsenter -t $PID -n ip addr` | Solo `lo` y `eth0` |
| E2 | OOM killer | `docker run --rm -m 64m node:24-alpine …` | Código 137 |
| E3 | Bloqueo y *pool* de hilos | Script del Anexo G | 262 ms frente a 11 ms |
| E4 | Señales y PID 1 | `time docker stop rtq-api` | 10 s frente a menos de 1 s |
| E5 | Exclusión mutua | Dos `psql` con `SKIP LOCKED` | Filas distintas sin esperar |

- Columna de comandos en monoespaciada de 14 pt. La columna «Concepto» en violeta.

**Notas:** advertir que se ejecutan en una VM de laboratorio, nunca en producción.

---

### Diapositiva 24 — Laboratorio (2/2): E6 a E10

| ID | Concepto | Comando clave | Resultado esperado |
|---|---|---|---|
| E6 | Condición de carrera | Dos `curl` a `/verify` con la misma `version` | 200 y 409 |
| E7 | Tolerancia a fallos | `docker kill rtq-n8n` con eventos pendientes | Se entregan al volver, sin duplicar efectos |
| E8 | Arranque | `sudo reboot` | Todo vuelve saludable solo |
| E9 | Recuperación | `pg_restore` en un contenedor temporal | La misma cantidad de workflows |
| E10 | Cortafuegos | Publicar `8080:80` con `ufw` bloqueando 8080 | Responde pese a `ufw` |

- Mismo formato que la diapositiva 23. Marcar E6 con la etiqueta amarilla «requiere `/verify` (por implementar)».

---

### Diapositiva 25 — Riesgos

**Imagen: matriz de 3 × 3**, con «Probabilidad» (baja, media, alta) en el eje X y «Impacto» (bajo, medio, alto) en el eje Y. Colocar cada riesgo como una etiqueta corta:

| Riesgo | Probabilidad | Impacto |
|---|---|---|
| Bloqueo del bucle (H1) | Alta | Medio |
| Respuestas del KDS sin límite (H6) | Alta | Medio |
| Supabase gratuito se pausa | Media | Alto |
| Disco lleno | Media | Alto |
| VPS única | Baja | Alto |
| Pérdida de `N8N_ENCRYPTION_KEY` | Baja | Alto |
| Editor de n8n expuesto | Baja | Alto |

- Celdas con gradiente de verde (abajo izquierda) a rojo (arriba derecha). Al lado de cada etiqueta, la mitigación en 4 palabras o menos (de la sección 17).

---

### Diapositiva 26 — Conclusiones y próximos pasos

**Texto (izquierda, 50 %):**
- n8n coordina; la API y PostgreSQL garantizan la consistencia.
- Cada requisito se cumple con un mecanismo del SO.
- El código actual tiene hallazgos que el despliegue obliga a corregir.
- 2 vCPU y 4 GiB bastan para el MVP.

**Imagen (derecha, 50 %): lista de verificación vertical con casillas vacías** (próximos pasos, en este orden)
1. `crypto.scrypt` asíncrono (H1)
2. Manejador de `SIGTERM` + `init: true` (H2)
3. Bloqueo por usuario (H3)
4. Filtros del KDS en la base (H6)
5. `/health` en la API
6. `tools/outbox-worker.js`

Pie de diapositiva: «Documentos: `documentacion/SO2_DISENO_DESPLIEGUE_N8N.md` · `documentacion/ARQUITECTURA_N8N_WHATSAPP.md`». Agregar después una diapositiva final con «Preguntas».

---

## Parte 4. Comprobación antes de presentar

- [ ] Las cifras 262, 11, 267 y 77 ms aparecen exactamente así y con su condición de medición.
- [ ] `outbox-worker`, n8n, `/health`, `/verify` y la entrada pública de pedidos se ven como «Por implementar».
- [ ] No hay logotipos de terceros ni texto deformado en los diagramas.
- [ ] Los nombres de variables, archivos y comandos coinciden con `SO2_DISENO_DESPLIEGUE_N8N.md`.
- [ ] Las IP y los PID de ejemplo llevan la etiqueta «(ejemplo)».
- [ ] Cada diagrama indica su fuente en la esquina inferior derecha.
