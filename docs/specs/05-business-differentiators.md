# Capítulo 05: Análisis de Diferenciadores Clave frente a Software Genérico

Este capítulo documenta de forma exhaustiva y fundamentada en código los pilares arquitectónicos y funcionales que diferencian a **Yanesu Shisutemu** de los sistemas convencionales de punto de venta (POS) y ERPs comerciales genéricos (tales como Odoo, Loyverse, SAP Business One o soluciones de facturación estándar).

El sistema fue concebido para resolver la intersección crítica entre el negocio de comercialización de licores al detal/mayor y los desafíos operativos extremos de economías de alta inflación y multimoneda (específicamente la realidad económica venezolana).

---

## 1. Matriz Comparativa Ejecutiva

La siguiente matriz contrasta los enfoques de la industria genérica frente a la solución implementada en **Yanesu Shisutemu**:

| Dimensión Técnica / Operativa | Software POS / Inventario Genérico | Yanesu Shisutemu |
| :--- | :--- | :--- |
| **Moneda Base Contable** | Moneda local única. Revalorización manual o módulos multimoneda con desajustes contables en hiperinflación. | **Dólar estadounidense (USD)** como ancla contable de capital de trabajo; liquidación operativa en Bolívares (VES). |
| **Tasas de Cambio** | Registro estático manual o dependiente de APIs bancarias internacionales (no oficiales en Venezuela). | **Scraping automatizado del BCV** (`bcv_scraper.py`), difusión en vivo vía SSE (`/stream`) y preservación a 4 decimales. |
| **Cobro en Mostrador** | Monomoneda o división básica que asume paridad estable; sin cálculo cruzado en tiempo real. | **Cobro mixto en vivo** (USD efectivo + Pago Móvil + Punto de Venta) con cálculo instantáneo de vueltos y saldos en ambas monedas. |
| **Aritmética Financiera** | Uso generalizado de coma flotante IEEE 754 (`float`/`double`), propenso a micro-errores acumulativos. | **Prohibición estricta de `float`**. Uso exclusivo de `Decimal` con redondeo bancario `ROUND_HALF_UP` y tolerancia de $0.01 para clientes JS. |
| **Gestión de Cerveza Retornable** | Tratamiento como producto simple: se descuenta el líquido y se ignora el envase de vidrio y el huacal. | **Trazabilidad física de ciclo cerrado**: control simultáneo de `LLENO`, `VACIO` y `CASILLERO` (Polar 222ml y 333ml). |
| **Auditoría de Envases** | Ninguna; las mermas por botellas rotas o pérdidas en mostrador van a pérdidas genéricas. | **Reportes de conteo físico y conciliación** con cálculo automático de diferencias contra stock teórico del sistema. |
| **Acceso Directivo Remoto** | Dashboards web pesados con login tradicional; nula interacción conversacional o automatizada. | **Agente Ejecutivo Telegram / n8n**: reportes programados a las 9:30 AM y Function Calling para consultas en lenguaje natural. |
| **Seguridad de Integración M2M** | Credenciales de usuario compartidas o tokens estáticos en texto plano. | **Autenticación `X-API-Key`** con hash criptográfico SHA-256 en BD y auditoría no repudiable en `log_action()`. |
| **Estrategia de Despliegue** | 100% dependiente de la nube (inoperable ante caídas de internet) o instalador cliente-servidor legacy. | **Arquitectura Híbrida**: Modo Desktop 100% Offline (Tauri 2 + SQLite) y Modo Cloud/VPS (Docker + PostgreSQL 16). |
| **Recepción de Facturas Proveedor** | Transcripción manual renglón por renglón por parte del operador; propensa a erratas y desidia. | **Ingestión multimodal Gemini AI** con pipeline desacoplado en dos fases (metadatos e ítems) y revisión *Human-in-the-Loop*. |

---

## 2. Pilar 1: Motor Financiero Dual (USD Contable / BCV Operativo)

### 2.1. El Problema de la Hiperinflación y Devaluación
En entornos económicos con volatilidad cambiaria constante, manejar el costo de inventario y los precios de venta en moneda nacional genera una pérdida invisible e inmediata del capital de trabajo:
1. Una compra registrada en moneda local pierde valor adquisitivo en días.
2. La reposición de inventario requiere más bolívares de los que entraron por las ventas previas si los precios no se recalculan continuamente.
3. El comerciante experimenta una "ilusión de ganancia" mientras su inventario físico disminuye.

