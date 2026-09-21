import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.logging_setup import ensure_logging
from app.core.exceptions import ConflictError, EntityNotFoundError

from app.core.config import Config
from app.core.database import Base, engine
from app.core.error_handler import register_error_handlers
from app.models import Role, User, ApiKey, Supplier, Category, producto_categoria, Combo, ComboGroup, ComboGroupProduct, ComboPaymentMethod, Product, ExchangeRate, Sale, SaleItem, PaymentMethod, SalePayment, Factura, DetalleFactura, PriceRule, PriceRuleProduct, PriceRulePaymentMethod  # noqa: F401
from app.routes.auth import router as auth_router
from app.routes.categories import router as categories_router
from app.routes.combos import router as combos_router
from app.routes.exchange_rates import router as exchange_rates_router
from app.routes.health import router as health_router
from app.routes.invoices import router as invoices_router
from app.routes.price_rules import router as price_rules_router
from app.routes.products import router as products_router
from app.routes.reports import router as reports_router
from app.routes.roles import router as roles_router
from app.routes.payment_methods import router as payment_methods_router
from app.routes.sales import router as sales_router
from app.routes.suppliers import router as suppliers_router
from app.routes.users import router as users_router
from app.routes.system_settings import router as system_settings_router
from app.routes.retornable import router as retornable_router
from app.routes.dashboard import router as dashboard_router
from app.routes.webhooks import router as webhooks_router
from app.routes.n8n_agent import router as n8n_agent_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_logging()
    from app.services.audit_service import start_writer, stop_writer
    start_writer()
    logger.info("Yanesu Shisutemu arrancado")
    yield
    stop_writer()
    logger.info("Yanesu Shisutemu detenido")


app = FastAPI(
    title="Yanesu Shisutemu API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)
app = register_error_handlers(app)

origins = [o.strip() for o in Config.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "X-API-Key"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(combos_router, prefix="/api")
app.include_router(exchange_rates_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(roles_router, prefix="/api")
app.include_router(suppliers_router, prefix="/api")
app.include_router(payment_methods_router, prefix="/api")
app.include_router(price_rules_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(sales_router, prefix="/api")
app.include_router(invoices_router, prefix="/api")
app.include_router(system_settings_router, prefix="/api")
app.include_router(retornable_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(n8n_agent_router, prefix="/api")


@app.exception_handler(EntityNotFoundError)
def entity_not_found_handler(request, exc: EntityNotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
def conflict_handler(request, exc: ConflictError):
    return JSONResponse(status_code=409, content={"detail": str(exc)})
