# Capítulo 04: Especificación de Funcionalidades Principales y Flujos de Usuario

Este documento detalla de manera exhaustiva y basada en evidencia técnica todas las funcionalidades operativas, reglas de negocio, máquinas de estado y flujos de usuario (*end-to-end*) de **Yanesu Shisutemu**. Cada sección documenta la interacción visual en la interfaz de usuario React 19, los controladores y rutas FastAPI, los servicios de orquestación transaccional y la persistencia en base de datos.

---

## 1. Punto de Venta (POS) y Gestión de Ventas

El módulo de Punto de Venta está optimizado para velocidad transaccional en mostrador, permitiendo operaciones mediante teclado, escáneres ópticos de códigos de barras, congelamiento de cuentas y cobros combinados multimoneda.

```
+---------------------------------------------------------------------------------------------------------+
|                                          PUNTO DE VENTA (POS)                                           |
|                                                                                                         |
|  [F2] Barra de Búsqueda / Escáner Barras  <--- Hardware Scanner (<80ms) / Fuzzy Name / SKU             |
|  +---------------------------------------------------+  +--------------------------------------------+  |
|  |             CATÁLOGO / GRILLA / COMBOS            |  |             CARRITO REACTIVO (F10)         |  |
|  |  [Todos] [Cervezas] [Licores] [Refrescos] [Combos] |  |  - Polar Pilsen 222ml (x6 uds)     $ 6.00  |  |
|  |  +---------------------+  +---------------------+ |  |  - Cacique Añejo 750ml (x1 cja)    $48.00  |  |
|  |  | Polar 222ml Retorn. |  | Combo Rumbero       | |  |  - Descuento Divisas Activo        [-$2.00]|  |
|  |  | Stock: 14 cjas / 8u |  | $ 25.00             | |  |--------------------------------------------|  |
|  |  | [ + Unidad ]        |  | [ Configurar ]      | |  |  Base Imponible (16% IVA):         $45.00  |  |
|  |  | [ + Caja ]          |  +---------------------+ |  |  IVA (16.00%):                     $ 7.20  |  |
|  |  +---------------------+                          |  |  Monto Exento:                     $ 7.00  |  |
|  +---------------------------------------------------+  |  TOTAL USD:                        $59.20  |  |
|                                                         |  TOTAL VES (BCV):               Bs 2,131.20|  |
|  ACCIONES DE CONTROL:                                   |--------------------------------------------|  |
|  [F7] Guardar en Espera   [F8] Cola Espera (3)  [F9] Vaciar |  [   PROCESAR COBRO (F10)   ]          |  |
+---------------------------------------------------------------------------------------------------------+
```

### 1.1. Búsqueda y Selección de Mercancía

1. **Escaneo de Código de Barras de Alta Velocidad:**
   - **Componente / Hook:** `frontend/src/features/sales/hooks/useBarcodeScanner.ts`.
   - **Mecanismo:** El hook intercepta eventos globales de teclado (`keydown`). Detecta ráfagas de caracteres donde el intervalo entre teclas es inferior al umbral de hardware (`SCANNER_THRESHOLD_MS = 80ms`), diferenciando un lector físico de pistola de la escritura manual del usuario.
   - **Comportamiento:** Al recibir el `Enter` final de la ráfaga, previene la propagación de eventos, ejecuta `api.getProducts({ search: barcode })`, busca coincidencia exacta sobre `codigo_barra` y agrega de inmediato una unidad al carrito (`addItem(product, "UNIDAD")`). Si no existe coincidencia, emite una alerta auditiva/visual en pantalla (`Toast` de error).

2. **Búsqueda Manual Asistida y Filtrado por Categorías:**
   - **Componentes:** `PosTopBar.tsx`, `ProductGrid.tsx`, `ProductCard.tsx`, `usePosSearch.ts`.
   - **Acceso Directo:** Tecla `F2` enfoca y selecciona instantáneamente el campo de búsqueda.
   - **Filtros Reactivos:** Búsqueda combinada por nombre y SKU. Barra horizontal de categorías para filtrado rápido con un clic (`usePosCatalog.ts`).
   - **Acciones Rápidas en Tarjeta:** Cada tarjeta presenta botones dedicados para añadir una unidad suelta o una caja completa, mostrando en tiempo real el stock bimodal disponible (`stock_cajas` y `stock_unidades`).

3. **Atajos de Teclado Globales del POS (`usePosKeyboard.ts`):**
   | Tecla | Acción Operativa | Componente Afectado |
   | :--- | :--- | :--- |
   | `F2` | Enfocar y seleccionar barra de búsqueda rápida | `PosTopBar` |
   | `F7` | Congelar venta actual (Hold Cart) | `HoldCartModal` |
   | `F8` | Abrir gaveta de ventas en espera | `HoldQueueDrawer` |
   | `F9` | Vaciar y resetear carrito actual | `cartStore.clearCart()` |
   | `F10` | Abrir cajón de cobro y checkout | `CheckoutDrawer` |
   | `Escape` | Cerrar checkout / Limpiar campo de búsqueda | `CheckoutDrawer` / `SearchInput` |

---

### 1.2. Carrito de Compras y Cola de Espera (`Hold Queue`)