### 2.2. Valoración Base en Dólares (USD Anchor)
En **Yanesu Shisutemu**, la contabilidad y el costo de reposición se anclan permanentemente en **USD**:
- Todo producto almacena su estructura de costos en dólares: `precio_costo_caja_usd`, `precio_unidad_usd`, `precio_caja_usd` (`backend/app/models/product.py`).
- Las compras a proveedores se liquidan registrando tanto el importe pactado como la tasa de cambio vigente (`Factura.tasa_bs`), calculando el costo real unitario en USD (`DetalleFactura.costo_unitario_usd`).
- De este modo, la rentabilidad y el valor del negocio se mantienen estables independientemente de la devaluación de la divisa local.

```
                              ARQUITECTURA DE VALORACIÓN DUAL
                              
    +--------------------------------------------------------------------------+
    |                        ANCLA CONTABLE (USD)                              |
    |  - Costo de Adquisición USD (`precio_costo_caja_usd`)                     |
    |  - Reglas de Margen Comercial (% Ganancia)                               |
    |  - Precio de Venta Base USD (`precio_unidad_usd` / `precio_caja_usd`)     |
    +--------------------------------------------------------------------------+
                                       |
                                       | Conversión Dinámica (x Tasa Oficial BCV)
                                       v
    +--------------------------------------------------------------------------+
    |                    LIQUIDACIÓN OPERATIVA TRANSACCIONAL (VES)             |
    |  - Tasa BCV Oficial en Tiempo Real (`app.core.bcv_scraper`)               |
    |  - Emisión de Totales y Subtotales Fiscales en Bolívares (VES)            |
    |  - Cobro Mixto Multidivisa en Mostrador POS                              |
    +--------------------------------------------------------------------------+
```

### 2.3. Adquisición Automatizada de Tasa BCV y Difusión SSE
Para garantizar el cumplimiento de la normativa cambiaria oficial sin intervención humana:
1. **Scraping Robusto (`backend/app/core/bcv_scraper.py`):**
   - La función `fetch_bcv_rates()` consulta el portal oficial `https://www.bcv.org.ve` mediante `requests` y `BeautifulSoup`.
   - Extrae los contenedores `#dolar` y `#euro`, normaliza separadores decimales (reemplaza comas por puntos) y construye valores exactos de `Decimal` a 4 decimales:
   ```python
   # backend/app/core/bcv_scraper.py (L35-65)
   normalized = raw.replace(",", ".").replace(" ", "")
   return Decimal(normalized).quantize(Decimal("0.0001"))
   ```
2. **Histórico y Difusión Reactiva:**
   - La tasa se persiste mediante `save_rates()` vinculada al administrador y con timestamp (`backend/app/services/exchange_rate_service.py`).
   - El endpoint `GET /api/exchange-rates/stream` (`backend/app/routes/exchange_rates.py:120`) utiliza Server-Sent Events (SSE) a través de `rate_broadcaster`.
   - Cuando se registra o actualiza la tasa del día, todos los terminales de punto de venta activos reciben el evento instantáneamente, actualizando los precios en pantalla en menos de 200 ms sin requerir recargar la página.

### 2.4. Cobro Mixto Multidivisa en Mostrador (Split Checkout)
En el comercio minorista diario, los clientes pagan típicamente combinando efectivo en dólares, bolívares en tarjeta de débito y transferencias móviles.
- **Componente:** `frontend/src/features/sales/components/CheckoutSplitPayment.tsx` y hook `useCheckout.ts`.
- **Cálculo en Vivo:** A medida que el cajero introduce importes en cualquiera de los métodos configurados (ej. $20 en efectivo USD y 500 Bs por Punto de Venta), el motor de checkout:
  1. Convierte cada pago a su equivalente en USD mediante `val / tasaNum` (si el método es VES) o suma directa (si es USD).
  2. Calcula el total pagado en USD y en VES.
  3. Muestra una barra de progreso reactiva (`progressPct`).
  4. Determina si el pago cubre la cuenta con una tolerancia de 1 céntimo (`suficiente = pagadoMoneda >= totalMoneda - 0.01`).
  5. Calcula el vuelto exacto a devolver al cliente (`vueltoUSD` y `vueltoVES`) en la moneda que corresponda según la modalidad de pago predominante.
