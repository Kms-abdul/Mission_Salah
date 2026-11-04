"""Create tables and load dummy data.
Usage:  python seed.py          (create + seed if empty)
        python seed.py --reset  (DROP everything, then recreate + seed)
"""
import random
import sys
from datetime import datetime, time, timedelta

from sqlalchemy import select

from app.config import today_ist
from app.database import Base, SessionLocal, engine
from app.models import Branch, FieldDef, Submission, SubmissionValue, User
from app.security import hash_password


def run(reset: bool = False):
    if reset:
        Base.metadata.drop_all(engine)
        print("All tables dropped.")
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        if db.scalar(select(User).limit(1)):
            print("Database already has data; seed skipped. Use --reset to start fresh.")
            return

        b1 = Branch(code="HYD01", name="Hyderabad - Ameerpet")
        b2 = Branch(code="HYD02", name="Hyderabad - Kukatpally")
        b3 = Branch(code="SEC01", name="Secunderabad - Main")

        fields = [
            FieldDef(label="Cash Collection (₹)", field_type="DECIMAL", is_required=True, sort_order=1),
            FieldDef(label="No. of Customers Visited", field_type="INTEGER", is_required=True, sort_order=2),
            FieldDef(label="No. of Transactions", field_type="INTEGER", is_required=True, sort_order=3),
            FieldDef(label="Expenses (₹)", field_type="DECIMAL", is_required=False, sort_order=4),
            FieldDef(label="Remarks", field_type="TEXT", is_required=False, sort_order=5),
        ]

        admin = User(username="admin", password_hash=hash_password("Admin@123"),
                     full_name="System Admin", role="ADMIN")
        entry1 = User(username="entry1", password_hash=hash_password("Entry@123"),
                      full_name="Ravi Kumar", role="ENTRY", branches=[b1, b2])
        entry2 = User(username="entry2", password_hash=hash_password("Entry@123"),
                      full_name="Priya Sharma", role="ENTRY", branches=[b3])
        report1 = User(username="report1", password_hash=hash_password("Report@123"),
                       full_name="Regional Manager", role="REPORT", branches=[b1, b2, b3])

        db.add_all([b1, b2, b3, *fields, admin, entry1, entry2, report1])
        db.flush()

        # Sample history for the last 3 days (today is left empty for testing entry)
        today = today_ist()
        for days_ago in range(1, 4):
            d = today - timedelta(days=days_ago)
            for branch, who in ((b1, entry1), (b2, entry1), (b3, entry2)):
                if branch is b3 and days_ago == 1:
                    continue  # leave one gap so the "Pending" report shows something
                customers = random.randint(20, 80)
                vals = {
                    fields[0].id: f"{random.uniform(10000, 50000):.2f}",
                    fields[1].id: str(customers),
                    fields[2].id: str(customers + random.randint(0, 30)),
                    fields[3].id: f"{random.uniform(500, 3000):.2f}",
                    fields[4].id: "Sample data",
                }
                db.add(Submission(
                    branch_id=branch.id, entry_date=d, submitted_by=who.id,
                    submitted_at=datetime.combine(d, time(18, random.randint(0, 59))),
                    values=[SubmissionValue(field_id=k, value=v) for k, v in vals.items()],
                ))
        db.commit()

    print("Seed complete.")
    print("  admin   / Admin@123   (ADMIN)")
    print("  entry1  / Entry@123   (ENTRY: HYD01, HYD02)")
    print("  entry2  / Entry@123   (ENTRY: SEC01)")
    print("  report1 / Report@123  (REPORT: all 3 branches)")


if __name__ == "__main__":
    run(reset="--reset" in sys.argv)