1. **Estado Reactivo del Carrito (`cartStore.ts`):**
   - Mantiene en memoria el mapa de ítems indexados por clave única (`cartItemId`).
   - Permite conmutar en línea entre empaque `UNIDAD` y `CAJA`, recalcula las unidades totales a descontar (`unidades_descontadas = cantidad * unidades_por_caja`), actualiza cantidades y conmuta la aplicación de precios de descuento por divisas (`toggleDivisas`).
   - Congela una captura de la tasa de cambio vigente (`snapshotTasa`) para aislar la cotización durante la negociación de la venta.

2. **Gestión de Esperas (`Hold Queue` - `holdQueueStore.ts`):**
   - **Propósito:** Permitir al cajero pausar la atención de un cliente que olvidó un producto o busca efectivo, sin perder los ítems cargados, para atender inmediatamente al siguiente cliente en cola.
   - **Capacidad:** Almacena hasta 10 tickets congelados en `localStorage` bajo la clave `"yanesu-hold-queue-v1"`.
   - **Estructura de Ticket Congelado (`HeldCart`):**
     - `id`: Identificador determinista generado por timestamp y hash pseudoaleatorio.
     - `label`: Etiqueta descriptiva personalizada o auto-generada con formato `"Venta DD/MM HH:mm"`.
     - `savedAt`: Marca de tiempo ISO-8601.
     - `items`: Snapshot completo del diccionario de ítems.
     - `snapshotTasa`: Tasa de cambio BCV aplicada al momento de congelar.
   - **Recuperación Segura:** Al restaurar un ticket desde `HoldQueueDrawer.tsx`, si el carrito actual contiene productos, el sistema abre un modal de confirmación (`ConfirmDialog`) para advertir al cajero antes de sobreescribir la sesión actual.

---

### 1.3. Reglas de Descuento por Divisas y Promociones

- **Servicios:** `backend/app/services/price_rule_service.py`, `sale_service.py`.
- **Mecanismo:** El sistema permite configurar reglas de precio especiales cuando el cliente abona en divisas en efectivo. En el carrito, los productos marcados con `usa_precio_divisas` adoptan el precio preferencial.
- **Validación Estricta en Backend:**
  $$\sum \text{Pagos en Divisas Válidas} \ge \sum \text{Monto de Ítems con Descuento}$$
  Si el cajero intenta cobrar ítems con precio de divisa pero el cliente paga en bolívares o métodos nacionales, el backend aborta la transacción retornando `409 Conflict`: `"Faltan $X.XX en divisas para cubrir los productos con descuento"`.

---

### 1.4. Checkout Multimoneda y Arqueo de Pagos

El cajero dispone de dos modalidades de cobro dentro de `CheckoutDrawer.tsx`:

```
+---------------------------------------------------------------------------------------------------------+
|                                         CHECKOUT DRAWER (F10)                                           |
|                                                                                                         |
|  Total USD: $ 59.20  |  Tasa BCV: Bs 36.00  |  Total VES: Bs 2,131.20                                   |
|                                                                                                         |
|  [ MODALIDAD EXPRÉS ] (1 solo clic liquida el total exacto)                                            |
|  [ Efectivo USD ($59.20) ]  [ Punto de Venta (Bs 2,131.20) ]  [ Pago Móvil (Bs 2,131.20) ]              |
|                                                                                                         |
|  -------------------------------- Ó ALTERNAR A: --------------------------------                        |
|                                                                                                         |
|  [ MODALIDAD DESGLOSE MIXTO ] (Split Payment)                                                           |
|  +------------------------------------+  +------------------------------------+                         |
|  | Efectivo USD ($)       [  20.00  ] |  | Efectivo Bs (VES)      [   0.00  ] |                         |
|  | Punto de Venta (VES)   [ 720.00  ] |  | Pago Móvil (VES)       [ 700.00  ] |                         |
|  | Zelle ($)              [   0.00  ] |  | Biopago (VES)          [   0.00  ] |                         |
|  +------------------------------------+  +------------------------------------+                         |
|  Referencias Bancarias requeridas para Punto / Pago Móvil: [Ref: 982144]                                |
|                                                                                                         |
|  ESTADO DE COBERTURA:                                                                                   |
|  Pagado: $ 59.44 / $ 59.20 (100%) ===> [ VUELTO / CAMBIO: Bs 8.80 (o $ 0.24) ]                         |
|                                                                                                         |
|  [ CANCELAR (Esc) ]                                            [ REGISTRAR VENTA (Enter) ]              |
+---------------------------------------------------------------------------------------------------------+
```

1. **Cobro Exprés (`CheckoutSpeedPayment.tsx`):**
   - Presenta accesos directos a los métodos de pago más frecuentes.
   - Un solo clic rellena automáticamente el 100% del importe adeudado en la moneda nativa del método seleccionado (USD o VES convertido por la tasa BCV).

2. **Cobro Mixto / Combinado (`CheckoutSplitPayment.tsx`):**
   - Permite dividir la cuenta entre múltiples vías de pago simultáneas (ej. $20 en efectivo USD + Bs 720 en tarjeta de débito + Bs 700 en Pago Móvil).
   - Valida la captura de número de referencia bancaria para métodos electrónicos (`acepta_referencia = true`).
   - **Indicadores en Tiempo Real (`useCheckout.ts`):** Calcula el porcentaje de avance de pago, el remanente por cobrar y el vuelto exacto calculado dinámicamente en la moneda en que el cliente realizó el sobrepago.