- **Descuentos en Divisas Integrados:** Si existen reglas de precio promocionales por pago en efectivo USD (`get_active_divisas_prices`), el POS valida que la porción en divisas cubra los artículos bajo promoción antes de permitir el cierre de la venta.

---

## 3. Pilar 2: Arquitectura de Precisión Decimal Estricta (Cero Floats)

### 3.1. La Falla de la Coma Flotante Binaria (IEEE 754)
La gran mayoría de los sistemas genéricos desarrollados en Node.js, Python o PHP emplean tipos de datos numéricos de coma flotante nativos (`float`, `double`). En aritmética binaria de punto flotante:
$$0.1 + 0.2 = 0.30000000000000004$$
En un comercio con cientos de transacciones diarias, multiplicar unidades por precios unitarios en `float` produce descuadres acumulativos en:
- Subtotales de ítems.
- Base imponible y cálculo de alícuota del 16% de IVA.
- Totales de caja y conciliaciones bancarias al final de la jornada.

### 3.2. Mandato Institucional en el Backend
El archivo rector de arquitectura `.opencode/rules/backend_rules.md` (Sección 0) impone una regla absoluta: **"SIEMPRE `Decimal`, NUNCA `float` para dinero, stock, tasas o porcentajes"**.

1. **Construcción Segura:** Prohibido construir `Decimal` a partir de floats binarios. Siempre se construye desde cadenas:
   ```python
   precio = Decimal(str(item["precio_unitario"]))  # CORRECTO
   # precio = Decimal(item["precio_unitario"])     # PROHIBIDO (arrastra ruido IEEE 754)
   ```
2. **Redondeo Bancario `ROUND_HALF_UP`:** Todas las operaciones aritméticas intermedias y finales se cuantizan explícitamente:
   ```python
   subtotal = (Decimal(cantidad) * precio).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
   total = (exento + base + iva).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
   ```
3. **Modelos SQLAlchemy 2.0 y Esquemas Pydantic v2:**
   - Columnas definidas como `DECIMAL(10, 2)` y anotadas con tipo `Mapped[Decimal]`.
   - Esquemas Pydantic validan que los precios tengan como máximo 2 decimales y rechazan cualquier entrada con más cifras fraccionarias (HTTP 422).
   - Las tasas de cambio se definen formalmente como `DECIMAL(10, 4)` con 4 dígitos decimales de precisión.

### 3.3. Mitigación de Coma Flotante en Clientes JavaScript y Tolerancia de Validación
JavaScript carece de un tipo monetario decimal nativo (todos los números son flotantes de 64 bits `number`).
Para evitar que clientes web generen rechazos por micro-diferencias binarias:
1. **Redondeo por Operación Acumulada en Frontend (`frontend_rules.md`):**
   ```typescript
   const subtotal = Math.round(item.cantidad * item.precio_unitario_usd * 100) / 100;
   const total = Math.round((base + iva) * 100) / 100;
   ```
2. **Ventana de Tolerancia en Backend (`backend/app/services/sale_service.py`):**
   - El backend actúa siempre como la **fuente suprema de verdad financiera**, recalculando de forma autónoma el exento, la base y el IVA canónicos.
   - Aplica una tolerancia estricta de exactamente un céntimo (`_TOLERANCIA_MONTOS = Decimal("0.01")`):
   ```python
   # backend/app/services/sale_service.py:38-40
   def _dentro_tolerancia(valor: Decimal, esperado: Decimal) -> bool:
       """El frontend redondea con floats; se tolera hasta 1 céntimo de diferencia."""
       return abs(valor - esperado) <= _TOLERANCIA_MONTOS
   ```
   Si la diferencia supera $0.01, la transacción se aborta con error `ValueError("Montos inválidos en la venta")`.

### 3.4. Evidencia en Pruebas de Regresión (`test_decimal_precision.py`)
La suite de pruebas automatizadas en `backend/tests/test_decimal_precision.py` valida sistemáticamente esta disciplina:
- **`TestProductPriceDecimals`:** Verifica que precios enteros (ej. `30`) se serialicen como `"30.00"` y rechaza números con 4 decimales (`25.1234` $\to$ 422 Unprocessable Entity).
- **`TestExchangeRateDecimals`:** Comprueba que las tasas cambiarias mantengan estrictamente 4 decimales (`"90.5000"`, `"36.1234"`).
- **`TestAggregationPrecision`:** Simula pagos fraccionarios de facturas con riesgo de ruido binario (`33.33 + 33.33 + 33.34 = 100.00 exacto`) y verifica que agregaciones SQL complejas vía `func.sum()` no introduzcan decimales fantasmas ni en ingresos ni en saldos pendientes.

