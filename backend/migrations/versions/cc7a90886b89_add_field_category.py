"""add field category

Revision ID: cc7a90886b89
Revises: e4d25adb7aae
Create Date: 2026-11-02 12:03:24.577241

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc7a90886b89'
down_revision: Union[str, Sequence[str], None] = 'e4d25adb7aae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("fields", sa.Column("category", sa.String(30), nullable=False, server_default="OTHER"))
    op.execute("UPDATE fields SET category = 'STUDENTS' WHERE label LIKE 'Student%'")
    op.execute("UPDATE fields SET category = 'TEACHING' WHERE label LIKE 'Teaching%'")
    op.execute("UPDATE fields SET category = 'NON_TEACHING' WHERE label LIKE 'Non-Teaching%'")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("fields", "category")
