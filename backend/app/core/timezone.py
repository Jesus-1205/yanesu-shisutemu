from datetime import date, datetime, timedelta, timezone

from sqlalchemy.sql.expression import ClauseElement, ColumnElement
from sqlalchemy.ext.compiler import compiles

VE_TZ = timezone(timedelta(hours=-4))


def ve_today() -> date:
    """Retorna la fecha actual en America/Caracas (UTC-4)."""
    return datetime.now(VE_TZ).date()


class VE_NOWClause(ClauseElement):
    inherit_cache = True


@compiles(VE_NOWClause)
def compile_ve_now_pg(element, compiler, **kw):
    return "now()"


@compiles(VE_NOWClause, "sqlite")
def compile_ve_now_sqlite(element, compiler, **kw):
    return "datetime('now', '-4 hours')"


VE_NOW = VE_NOWClause()


class HORA_DIAClause(ColumnElement):
    inherit_cache = True

    def __init__(self, column):
        self.column = column


@compiles(HORA_DIAClause)
def compile_hora_dia_pg(element, compiler, **kw):
    return f"TO_CHAR({compiler.process(element.column)}, 'HH24:MI:SS')"


@compiles(HORA_DIAClause, "sqlite")
def compile_hora_dia_sqlite(element, compiler, **kw):
    return f"time({compiler.process(element.column)})"


HORA_DIA = HORA_DIAClause
