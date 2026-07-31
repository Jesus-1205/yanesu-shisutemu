# Control de Versiones y Commits (Conventional Commits)

Utilizamos el estándar Conventional Commits 1.0.0 para garantizar un historial de Git ordenado y trazable.

## Estructura

```
<tipo>(<alcance>): <descripción concisa en imperativo y minúsculas>

[cuerpo explícito si los cambios requieren contexto técnico]
```

## Tipos Permitidos

- `feat`: Nueva funcionalidad de inventario o sistema (ej. creación de productos, cálculo de stock).
- `fix`: Corrección de fallos (ej. descuadre de inventario, error de validación JWT).
- `refactor`: Cambios de código que no alteran la lógica de negocio ni corrigen bugs (ej. migración a SQLAlchemy 2.0).
- `docs`: Documentación en /docs o comentarios técnicos.
- `style`: Formateo, comas, espacios, limpieza de linter sin cambio de lógica.
- `test`: Pruebas unitarias o de integración.
- `chore`: Mantenimiento de paquetes, archivo .env.example, scripts de despliegue.

## Alcances (`<alcance>`) Válidos

`auth`, `inventory`, `products`, `database`, `ui`, `api`, `config`.

## Ejemplos Correctos

```
feat(inventory): agregar endpoint para ajuste manual de stock
fix(auth): corregir expiracion de token JWT en python-jose
refactor(database): migrar consultas de usuarios a select() de SQLAlchemy 2.0
chore(deps): actualizar driver psycopg a la version 3.3.4
```