---

## 4. Pilar 3: Control de Envases Retornables de Licorería (Ciclo Físico Cerrado)

### 4.1. La Peculiaridad Física del Sector Licores
En el negocio de licorerías y depósitos de cerveza en América Latina, el envase de vidrio y el huacal de plástico representan una inversión de capital equivalente o superior al propio contenido líquido.
- Las cervezas retornables (marcas líderes: Polar Pilsen, Polar Light, Solera) se comercializan en dos presentaciones estándar:
  1. **Polar 222ml:** Cajas/casilleros de **36 botellas**.
  2. **Polar 333ml ("Tercio"):** Cajas/casilleros de **24 botellas**.
- Los ERPs genéricos de retail manejan el producto como "Cerveza Polar 222ml (Unidad/Caja)". Cuando se vende, descuentan el stock de líquido, pero son ciegos respecto a si el cliente entregó un envase vacío a cambio, si se le cobró un depósito de garantía, o cuántos envases vacíos quedan en el depósito trasero para canjear con el camión de la distribuidora.

### 4.2. Tríada de Estados Físicos del Envase
El modelo `backend/app/models/retornable.py` estructura un seguimiento riguroso a través de tres estados mutuamente excluyentes:

```
                      MÁQUINA DE ESTADOS DEL ENVASE RETORNABLE
                      
       [ VENTA EN MOSTRADOR ]                    [ RECEPCIÓN PROVEEDOR ]
                 |                                          |
                 v                                          v
       -1 Botella LLENO                           +1 Botella LLENO
       +1 Botella VACIO                           -1 Botella VACIO
                 |                                          |
    +------------+-------------+              +-------------+------------+
    |                          |              |                          |
    v                          v              v                          v
+-------------+         +-------------+         +-------------+
|    LLENO    |         |    VACIO    |         |  CASILLERO  |
| En Anaquel  |         | En Depósito |         | Plásticos   |
| (Disponible)|         | (Retornable)|         | (Huacales)  |
+-------------+         +-------------+         +-------------+
       ^                                               ^
       |                                               |
       +------------------- CONCILIACIÓN --------------+
                            Reportes Físicos Semanales
                            Auditoría de Mermas / Roturas
```

1. **`LLENO`:** Botellas llenas con líquido comercializables en piso de venta.
2. **`VACIO`:** Botellas vacías almacenadas en el negocio que pertenecen al ciclo de intercambio con el proveedor.
3. **`CASILLERO`:** El huacal o estructura plástica que contiene las 36 o 24 botellas.

### 4.3. Hooks Transaccionales Automáticos
El servicio `backend/app/services/retornable_service.py` se engancha de forma transparente al ciclo de vida de compras y ventas:

1. **Venta al Cliente (`procesar_venta`):**
   ```python
   # backend/app/services/retornable_service.py:596-632
   def procesar_venta(db, product, botellas_descontadas, referencia_id, usuario_id):
       # Descuenta del inventario de llenos
       registrar_movimiento(..., estado="LLENO", delta_botellas=-botellas_descontadas, tipo_movimiento="VENTA")
       # Incrementa el inventario de vacíos retornados
       registrar_movimiento(..., estado="VACIO", delta_botellas=botellas_descontadas, tipo_movimiento="VENTA")
   ```
2. **Recepción de Factura de Proveedor (`procesar_compra`):**
   ```python
   # backend/app/services/retornable_service.py:634-670
   def procesar_compra(db, product, botellas_agregadas, referencia_id, usuario_id):
       # Entran botellas llenas
       registrar_movimiento(..., estado="LLENO", delta_botellas=botellas_agregadas, tipo_movimiento="COMPRA")
       # Salen botellas vacías entregadas al camión
       registrar_movimiento(..., estado="VACIO", delta_botellas=-botellas_agregadas, tipo_movimiento="COMPRA")
   ```