3. **Cálculo Fiscal y Verificación Transaccional:**
   - La venta desglosa matemáticamente:
     - `monto_exento_usd`: Total de productos de canasta básica exentos de IVA y combos.
     - `base_imponible_usd`: Subtotal neto gravado.
     - `monto_iva_usd`: 16.00% exacto sobre la base imponible (`ROUND_HALF_UP`).
     - `total_usd` y `total_ves` oficiales.
   - El backend en `sale_service.py` valida que la suma de pagos cubra el total (`total_pagado >= total_usd - 0.01`).

4. **Sincronización de Stock y Desempaque Automático:**
   - Al persistir la venta, si un producto vendido por unidad agota el inventario suelto (`stock_unidades < cantidad`), el servicio abre automáticamente cajas cerradas (`product.stock_cajas -= 1`, `product.stock_unidades += unidades_por_caja`), garantizando la continuidad de la venta sin intervención manual de almacén.

---

## 2. Gestión de Inventario, Catálogo y Combos

El subsistema de inventario implementa control bimodal para distribución mayorista y minorista de licores, alertas tempranas de abastecimiento y empaquetado dinámico de combos promocionales.

```
+---------------------------------------------------------------------------------------------------------+
|                                    ESTRUCTURA DE PRODUCTO EN CATÁLOGO                                   |
|                                                                                                         |
|  Identificadores:   SKU: "RON-CAC-001" | Código Barras: "7591001000123" | Nombre: "Cacique Añejo 750ml" |
|  Clasificación:     Categorías: [Ron, Licores Nacionales] | Proveedor: "Distribuidora DUSA C.A."        |
|  Régimen Fiscal:    Tipo IVA: [X] GRAVADO (16%)  [ ] EXENTO                                             |
|                                                                                                         |
|  LOGÍSTICA BIMODAL:                                                                                     |
|  Unidades por Caja: [ 12 ]                                                                              |
|  Stock Físico:      [ 25 ] Cajas enteras  +  [ 7 ] Botellas sueltas  ===> Total: 307 Unidades            |
|  Umbral Alerta:     Stock Mínimo: [ 36 ] Unidades                                                       |
|                                                                                                         |
|  MATRIZ DE PRECIOS Y MÁRGENES COMERCIALES:                                                              |
|  Costo Compra:      $ 96.00 / Caja  ===> Costo Unitario Calculado: $ 8.00 / botella                     |
|  Venta Botella:     Precio: $ 12.00  ===> Margen s/Venta: [ 33.3% ] (Verde: Saludable >= 30%)           |
|  Venta Caja:        Precio: $135.00  ===> Margen s/Venta: [ 28.9% ] (Amarillo: Aceptable 10-29%)       |
+---------------------------------------------------------------------------------------------------------+
```

### 2.1. Catálogo de Productos y Márgenes Comerciales

- **Rutas y Servicios:** `backend/app/routes/products.py`, `backend/app/services/product_service.py`.
- **Formularios de Captura:** `ProductNewPage.tsx`, `ProductEditPage.tsx`, `ProductFormPricing.tsx`.
- **Fórmula de Margen Comercial:**
  En contraste con el recargo sobre costo (*markup*), el sistema utiliza el **margen sobre venta** estándar del comercio minorista:
  $$\text{Margen (\%)} = \left(\frac{\text{Precio Venta} - \text{Costo}}{\text{Precio Venta}}\right) \times 100$$
  $$\text{Precio Sugerido (30\% margen)} = \frac{\text{Costo Unitario}}{0.70}$$
- **Semaforización Visual de Márgenes (`calcMargin` en `types.ts`):**
  - `Margen >= 30.0%`: Variante `success` (verde).
  - `10.0% <= Margen < 30.0%`: Variante `warning` (amarillo).
  - `Margen < 10.0%`: Variante `danger` (rojo).

### 2.2. Empaque Bimodal y Desempaque Automático

El modelo almacena el inventario de licores en dos niveles sincronizados:
- `stock_cajas`: Cajas completas precintadas de fábrica.
- `stock_unidades`: Botellas individuales abiertas para venta al detal.
- `unidades_por_caja`: Factor de conversión (ej. 12 botellas por caja de ron, 24 tercios de cerveza, 36 botellas de 222ml).
- **Lógica de Desempaque (`sale_service.py`):**
  ```python
  # Si el cliente compra botellas sueltas y superan el stock_unidades:
  while needed > 0 and product.stock_cajas > 0:
      product.stock_cajas -= 1
      nuevas_sueltas = product.unidades_por_caja
      tomar = min(needed, nuevas_sueltas)
      product.stock_unidades = nuevas_sueltas - tomar
      needed -= tomar
  ```
  Si se agotan tanto las botellas sueltas como las cajas completas, se arroja un error controlado `409 Conflict` impidiendo stocks negativos.

### 2.3. Alertas de Stock Mínimo

- En la tabla de productos (`ProductTable.tsx`) y tarjetas (`ProductCard.tsx`):
  - `Stock Total <= 0`: Badge `danger` (**AGOTADO**).
  - `0 < Stock Total <= stock_minimo`: Badge `warning` (**BAJO / CRÍTICO**).
  - `Stock Total > stock_minimo`: Badge `success` (**NORMAL / DISPONIBLE**).

---

### 2.4. Módulo de Combos y Paquetes Promocionales

