# Documento de Especificación de Requerimientos de Software (SRS)

**Proyecto:** Sistema de Gestión de Inventario, Punto de Venta y Análisis Financiero para Licorería

**Documento:** `requirements.md`

**Versión:** 1.0.0

**Fecha:** Julio 2026

**Estado:** Propuesta de Arquitectura e Implementación

---

## 1. Visión General del Sistema

El objetivo principal de este sistema es digitalizar la operativa comercial de la licorería, migrando el control legacy basado en hojas de cálculo hacia una arquitectura cliente-servidor robusta, centralizada y escalable.

El sistema gestionará el inventario en tiempo real, procesará ventas mediante escáner de código de barras, convertirá precios dinámicamente según la tasa del Banco Central de Venezuela (BCV), y proveerá módulos analíticos y de Business Intelligence para la toma de decisiones estratégicas.

```
+-----------------------------------------------------------------------+
|                             DASHBOARD UI                              |
+----------------------------------+------------------------------------+
|             OPERADOR             |           ADMINISTRADOR            |
| - Tasa BCV/EUR en vivo           | - Todas las funciones de Operador  |
| - Búsqueda / Escáner Código      | - Historial temporal avanzado      |
| - Venta Dual (Unidad/Caja)       | - Analítica de Margen y Productos  |
| - Catálogo / Edición básica      | - Evaluación de Proveedores        |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                             API REST LAYER                            |
|        (RBAC, Validador Tasa BCV, Lógica Doble Unidad, Auditoría)     |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                         BASE DE DATOS RELACIONAL                      |
|    (Productos, Presentaciones, Ventas, Histórico Tasas, Proveedores)  |
+-----------------------------------------------------------------------+

```

---

## 2. Definición de Roles y Control de Acceso (RBAC)

El sistema implementa un control de acceso basado en roles (**Role-Based Access Control**). La navegación y la visibilidad de los elementos del `sidebar`/`navbar` están estrictamente condicionadas por el rol asignado al usuario tras autenticarse.

| Módulo / Funcionalidad | Rol: Operador | Rol: Administrador |
| --- | --- | --- |
| Autenticación y Cierre de Sesión | Yes | Yes |
| Visualización Tasa BCV / EUR en tiempo real | Yes | Yes |
| Consulta de Precios ($ / Bs.) por Caja y Unidad | Yes | Yes |
| Registro de Órdenes de Venta (Búsqueda / Escáner) | Yes | Yes |
| Visualización del Histórico de Ventas Operativo | Yes (Sin Stats) | Yes |
| Alta y Edición Básica de Productos en Catálogo | Yes | Yes |
| Histórico de Ventas Avanzado (Filtrado Temporal) | No | Yes |
| Dashboard de Métricas Financieras e Inteligencia de Negocio | No | Yes |
| Evaluación y Métricas de Rendimiento de Proveedores | No | Yes |
| Filtros Avanzados de Catálogo (Rentabilidad, Margen) | No | Yes |
| Histórico Auditado de Cambios de Tasa Cambiaria | Yes (Solo Lectura) | Yes (Gestión/Lectura) |

---

## 3. Requerimientos Funcionales (RF)

### RF-01: Autenticación, Autorización y Seguridad

* **RF-01.1 Login Obligatorio:** Ninguna ruta pública debe permitir operaciones de inventario o venta sin una sesión activa (JWT o sesión persistente con HTTPS).
* **RF-01.2 Menú Dinámico:** El componente de navegación (`sidebar`/`navbar`) debe renderizar exclusivamente los módulos permitidos para el rol activo (`operador` o `administrador`).

### RF-02: Motor de Tasas de Cambio (BCV / EUR)

* **RF-02.1 Sincronización Tasa BCV:** El sistema debe consumir la tasa oficial del BCV del día en tiempo real o permitir su actualización manual/automática con caché local para tolerar fallos de conectividad.
* **RF-02.2 Histórico Cambiario:** Se debe registrar de forma inmutable cada actualización de la tasa (BCV y EUR) guardando `fecha_hora`, `monto_ves`, `moneda` y `usuario_id` que ejecutó/sincronizó.
* **RF-02.3 Indicador Visual UI:** Mostrar la tasa actual visible en la barra superior del sistema para consulta rápida tanto del personal como del cliente.