### 4.4. Auditoría Física y Detección de Fugas
La rotura accidental de botellas y el hurto de envases son fugas financieras comunes en este sector.
El sistema ofrece:
- **Toma de Conteo Físico (`crear_reporte`):** Los empleados cuentan las botellas físicas por estado (`LLENO`, `VACIO`, `CASILLERO`).
- **Cálculo de Discrepancias:** La función `_construir_presentacion_out` compara el conteo físico contra el stock esperado calculado a partir de las ventas y compras registradas (`dif_botellas`, `dif_vacio_botellas`).
- **Confirmación con Generación de Movimientos (`confirmar_reporte`):** Ajusta el inventario real y crea registros de auditoría bajo el tipo de movimiento `REPORTE`.

---

## 5. Pilar 4: Agente Ejecutivo de Telegram con n8n y M2M Function Calling

### 5.1. El Reto Directivo: Acceso en Tiempo Real sin Fricción
Los propietarios de licorerías y pequeños comercios rara vez operan sentados frente a un computador de escritorio. Pasan la mayor parte del tiempo fuera del local, en compras de reposición o supervisando depósitos.
Obligar al dueño a ingresar por VPN o abrir un navegador web móvil para revisar las ventas nocturnas genera fricción y desinformación.

### 5.2. Arquitectura de Integración M2M
**Yanesu Shisutemu** integra un puente máquina-a-máquina (M2M) con la plataforma de orquestación **n8n** y un bot directivo en **Telegram**:

```
+-------------------+      Mensaje de Voz o Texto      +-------------------+
|  Propietario /    | -------------------------------> |   Bot Telegram    |
|  Gerente General  | <------------------------------- |   (Canal Seguro)  |
+-------------------+       Respuesta Analítica        +-------------------+
                                                                 |
                                                                 v
                                                       +-------------------+
                                                       |    Servidor n8n   |
                                                       |  (Agente LLM con  |
                                                       | Function Calling) |
                                                       +-------------------+
                                                                 |
                                            HTTP GET con         |
                                            X-API-Key            |
                                                                 v
                                                       +-------------------+
                                                       |  FastAPI Backend  |
                                                       |  /api/n8n/tools/* |
                                                       +-------------------+
```

### 5.3. Reportes Ejecutivos Proactivos y Automáticos
El sistema no espera a que el usuario consulte; informa activamente:
1. **Reporte Diario Matutino (9:30 AM - `/api/n8n/reports/daily`):**
   - Disparado automáticamente cada mañana por un cron en n8n.
   - Consolida: total vendido en USD y VES del día anterior, conteo de transacciones, ticket promedio, desglose porcentual por método de pago (Efectivo vs Pago Móvil vs Punto de Venta) y Top 5 productos más vendidos (`get_daily_sales_report`).
2. **Reporte Semanal de Cierre (Sábados por la noche - `/api/n8n/reports/weekly`):**
   - Agrupa ventas de lunes a sábado.
   - Determina el día récord de facturación (`best_day`), la categoría líder de ingresos, el promedio de venta diario y el resumen crítico de cuentas por pagar: total adeudado a proveedores en USD (`total_pending_usd`) y fecha del vencimiento más próximo (`soonest_due_date`).

### 5.4. Catálogo de Herramientas para LLM (Function Calling)
Bajo el prefijo `/api/n8n/tools/` (`backend/app/routes/n8n_agent.py`), el backend expone un conjunto de endpoints REST optimizados como herramientas de ejecución de funciones para modelos de lenguaje (OpenAI / Claude / Gemini en n8n):