- **Rutas y Servicios:** `backend/app/routes/combos.py`, `backend/app/services/combo_service.py`.
- **Componentes:** `CombosPage.tsx`, `ComboFormModal.tsx`, `ComboSelectorModal.tsx`.
- **Estructura de un Combo (`Combo`):**
  - Un combo se compone de múltiples grupos de selección (`ComboGroup`).
  - Cada grupo define una regla de cantidades permitidas (`min_cantidad`, `max_cantidad`) y un listado de productos elegibles (`ComboGroupProduct`).
  - Ejemplo: *"Combo Ron Rumbero ($25.00)"*:
    - Grupo 1 (Licores, qty=1): Cacique Añejo 750ml ó Santa Teresa Gran Reserva 750ml.
    - Grupo 2 (Mezcladores, qty=2): Coca-Cola 2L, Pepsi 2L ó Chinotto 2L.
    - Grupo 3 (Complementos, qty=1): Hielo Bolsa 3kg.

```
+---------------------------------------------------------------------------------------------------------+
|                                  ALGORITMO DE DISTRIBUCIÓN DE PRECIO                                    |
|                                                                                                         |
|  Combo: "Combo Rumbero" (Precio Fijo: $25.00)                                                           |
|                                                                                                         |
|  Productos elegidos:                                                                                    |
|  1. Ron Cacique 750ml    (Precio normal: $12.00) ---> 38.7% del total de lista                          |
|  2. Coca-Cola 2L (x2)    (Precio normal: $ 6.00) ---> 19.4% del total de lista                          |
|  3. Hielo 3kg            (Precio normal: $ 3.00) --->  9.7% del total de lista                          |
|  ------------------------------------------------                                                       |
|  Suma Precio Normal:     $21.00                                                                         |
|                                                                                                         |
|  Distribución Proporcional (Largest Remainder Method / Hare-Niemeyer):                                   |
|  - Reparto base redondeado hacia abajo al centavo inferior (ROUND_FLOOR).                               |
|  - Cálculo de residuos por ítem.                                                                        |
|  - Asignación de centavos sobrantes ordenando por mayor residuo hasta cuadre exacto:                    |
|    Total Asignado a Ítems == $25.0000000000 (0 diferencias, 0 descuadres en contabilidad)               |
|                                                                                                         |
|  Efecto en Inventario al Vender:                                                                        |
|  - Descuenta 1 Ron Cacique + 2 Coca-Cola + 1 Hielo en sus respectivos registros de inventario.           |
|  - Exención Fiscal: Los combos tributan con iva_porcentaje = 0 (tasa exenta en factura).                |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Compras, Facturas y Cuentas por Pagar

El módulo de compras gestiona el ciclo integral de adquisición de existencias a distribuidores, recepción de facturas comerciales, extracción por Inteligencia Artificial y programación de pagos diferidos.

```
+---------------------------------------------------------------------------------------------------------+
|                                          HUB DE COMPRAS & FACTURAS                                      |
|                                                                                                         |
|  KPIs FINANCIEROS:                                                                                      |
|  +---------------------------+  +---------------------------+  +-------------------------------------+  |
|  | Total Pendiente por Pagar |  | Facturas por Vencer (7d)  |  | Facturas en Mora / Vencidas         |  |
|  | $ 12,450.00 (Bs 448,200)  |  | 4 Documentos              |  | 1 Documento ($ 1,200.00)            |  |
|  +---------------------------+  +---------------------------+  +-------------------------------------+  |
|                                                                                                         |
|  ACCIONES PRINCIPALES:                                                                                  |
|  [ + Cargar Factura Manual ]      [ Escanear con Asistente IA (Gemini) ]      [ Ver Proveedores ]       |
|                                                                                                         |
|  BANDEJA DE FACTURAS REGISTRADAS:                                                                       |
|  | Factura #  | Proveedor          | Fecha Emisión | Vencimiento | Total USD   | Saldo Pendiente | Estado   |
|  | 0004921    | Cervecería Polar   | 15/10/2026    | 30/10/2026  | $ 3,200.00  | $ 1,200.00      | PARCIAL  |
|  | FC-9812    | Distribuidora DUSA | 18/10/2026    | 18/10/2026  | $ 1,450.00  | $     0.00      | PAGADA   |
|  | NE-00129   | Licores Caracas    | 19/10/2026    | 02/11/2026  | $   850.00  | $   850.00      | PENDIENTE|
+---------------------------------------------------------------------------------------------------------+
```

### 3.1. Hub de Compras y Flujo de Ingreso de Facturas

- **Páginas y Hooks:** `ComprasHubPage.tsx`, `InvoiceNewPage.tsx`, `useComprasHubData.ts`, `useInvoiceSubmit.ts`.
- **Estructura del Documento de Compra (`FacturaCreate`):**
  - **Cabecera:** `proveedor_id`, `numero_factura`, `tipo_documento` (`FACTURA` o `NOTA_ENTREGA`), `fecha_factura`, `fecha_limite_pago`, `moneda_principal` (`USD` o `BS`), `tasa_bs` de liquidación y flag `aplica_iva`.
  - **Líneas de Compra (`DetalleFactura`):** `producto_id`, `tipo_empaque` (`CAJA` o `UNIDAD`), `cantidad`, `costo_unitario_usd`, `costo_unitario_bs`, `tipo_iva`.
  - **Bonificaciones u Obsequios (`ObsequioFactura`):** Registro de unidades de cortesía otorgadas por distribuidores comerciales.

### 3.2. Mecánica de Bonificaciones y Costo Promedio Ponderado

1. **Obsequios Comerciales:**
   - En el comercio mayorista de bebidas es estándar la bonificación por volumen (ej. *"por la compra de 10 cajas de cerveza, el proveedor entrega 1 caja sin cargo"*).
   - En `invoice_service.py`, las unidades de obsequio ingresan al inventario físico (`stock_cajas += obsequio.cantidad`), pero **no suman costo financiero a la factura**.
2. **Actualización de Precios de Costo en Ficha de Producto:**
   - El sistema actualiza inmediatamente `precio_costo_caja_usd` y `precio_costo_usd` calculando el desglose unitario (`costo_caja / unidades_por_caja`).
   - Sincroniza al proveedor habitual del producto (`product.proveedor_id = data.proveedor_id`).

---

### 3.3. Ingestión y Extracción Inteligente con Google Gemini AI

Para eliminar la digitación lenta y propensa a errores de facturas impresas, el sistema incorpora un pipeline de visión artificial y extracción de datos mediante Google Gemini Vision (`gemini_service.py`, `useInvoiceAI.ts`).

```
+---------------------------------------------------------------------------------------------------------+
|                                    PIPELINE OCR DE FACTURAS CON GEMINI                                  |
|                                                                                                         |
|  1. CAPTURA Y PREPROCESAMIENTO:                                                                         |
|     Usuario sube foto/escaneo (JPG, PNG, PDF hasta 10MB) ---> Redimensionamiento y compresión JPEG.     |
|                                                                                                         |
|  2. DOS CONSULTAS DESACOPLADAS A GEMINI (Anti-Alucinación):                                            |
|     +---------------------------------------------------------------------------------------------+     |
|     | Prompt 1 (Metadata): Extrae proveedor, número factura, fecha emisión, vencimiento y moneda. |     |
|     +---------------------------------------------------------------------------------------------+     |
|     | Prompt 2 (Productos): Extrae ítems en orden secuencial con descripción, cantidad y costos.   |     |
|     +---------------------------------------------------------------------------------------------+     |
|                                                                                                         |
|  3. PANEL DE REVISIÓN INTERACTIVO (Human-in-the-Loop):                                                  |
|     La interfaz muestra la imagen del documento en panel izquierdo y formulario a la derecha:          |
|     - Verificación de metadatos detectados.                                                             |
|     - Mapeo manual guiado de cada línea extraída contra los productos de la base de datos.              |
|     - Corrección rápida de cualquier cantidad o importe antes de guardar en base de datos.             |
+---------------------------------------------------------------------------------------------------------+
```

1. **Arquitectura de Doble Llamada (Dual Request):**
   - Para evitar que los modelos de lenguaje mezclen totales fiscales con precios unitarios o inventen líneas, `analyze_invoice_from_image` envía dos solicitudes independientes:
     - Request 1: `INVOICE_METADATA_PROMPT` (máx. 300 tokens de salida).
     - Request 2: `INVOICE_PRODUCTS_PROMPT` (máx. 2000 tokens de salida estructurados en JSON estricto).
2. **Revisión Humana Requerida (`Human-in-the-Loop`):**
   - El resultado se inyecta en el estado de revisión (`AIReviewPanel.tsx`). El operador tiene control absoluto para vincular cada ítem detectado al producto correspondiente del catálogo, verificar el tipo de empaque y rectificar cualquier carácter dudoso antes de impactar el inventario.

---

### 3.4. Gestión de Cuentas por Pagar y Abonos Parciales

- **Rutas y Servicios:** `/invoices/{id}/payments`, `register_invoice_payment` en `invoice_service.py`.
- **Componentes:** `PaymentDrawer.tsx`, `InvoicePaymentPage.tsx`.
- **Estados de Pago:**
  - `PENDIENTE`: Ningún pago registrado; deuda íntegra pendiente.
  - `PAGADA_PARCIAL`: Abonos registrados inferiores al total adeudado.
  - `PAGADA`: Saldo remanente igual a cero ($0.00).
- **Control de Sobrepago y Comprobantes:**
  - El backend impide registrar abonos que superen el saldo pendiente de la factura (`409 Conflict`).
  - Permite cargar múltiples archivos de comprobante de pago digital (transferencias, cheques, recibos) optimizados automáticamente y almacenados en `uploads/comprobantes_pago/`.
  - Soporta intereses o cargos por mora (`monto_mora`).

---

## 4. Ciclo de Vida de Envases Retornables

En el negocio licorero venezolano, las cervezas retornables representan un activo físico rotativo de alto valor. El módulo de retornables gestiona el circuito cerrado entre el proveedor (Cervecería Polar), el comercio y el consumidor final.

```
+---------------------------------------------------------------------------------------------------------+
|                                    CIRCUITO CERRADO DE ENVASES RETORNABLES                               |
|                                                                                                         |
|                     +--------------------------------------------------------+                          |
|                     |                   CAMIÓN DE PROVEEDOR                  |                          |
|                     +--------------------------------------------------------+                          |
|                                     |                         ^                                         |
|                 Entrega Cerveza     |                         | Devuelve Cajas                          |
|                 Llena (COMPRA)      v                         | Vacías a Planta                         |
|                     +--------------------------------------------------------+                          |
|                     |                 ALMACÉN / BODEGA YANESU                |                          |
|                     |                                                        |                          |
|                     |  [ LLENO ] ------------ VENTA ---------> [ CLIENTE ]   |                          |
|                     |  Botellas Llenas                     Retorna Envase    |                          |
|                     |     ^                                       |          |                          |
|                     |     |                                       v          |                          |
|                     |  [ CASILLERO ] <--- Embotella Vacías --- [ VACÍO ]     |                          |
|                     |  Cajas de Plástico                   Botellas Sueltas  |                          |
|                     +--------------------------------------------------------+                          |
+---------------------------------------------------------------------------------------------------------+
```

### 4.1. Presentaciones y Reglas Físicas de Envase

- **Presentaciones Soportadas (`BOTELLAS_POR_CAJA` en `retornable_service.py`):**
  - **Presentación `"222"`:** Cerveza 222ml (Polar Pilsen / Polar Light / Solera verde) con **36 botellas por caja/casillero**.
  - **Presentación `"333"`:** Cerveza 333ml (Polar Tercio / Negra) con **24 botellas por caja/casillero**.
- **Estados de Existencia:**
  1. `CASILLERO`: Huacales o cajas plásticas vacías en depósito.
  2. `VACÍO`: Botellas de vidrio vacías (sueltas o en espera de consolidación).
  3. `LLENO`: Botellas llenas aptas para el consumo inmediato.

### 4.2. Hooks Automáticos en Ventas y Compras

El módulo no requiere digitación redundante: se engancha directamente en las transacciones operativas del negocio:

1. **Al Registrar una Venta (`procesar_venta` en `sale_service.py`):**
   - Cuando se vende un producto asociado a retornable (ej. Polar 222ml):
     $$\Delta \text{LLENO} = -\text{botellas\_descontadas}$$
     $$\Delta \text{VACÍO} = +\text{botellas\_descontadas}$$
   - El sistema asume el intercambio estándar donde el cliente entrega el envase vacío al adquirir la botella fría.
2. **Al Registrar una Factura de Compra (`procesar_compra` en `invoice_service.py`):**
   - Cuando llega el camión distribuidor y se ingresa la factura:
     $$\Delta \text{LLENO} = +\text{botellas\_compradas}$$
     $$\Delta \text{VACÍO} = -\text{botellas\_compradas}$$
   - Las botellas vacías almacenadas en el patio se entregan al camión para reponer producto terminado.

---

### 4.3. Auditoría, Conteo Físico y Arqueo de Diferencias

- **Páginas y Componentes:** `RetornablesPage.tsx`, `NuevoReporteModal.tsx`, `ResumenTab.tsx`, `ReportesTab.tsx`, `HistoricoTab.tsx`, `ComparacionTabla.tsx`.
- **Reporte Físico de 6 Líneas:**
  El modal de conteo físico captura la existencia real observada en bodega para:
  $$\{222, 333\} \times \{\text{CASILLERO}, \text{VACIO}, \text{LLENO}\}$$
- **Detección Automática de Cuadres y Descuadres:**
  - El servicio calcula:
    - `lleno_esperado`: Suma de las existencias reales registradas en las fichas de los productos asociados (`Product.stock_cajas * factor + Product.stock_unidades`).
    - `dif_botellas`: Brecha entre el conteo del inventario general de ventas y el conteo físico de envases retornables.
  - Al presionar **Confirmar Reporte** (`confirmar_reporte`), el sistema estampa los valores oficiales y resetea el delta de movimientos acumulados.

---

## 5. Reportes, Analítica y Panel de Control (Dashboard)

El subsistema de reportes consolida información estratégica para la toma de decisiones, visualización de tendencias de consumo y liquidación contable.

```
+---------------------------------------------------------------------------------------------------------+
|                                        PANEL DE CONTROL EJECUTIVO                                       |
|                                                                                                         |
|  KPIs EN VIVO:                                                                                          |
|  [ Total Productos: 482 ]   [ Sin Stock: 12 ]   [ Categorías: 18 ]   [ Cuentas por Pagar: $12,450.00 ]  |
|                                                                                                         |
|  GRÁFICOS ANALÍTICOS (Recharts):                                                                        |
|  +-------------------------------------------------+  +----------------------------------------------+  |
|  | Curva de Ventas Semanales (USD vs VES)          |  | Top 5 Productos Más Vendidos                 |  |
|  | $ 5k |         /\                               |  | 1. Cerveza Polar 222ml (Caja)  [========] 312|  |
|  | $ 3k |   _/\  /  \  /\                          |  | 2. Ron Santa Teresa 750ml   [======]   184|  |
|  | $ 1k | _/   \/    \/  \                         |  | 3. Hielo Bolsa 3kg          [====]     120|  |
|  |      +-----------------                         |  | 4. Refresco Coca-Cola 2L    [===]       95|  |
|  |        Sem 1  2  3  4                           |  | 5. Ginebra Tanqueray 750ml  [=]         22|  |
|  +-------------------------------------------------+  +----------------------------------------------+  |
|                                                                                                         |
|  EXPORTACIONES A EXCEL:                                                                                 |
|  [ Exportar Ventas (.xlsx) ]   [ Exportar Matriz Productos (.xlsx) ]   [ Exportar Pagos (.xlsx) ]       |
+---------------------------------------------------------------------------------------------------------+
```

### 5.1. Dashboard Principal (`DashboardPage.tsx`)

- Proporciona una vista consolidada en tiempo real sin recargar página:
  - `stats`: Cantidad total de productos, alertas de productos agotados, conteo de categorías y proveedores activos (`dashboard_service.py`).
  - `ventasSemana` y `salesSummary`: Tendencia de facturación de las últimas 5 semanas.
  - `topProducts`: Gráfico de barras horizontal con los artículos de mayor rotación (`get_top_selling`).
  - `pendingSummary`: Alerta visual de deuda pendiente acumulada a proveedores.

---

### 5.2. Módulos de Reportes Especializados

1. **Reporte de Ventas (`ReportsSalesPage.tsx`):**
   - Agrupación temporal: Diario, semanal, quincenal, mensual, trimestral o semestral.
   - Filtros por método de pago y rango de fechas.
   - Cálculo del ticket promedio y margen bruto estimado de ventas (`total_usd - costo_usd`).

2. **Matriz de Rendimiento de Productos (`ReportsProductsPage.tsx`):**
   - Ejecuta un `LEFT JOIN` entre el catálogo y las líneas de venta (`SaleItem`) en `product_service.py`.
   - Muestra para cada artículo: total de unidades vendidas, precio unitario, costo medio, porcentaje de margen comercial y stock remanente en depósito.
   - Gráfico de dispersión (*Scatter Chart*) para identificar productos estrella (alto volumen y alto margen) vs productos de baja rentabilidad.

3. **Reporte de Métodos de Pago y Cuadre de Caja (`ReportsPaymentsPage.tsx`):**
   - Agrupación de todos los ingresos capturados desglosados por vía de pago (`PaymentMethodSummaryOut`).
   - Muestra el volumen transaccional en moneda original (USD o VES) y el valor normalizado en dólares.
   - Gráfico tipo dona (*Donut Chart*) de participación por método de pago.

4. **Reporte Financiero por Categorías (`ReportsCategoriesPage.tsx`):**
   - Agrega facturación, costo de mercancía vendida y margen neto consolidado por familia de productos.

---

### 5.3. Exportación Profesional a Microsoft Excel (`exportToExcel.ts`)

- **Librería:** Motor nativo `xlsx` (SheetJS) empaquetado en el cliente.
- **Características:**
  - Descarga instantánea en formato binario `.xlsx`.
  - Encabezados estilizados con nombres de campo comerciales legibles.
  - Auto-ajuste de ancho de columnas calculado según la longitud del texto.
  - Formato numérico profesional con máscaras de moneda (`$ #,##0.00` y `Bs. #,##0.00`).
  - Sanitización automática de nombres de hojas y archivos para evitar caracteres ilegales en Windows/macOS.

