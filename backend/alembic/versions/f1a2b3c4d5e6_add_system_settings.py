"""add_system_settings_table

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-07-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("clave", sa.String(length=100), nullable=False),
        sa.Column("valor_cifrado", sa.Text(), nullable=False),
        sa.Column("descripcion", sa.String(length=255), nullable=True),
        sa.Column("actualizado_por", sa.Integer(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(now() AT TIME ZONE 'America/Caracas')"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["actualizado_por"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clave"),
    )
    op.create_index("ix_system_settings_clave", "system_settings", ["clave"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_system_settings_clave", table_name="system_settings")
    op.drop_table("system_settings")