| Endpoint de Herramienta | Parámetros Clave | Caso de Uso Conversacional del Dueño |
| :--- | :--- | :--- |
| `GET /tools/products/search` | `q`, `low_stock`, `limit` | *"¿Cuánto ron Santa Teresa nos queda en el depósito?"* / *"Dime qué cervezas tienen stock crítico."* |
| `GET /tools/products/{id}/sales-history` | `product_id`, `start_date`, `end_date` | *"¿Cómo se ha vendido el Old Parr en las últimas dos semanas?"* |
| `GET /tools/sales/metrics` | `start_date`, `end_date` | *"¿Cuánto llevamos facturado en lo que va de mes?"* |
| `GET /tools/sales/peak-hours` | `start_date`, `end_date` | *"¿Cuáles fueron las horas pico de venta el viernes pasado?"* |
| `GET /tools/sales/search` | `target_date`, `start_time`, `end_time`, `product_name` | *"¿Se vendió alguna botella de Chivas después de las 9:00 PM anoche?"* |
| `GET /tools/invoices/search` | `q`, `status`, `due_after`, `due_before` | *"¿Cuáles facturas de Polar o Cervecería Regional vencen esta semana?"* |
| `GET /tools/system/exchange-rate` | `history`, `limit` | *"¿En cuánto abrió la tasa oficial del dólar hoy?"* |
| `GET /tools/categories/top` | `order_by` (`sales`/`revenue`/`margin`) | *"¿Cuál categoría dejó mayor margen de ganancia este mes: rones o cervezas?"* |
| `GET /tools/system/top-suppliers` | `limit` | *"¿A qué proveedor le hemos comprado más mercancía este trimestre?"* |

### 5.5. Seguridad Criptográfica y Auditoría No Repudiable
Las consultas directivas no utilizan sesiones de navegador ni credenciales de usuario regulares:
- **Autenticación `X-API-Key`:** Validada mediante `verify_api_key` (`backend/app/core/dependencies.py`). La clave en texto plano recibida en la cabecera se compara computando su hash SHA-256 contra el campo `ApiKey.key_hash` en base de datos.
- **Trazabilidad de Acceso:** Cada llamada a un endpoint `/n8n/*` dispara `_audit()` invocando a `log_action()` con `usuario="m2m:<nombre_clave>"`, IP de procedencia, tipo de consulta y parámetros ejecutados, garantizando la auditoría total de las peticiones realizadas por los agentes de IA.

---

## 6. Pilar 5: Arquitectura Híbrida: Desktop Offline (Tauri 2) vs Cloud (Docker Compose)

### 6.1. La Dicotomía de Infraestructura en Retail
En América Latina, depender exclusivamente de un software SaaS basado en la nube representa un riesgo operativo crítico:
- Las caídas de fibra óptica, el racionamiento eléctrico o las fallas de antenas celulares paralizan la caja registradora en horas pico de venta.
- No obstante, los comercios que crecen a múltiples sucursales o cajas en red requieren un servidor centralizado accesible vía web.
- La mayoría de los competidores fuerzan al cliente a elegir entre un software offline local desactualizado o un SaaS en la nube vulnerable a desconexiones.

### 6.2. Modo 1: Aplicación de Escritorio Autónoma (Tauri 2 + SQLite)
Para un único terminal de mostrador que debe operar al 100% sin conexión a internet:
- **Runtime Nativo Rust (Tauri 2):** En `licoreria-desktop/src-tauri/src/lib.rs`, la aplicación de escritorio empaqueta la interfaz web y gestiona el backend como un *sidecar* binario compilado con PyInstaller (`yanesu_shisutemu.exe`).
- **Asignación Dinámica de Puertos:** Para evitar conflictos si el puerto por defecto 8000 está ocupado por otro servicio, `port_manager.py` localiza un puerto TCP libre y lo escribe en `%LOCALAPPDATA%/YanesuShisutemu/.port`. El runtime de Rust lee dicho archivo y realiza un sondeo de salud contra `http://127.0.0.1:{port}/api/health` antes de cerrar la ventana de bienvenida (*splashscreen*) y presentar el POS al usuario.
- **Limpieza Rigurosa de Procesos en Windows:** PyInstaller puede dejar subprocesos hijos huérfanos al cerrarse la ventana principal. En `lib.rs:26-52`, la función `kill_sidecar_tree()` ejecuta un comando de sistema `taskkill /IM yanesu_shisutemu.exe /T /F` con bandera `CREATE_NO_WINDOW`, garantizando la terminación total de los procesos Python en memoria.
- **Persistencia en SQLite Local:** La base de datos reside en `%LOCALAPPDATA%/YanesuShisutemu/data/yanesu.db`, asegurando autonomía absoluta de facturación aun con caída total de internet.

