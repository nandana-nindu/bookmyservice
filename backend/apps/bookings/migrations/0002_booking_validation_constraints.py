from django.db import migrations, models
from django.db.models import F, Q

class Migration(migrations.Migration):
    dependencies = [('bookings', '0001_initial')]
    operations = [
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(condition=Q(end_time__gt=F('start_time')), name='booking_end_after_start'),
        ),
        migrations.AddConstraint(
            model_name='booking',
            constraint=models.CheckConstraint(condition=Q(total_price__gte=0), name='booking_price_nonnegative'),
        ),
    ]
