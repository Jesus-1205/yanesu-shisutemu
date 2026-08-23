"""baseline - stamp current schema state

Revision ID: e0f012ae4dab
Revises: 
Create Date: 2026-08-23 08:59:46.672187

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0f012ae4dab'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This is a baseline migration - the schema already exists via create_all().
    # Alembic stamps this revision so future migrations know the starting point.
    # No-op: do not modify existing tables.
    pass


def downgrade() -> None:
    # Cannot undo a baseline migration - the original schema was created by create_all().
    pass
