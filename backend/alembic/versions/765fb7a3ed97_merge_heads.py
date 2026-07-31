"""merge_heads

Revision ID: 765fb7a3ed97
Revises: 4e8f6c2d5a1b, 5a8b2c3d4e5f
Create Date: 2026-07-24 13:44:45.148148

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '765fb7a3ed97'
down_revision: Union[str, None] = ('4e8f6c2d5a1b', '5a8b2c3d4e5f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