### RF-03: Catálogo de Productos e Inventario Dual

* **RF-03.1 Búsqueda y Escáner:** Permitir la búsqueda interactiva por texto (nombre, marca) o mediante entrada directa de un lector de código de barras (EAN-13 / UPC). Al escanear, el input principal debe mantener el *autofocus* automático.
* **RF-03.2 Manejo Dual de Empaque (Caja vs. Unidad):** El modelo de datos debe almacenar el factor de conversión por producto (ej. 1 caja = 24 unidades). El inventario base siempre se calculará en **unidades mínimas** para evitar inconsistencias decimales.
* **RF-03.3 Conversión Multimoneda:** Los precios deben cotizarse internamente en divisas ($ USD base) y convertirse a Bolívares (VES) en tiempo real aplicando la tasa BCV del día, formateados obligatoriamente a **dos decimales de precisión redondeada**.
* **RF-03.4 Modificación y Filtros:** Permitir la actualización de stock, precios y datos básicos desde el catálogo, integrando filtros por categoría y rango de precios.

### RF-04: Punto de Venta (POS) y Procesamiento de Órdenes

* **RF-04.1 Carrito / Orden de Venta:** El operador podrá agregar múltiples ítems a una lista de venta, seleccionando si vende por empaque completo (caja) o por fracción (unidad).
* **RF-04.2 Impacto Automático en Stock:** Al confirmar la orden de venta (comprobante no fiscal de consumo interno), el sistema descontará atómicamente del inventario el equivalente en unidades base de cada ítem.
* **RF-04.3 Registro de Trazabilidad:** Cada orden debe quedar vinculada al `usuario_id` del operador que la procesó, la fecha/hora exacta y la tasa BCV vigente al momento de la transacción.

### RF-05: Histórico de Ventas y Auditoría Operativa

* **RF-05.1 Vista Operador:** Listado cronológico de transacciones realizadas en el turno/día actual, sin métricas financieras agregadas ni márgenes de ganancia.
* **RF-05.2 Vista Administrador (Agregada):** Consulta avanzada de ventas agrupadas por rangos temporales parametrizables: semanal, quincenal, mensual, trimestral y semestral.

### RF-06: Módulo de Inteligencia de Negocios y Analítica (Solo Admin)

* **RF-06.1 Dashboard Financiero:** Renderizado de gráficas interactivas con las siguientes métricas clave:
* Semana con mayor volumen de facturación en los últimos 2 meses.
* Top 10 productos con mayor margen de ganancia neto ($ y %).
* Top 10 productos con menor margen o rotación.
* Productos más vendidos por volumen de unidades y por volumen de cajas.


* **RF-06.2 Evaluación de Proveedores:** Módulo específico para analizar la rentabilidad por distribuidor:
* Volumen total de inventario provisto.
* Márgenes promedio generados por proveedor.
* Frecuencia de surtido e historial de costos de adquisición.


* **RF-06.3 Filtros de Catálogo Avanzados:** Filtrado dinámico en catálogo por *Más Vendidos*, *Más Rentables*, *Sin Stock*, y *Por Proveedor*.

---

## 4. Requerimientos No Funcionales (RNF)

* **RNF-01 Integridad Transaccional (ACID):** Toda venta que involucre múltiples ítems debe ejecutarse dentro de una transacción de base de datos (`BEGIN TRANSACTION... COMMIT`). Si falla la actualización del stock de un solo producto, toda la orden debe revertirse (`ROLLBACK`).
* **RNF-02 Resiliencia y Fallback Offline:** En entornos con fallas de conectividad a internet, el sistema debe permitir operar utilizando la última tasa BCV guardada localmente en la base de datos, emitiendo una advertencia en la interfaz.
* **RNF-03 Usabilidad y Rendimiento UI:**
* Tiempo de respuesta en la búsqueda/escáner inferior a 150 ms.
* Diseño adaptativo (*responsive*) enfocado en alta velocidad de entrada de datos por teclado/escáner sin depender exclusivamente del ratón.