```
                      MODO DESKTOPOFFLINE (TAURI 2)
  +-----------------------------------------------------------------+
  | Windows Host (%LOCALAPPDATA%/YanesuShisutemu/)                  |
  |                                                                 |
  |  +------------------------+        +-------------------------+  |
  |  |  Rust Tauri 2 Runtime  |        |    PyInstaller Sidecar  |  |
  |  |  (Webview2 Shell +     | <----> |   (FastAPI + SQLite)    |  |
  |  |   Proceso Guardian)    | .port  |   yanesu_shisutemu.exe  |  |
  |  +------------------------+        +-------------------------+  |
  |              |                                  |               |
  |              v                                  v               |
  |      [ Splashscreen ]                  [ yanesu.db Local ]      |
  |      [ Clean Taskkill ]               (Cero Internet Requerido) |
  +-----------------------------------------------------------------+
```

### 6.3. Modo 2: Despliegue Cloud / VPS (Docker Compose + PostgreSQL)
Para comercios medianos con múltiples terminales de cobro concurrentes, oficinas administrativas remotas o integración con n8n en servidores VPS:
- **Orquestación en `docker-compose.yml`:**
  - `db`: Contenedor `postgres:16-alpine` con volúmenes persistentes y argumentos de inicialización UTF-8.
  - `backend`: Contenedor FastAPI preconstruido desde GitHub Container Registry (`ghcr.io/jesus-1205/sistema_inventario_local-backend:master`), configurado con `DATABASE_URL` apuntando a PostgreSQL mediante `psycopg`.
  - `nginx`: Contenedor web con proxy inverso sirviendo el frontend React compilado.
  - `n8n`: Contenedor de automatizaciones con zona horaria configurada en `America/Caracas`.
- **Compatibilidad Dual-Dialect con Alembic:**
  - El código de modelos y migraciones no requiere bifurcaciones ni parches.
  - Gracias al uso de `render_as_batch=True` y convenciones de nombres estrictas en `backend/alembic/env.py`, el mismo esquema relacional se aplica sin cambios tanto en SQLite como en PostgreSQL 16.

---

## 7. Pilar 6: Recepción Inteligente de Facturas con Gemini AI (OCR Multimodal)

### 7.1. El Reto de la Entrada de Mercancía en Licorerías
La recepción de mercancía de proveedores de licores y bebidas es una de las tareas más propensas a errores:
- Las facturas y notas de entrega físicas venezolanas varían enormemente: formatos fiscales impresos en papel continuo matricial, hojas membretadas o notas de entrega manuales con sellos superpuestos.
- Una sola factura de cerveza o licores puede incluir decenas de renglones con variantes de presentación (ej. "POLAR PILSEN 36X222 RETORNABLE", "SOLERA VERDE 24X333 NO RETORNABLE", "POLAR LIGHT EN LATA 24X355").
- Transcribir a mano cada código, descripción, bultos y costo unitario toma entre 20 y 45 minutos por factura y conduce a desajustes de inventario por equivocaciones en el tipo de empaque (caja vs unidad).

### 7.2. Pipeline de Preprocesamiento de Imágenes
En `backend/app/services/invoice_service.py:203-253`, la función `optimize_image()` acondiciona las fotografías o escaneos antes de enviarlos a la API de IA:
1. **Detección de Formato:** Los archivos PDF se envían directamente como documentos multipágina.
2. **Normalización de Color:** Si la imagen contiene capas alfa o paleta indexada (`RGBA`, `LA`, `P`), se aplana sobre un lienzo blanco de fondo RGB puro (`Image.new("RGB", ...)`).
3. **Redimensión con Filtro Lanczos:** Si el ancho o alto supera los 2000 píxeles (`MAX_IMAGE_DIMENSION = 2000`), se reduce manteniendo la proporción exacta mediante remuestreo de alta calidad (`Image.LANCZOS`).
4. **Compresión JPEG al 85% (`JPEG_QUALITY = 85`):** Reduce drásticamente el peso en megabytes sin sacrificar la nitidez tipográfica necesaria para los números de factura y decimales de costo.

