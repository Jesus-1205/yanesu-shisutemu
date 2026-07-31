from sqlalchemy.sql.expression import ClauseElement
from sqlalchemy.ext.compiler import compiles


class VE_NOWClause(ClauseElement):
    inherit_cache = True


@compiles(VE_NOWClause)
def compile_ve_now_pg(element, compiler, **kw):
    return "(now() AT TIME ZONE 'America/Caracas')"


@compiles(VE_NOWClause, "sqlite")
def compile_ve_now_sqlite(element, compiler, **kw):
    return "datetime('now', '-4 hours')"


VE_NOW = VE_NOWClause()
