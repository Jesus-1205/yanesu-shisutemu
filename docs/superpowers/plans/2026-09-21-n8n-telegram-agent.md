# Plan de Implementación: Agente Telegram y Reportes en n8n

**Objetivo:** Crear endpoints M2M protegidos con `X-API-Key` bajo `/n8n` para el reporte diario (9:30 AM) y las herramientas (Function Calling) del agente de IA en n8n.

**Restricciones:**
- Decimal estricto para valores monetarios.
- SQLAlchemy 2.0 (`select()`, `scalars()`).
- Pydantic v2 (`ConfigDict`).
- Autenticación `verify_api_key`.

## Tareas

- [ ] Crear esquemas Pydantic en `backend/app/schemas/n8n_agent.py`
- [ ] Implementar lógica de negocio y consultas en `backend/app/services/n8n_agent_service.py`
- [ ] Crear router `/n8n` en `backend/app/routes/n8n_agent.py` y registrarlo en `backend/app/main.py`
- [ ] Crear pruebas unitarias e integración en `backend/tests/test_n8n_agent.py`
- [ ] Ejecutar suite de pruebas pytest
