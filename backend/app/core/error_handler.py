import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)


def register_error_handlers(app):
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        ip = request.client.host if request.client else "local"
        logger.warning("ValueError [%s %s] ip=%s: %s", request.method, request.url.path, ip, exc)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc)},
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        ip = request.client.host if request.client else "local"
        logger.error("IntegrityError [%s %s] ip=%s: %s", request.method, request.url.path, ip, exc)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Conflicto de integridad: el recurso ya existe o tiene dependencias"},
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        ip = request.client.host if request.client else "local"
        logger.exception("Unhandled exception [%s %s] ip=%s", request.method, request.url.path, ip)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Error interno del servidor"},
        )

    return app