```
                  PIPELINE DE RECEPCIÓN DE FACTURAS CON IA
                  
  +-------------------------------------------------------------------------+
  |  1. CAPTURA Y PREPROCESAMIENTO                                          |
  |     Foto de Factura Física (Cámara / Escáner / PDF)                      |
  |     --> optimize_image() (LANCZOS 2000px, RGB Flatten, JPEG 85%)        |
  +-------------------------------------------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  2. EXTRACCIÓN DESACOPLADA EN DOS ETAPAS (Gemini 3.5 Flash Lite)        |
  |                                                                         |
  |     [ Request 1: Metadatos ]                 [ Request 2: Renglones ]   |
  |     Prompt: INVOICE_METADATA_PROMPT          Prompt: INVOICE_PRODUCTS   |
  |     - Proveedor Completo                     - Lista de Ítems en orden  |
  |     - Número de Factura / Control            - Tipo Empaque (Caja/Unid) |
  |     - Fechas (Emisión / Límite)              - Cantidad Comprada        |
  |     - Moneda Detectada (USD / BS)            - Costo Unitario Exacto    |
  +-------------------------------------------------------------------------+
                                       |
                                       v
  +-------------------------------------------------------------------------+
  |  3. REVISIÓN SUPERVISADA (HUMAN-IN-THE-LOOP)                            |
  |     Pantalla de Validación en React (Sin Inserción Automática a Ciegas) |
  |     - El operador verifica correspondencia con productos del catálogo    |
  |     - Registro de Bonificaciones / Obsequios Promocionales              |
  |     - Confirmación Explícita -> Persistencia Atómica en BD              |
  +-------------------------------------------------------------------------+
```

### 7.3. Extracción Desacoplada en Dos Fases
Para eliminar el problema clásico de alucinación donde los modelos LLM omiten renglones o mezclan los números de factura con las cantidades, `analyze_invoice_from_image()` ejecuta **dos solicitudes independientes** a Google Gemini (`gemini-3.5-flash-lite` con temperatura `0.0` y modo JSON estructurado):

1. **Fase 1: Extracción de Encabezado y Metadatos (`INVOICE_METADATA_PROMPT`):**
   - Extrae únicamente: nombre del proveedor, número de factura, fecha de emisión, fecha límite de crédito, moneda base y tipo de comprobante (`FACTURA` o `NOTA_ENTREGA`).
   - Limitada a `max_output_tokens=300`. Reglas heurísticas en el prompt previenen confundir marcas de productos con la razón social del proveedor.
2. **Fase 2: Extracción Estricta de Renglones (`INVOICE_PRODUCTS_PROMPT`):**
   - Extrae exclusivamente la tabla de productos en el **orden visual exacto** en que aparecen en el papel.
   - Discrimina el tipo de empaque (`CAJA` vs `UNIDAD`) y exige el costo unitario con sus decimales exactos (`max_output_tokens=2000`).

### 7.4. Filosofía *Human-in-the-Loop* (Supervisión Humana Obligatoria)
Una decisión fundamental de diseño en **Yanesu Shisutemu** es que **la IA jamás crea ni modifica registros en la base de datos de manera autónoma**:
- El endpoint `POST /api/invoices/analyze-ai` retorna el esquema estructurado `InvoiceAnalysisOut` a la interfaz React.
- El sistema precarga los campos en el formulario interactivo de compra.
- El usuario humano supervisa cada ítem, vincula los nombres de la factura con el ID de producto correspondiente en inventario, añade obsequios otorgados por el distribuidor (`ObsequioFacturaCreate`) y presiona finalmente el botón de confirmación.
- De este modo, la IA asume el 95% del trabajo pesado de transcripción mecánica, mientras que la responsabilidad contable permanece bajo control del personal autorizado.

---

## 8. Conclusiones Arquitectónicas

Los seis pilares descritos demuestran que **Yanesu Shisutemu** no es una plantilla genérica adaptada superficialmente, sino un sistema de ingeniería de software construido a la medida de un dominio comercial altamente exigente:
1. **Protección Patrimonial:** El ancla contable en USD y el motor cambiario BCV defienden al comercio de la descapitalización inflacionaria.
2. **Rigor Matemático:** La política institucional de tolerancia cero a los `float` garantiza exactitud bancaria en cada centavo transaccionado.
3. **Especialización Física:** El módulo de retornables resuelve una de las mayores fuentes de pérdida no contabilizada en el expendio de cervezas.
4. **Agilidad Directiva:** El agente conversacional de Telegram y n8n pone la analítica del negocio en el bolsillo del propietario sin barreras de entrada.
5. **Inmunidad a Fallas de Entorno:** El modo dual desktop offline y cloud asegura que la facturación nunca se detenga por fallas de conectividad externa.
6. **Eficiencia Asistida por IA:** El OCR multimodal con Gemini agiliza la recepción de inventario manteniendo al operador humano como garante final de la verdad contable.