---

## 6. Seguridad, Roles y Configuración del Sistema

El módulo de seguridad y administración centraliza la gobernanza del sistema, la integridad de accesos y la conectividad con servicios externos.

```
+---------------------------------------------------------------------------------------------------------+
|                                     MATRIZ DE ACCESO BASADA EN ROLES (RBAC)                             |
|                                                                                                         |
|  Módulo / Funcionalidad                   | Rol: ADMINISTRADOR               | Rol: OPERADOR / CAJERO   |
|  -----------------------------------------+----------------------------------+------------------------- |
|  Punto de Venta (POS) y Checkout          | Acceso total                     | Acceso total             |
|  Historial de Ventas                      | Historial completo y filtros     | Solo ventas del turno    |
|  Visualización de Costos y Márgenes       | Visible en todas las vistas      | OCULTO / Prohibido       |
|  Edición y Creación de Productos          | Permitido                        | Denegado (403 Forbidden) |
|  Hub de Compras y Facturas Proveedor      | Acceso total                     | Acceso limitado/consulta |
|  Eliminación de Pagos / Anulaciones       | Permitido (auditoria obligatoria)| Denegado                 |
|  Reportes Gerenciales y Analítica         | Acceso total                     | Denegado                 |
|  Configuración de API Keys y Tasas        | Permitido                        | Denegado                 |
|  Gestión de Usuarios y Roles              | Permitido                        | Denegado                 |
+---------------------------------------------------------------------------------------------------------+
```