* **RNF-04 Precisión Numérica:** Los cálculos financieros en moneda local no deben usar tipos de datos flotantes (`FLOAT`/`DOUBLE`). Se exige el uso estricto de tipos de datos de precisión fija (`DECIMAL(12,2)` o `NUMERIC`) para evitar errores de redondeo IEEE 754.
* **RNF-05 Escalabilidad:** Arquitectura desacoplada (Frontend SPA/PWA + Backend API) para permitir la futura integración de impresoras fiscales o facturación electrónica si el negocio lo requiere.

---

## 5. Estrategia de Migración de Datos (Excel Legacy a SQL)

Actualmente, el inventario opera disperso en múltiples hojas de Excel (*Licores, Cervezas y Sangría, Refrescos, Cigarros, Alimentos, PCV/CYM*). Se requiere un proceso **ETL (Extract, Transform, Load)** para la unificación del modelo relacional:

1. **Limpieza e Identificación de Entidades:** Extraer códigos de producto, descripción, empaque (`Caja` / `Unidades por Caja`), precio en dólar base, costo de adquisición y proveedor de las hojas de origen.
2. **Normalización de Inventario Dual:**
* Convertir todas las existencias parciales expresadas como "cajas y unidades sueltas" a un único valor integer:
$$\text{Stock Total en Unidades} = (\text{Cajas} \times \text{Unidades por Caja}) + \text{Unidades Sueltas}$$




3. **Mapeo de Proveedores:** Asignar relaciones claves foráneas (`supplier_id`) estandarizadas para posibilitar el análisis de BI desde el día uno de despliegue.

---

## 6. Modelo de Datos Sugerido (Esquema Relacional Simplificado)

> [!NOTE]
> Este esquema resuelve el problema del manejo de doble unidad (Caja/Unidad) y el histórico inmutable de tasas cambiarias.
> La implementación real usa modelos SQLAlchemy 2.0 con PostgreSQL. Este es un esquema conceptual simplificado.

```sql
-- Tabla de Roles de Usuario
CREATE TABLE roles (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE -- 'ADMINISTRADOR', 'OPERADOR'
);

-- Tabla de Usuarios
CREATE TABLE usuarios (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(100) NOT NULL,
    rol_id INT NOT NULL,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Tabla de Proveedores
CREATE TABLE proveedores (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100)
);

-- Tabla de Productos (Stock siempre en unidades mínimas)
CREATE TABLE productos (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_barra VARCHAR(50) UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    unidades_por_caja INT NOT NULL DEFAULT 1,
    stock_unidades INT NOT NULL DEFAULT 0,
    precio_costo_usd DECIMAL(10,2) NOT NULL,
    precio_unidad_usd DECIMAL(10,2) NOT NULL,
    precio_caja_usd DECIMAL(10,2) NOT NULL,
    proveedor_id INT,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
);

-- Auditoría de Tasas Cambiarias
CREATE TABLE historico_tasas (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    moneda VARCHAR(5) NOT NULL, -- 'USD', 'EUR'
    tasa_ves DECIMAL(10,4) NOT NULL,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    registrado_por INT,
    FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
);

-- Encabezado de Venta
CREATE TABLE ventas (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_venta TIMESTAMPTZ DEFAULT NOW(),
    usuario_id INT NOT NULL,
    tasa_bcv_aplicada DECIMAL(10,4) NOT NULL,
    total_usd DECIMAL(10,2) NOT NULL,
    total_ves DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Detalle de Venta
CREATE TABLE detalle_ventas (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    tipo_empaque VARCHAR(10) NOT NULL CHECK (tipo_empaque IN ('UNIDAD', 'CAJA')),
    cantidad INT NOT NULL, -- Cantidad de cajas o unidades vendidas
    unidades_descontadas INT NOT NULL, -- Total real descontado del stock
    precio_unitario_usd DECIMAL(10,2) NOT NULL,
    subtotal_usd DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);
```