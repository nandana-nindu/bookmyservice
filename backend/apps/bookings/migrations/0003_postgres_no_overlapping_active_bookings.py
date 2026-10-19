from django.db import migrations

CREATE_SQL = """
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE bookings_booking
ADD CONSTRAINT prevent_overlapping_active_provider_bookings
EXCLUDE USING gist (
    provider_id WITH =,
    tsrange(booking_date + start_time, booking_date + end_time, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS'));
"""
DROP_SQL = "ALTER TABLE bookings_booking DROP CONSTRAINT IF EXISTS prevent_overlapping_active_provider_bookings;"

def add_postgres_constraint(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(CREATE_SQL)

def drop_postgres_constraint(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute(DROP_SQL)

class Migration(migrations.Migration):
    dependencies = [('bookings', '0002_booking_validation_constraints')]
    operations = [migrations.RunPython(add_postgres_constraint, drop_postgres_constraint)]