### 6.1. Control de Acceso Basado en Roles (RBAC)

- **Dependencias FastAPI:** `backend/app/core/dependencies.py` (`require_role("ADMINISTRADOR")`).
- **Autenticación:** Tokens JWT con algoritmo `HS256`, transmitidos exclusivamente a través de cookies seguras `httpOnly` (`access_token`).
- **Aislamiento en Frontend:**
  - `router.tsx` implementa funciones guardias (`adminOnly`) que redirigen a operadores no autorizados que intenten acceder por URL a `/reports`, `/settings`, `/retornables` o gestión de precios.

### 6.2. Registro de Auditoría Asíncrono (`audit_service.py`)

- **Arquitectura de Alto Desempeño:**
  - Para evitar latencias en las ventas de mostrador, el registro de eventos opera mediante una cola desacoplada en memoria `queue.Queue(maxsize=10000)` atendida por un hilo demonio en segundo plano (`_writer_loop`).
- **Esquema de Evento de Auditoría:**
  ```json
  {
    "ts": "2026-10-19T14:32:01.125-04:00",
    "nivel": "AUDIT",
    "usuario": "cajero_01",
    "ip": "192.168.1.105",
    "accion": "CREAR",
    "entidad": "venta",
    "entidad_id": 4120,
    "detalle": "Creada venta ID 4120 por $59.20"
  }
  ```
- **Rotación de Archivos:** El archivo `audit.log` se rota automáticamente al superar los 10MB (`AUDIT_MAX_BYTES`), conservando los últimos 10 archivos históricos y eliminando los más antiguos.

---

### 6.3. Tasa Oficial BCV y Transmisión en Tiempo Real (SSE)

- **Scraping Oficial (`bcv_scraper.py` / `exchange_rate_service.py`):**
  - Motor de scraping con BeautifulSoup4 que consulta los indicadores oficiales del Banco Central de Venezuela (USD y EUR).
- **Notificación en Tiempo Real vía Server-Sent Events (SSE):**
  - **Endpoint Backend:** `GET /exchange-rates/stream`.
  - **Mecanismo:** Broadcaster asíncrono en memoria (`rate_broadcaster`). Cuando un administrador actualiza la tasa del día, el backend emite un mensaje SSE a todos los navegadores y terminales de escritorio conectados (`useRateStream.ts`).
  - **Heartbeat:** Envía paquetes `: ping\n\n` cada 25 segundos para evitar que proxys o sistemas operativos suspendan la conexión.
  - **Alerta de Fin de Tarde (`daily-status`):** Notifica al personal de caja si son más de las 17:00 (hora legal de Venezuela) y la tasa del día siguiente aún no ha sido registrada.

---

### 6.4. Parámetros del Sistema y Cifrado de Credenciales

- **Rutas y Servicios:** `backend/app/routes/system_settings.py`, `system_setting_service.py`, `encryption_service.py`.
- **Componentes:** `SystemSettingsPage.tsx`, `GeminiApiKeyCard.tsx`.
- **Cifrado Simétrico Fernet:**
  - Las credenciales sensibles (particularmente la API Key de Google Gemini) **nunca se guardan en texto plano en la base de datos**.
  - Se cifran mediante el algoritmo Fernet (AES-128 en modo CBC con firma HMAC-SHA256) utilizando una clave maestra derivada en `Config.get_fernet_key()`.
- **Verificación de Conectividad:**
  - El botón **Probar Conexión** (`POST /settings/api-key/test`) realiza una llamada de prueba ligera contra la API de Gemini para validar que la clave ingresada sea operativa antes de guardarla.

---

## 7. Matriz de Trazabilidad: Flujo de Usuario a Implementación Técnica

| Flujo de Usuario | Componente Frontend Principal | Endpoint Backend | Servicio Transaccional | Tablas de Persistencia |
| :--- | :--- | :--- | :--- | :--- |
| **Escaneo y Venta POS** | `POSPage.tsx` / `CheckoutDrawer.tsx` | `POST /sales` | `sale_service.create_sale` | `ventas`, `venta_items`, `venta_pagos`, `productos` |
| **Pausa de Ticket (Hold)** | `HoldQueueDrawer.tsx` | N/A (Local Client) | `holdQueueStore.ts` | `localStorage` (`yanesu-hold-queue-v1`) |
| **Descuentos por Divisas** | `CartItemRow.tsx` | `POST /sales/calculate` | `sale_service.calculate_sale` | `reglas_precio`, `regla_precio_metodos_pago` |
| **Venta de Combos** | `ComboSelectorModal.tsx` | `POST /sales` | `combo_service.distribute_combo_price` | `combos`, `combo_grupos`, `combo_grupo_productos` |
| **Ingreso Factura Compra** | `InvoiceNewPage.tsx` | `POST /invoices` | `invoice_service.create_invoice` | `facturas`, `detalle_facturas`, `obsequios_factura` |
| **Extracción OCR Factura** | `InvoiceAIModal.tsx` / `AIReviewPanel.tsx` | `POST /invoices/analyze` | `invoice_service.analyze_invoice_from_image` | Modelo Gemini Vision / Memoria temporal |
| **Abono a Factura Proveedor** | `PaymentDrawer.tsx` | `POST /invoices/{id}/payments` | `invoice_service.register_invoice_payment` | `factura_pagos`, `factura_pago_comprobantes` |
| **Conteo Retornables** | `NuevoReporteModal.tsx` | `POST /retornable/reportes` | `retornable_service.crear_reporte` | `retornable_reportes`, `retornable_reporte_detalles` |
| **Cuadre Retornables** | `ResumenTab.tsx` | `PUT /retornable/reportes/{id}/confirmar`| `retornable_service.confirmar_reporte`| `retornable_inventario`, `retornable_movimientos` |
| **Análisis de Ventas** | `ReportsSalesPage.tsx` | `GET /sales/summary` | `sale_service.get_sales_summary` | `ventas`, `venta_items` |
| **Matriz de Productos** | `ReportsProductsPage.tsx` | `GET /reports/products-matrix` | `product_service.get_product_matrix` | `productos`, `venta_items` |
| **Sincronización Tasa BCV** | `useRateStream.ts` | `GET /exchange-rates/stream` | `rate_broadcaster` / SSE | `historico_tasas` |
| **Configurar API Key** | `SystemSettingsPage.tsx` | `POST /settings/api-key` | `system_setting_service.set_api_key` | `system_settings` (Cifrado Fernet) |
