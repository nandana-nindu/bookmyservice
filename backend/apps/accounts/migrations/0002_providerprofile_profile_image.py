# Generated for provider profile image support.
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='providerprofile',
            name='profile_image',
            field=models.ImageField(blank=True, null=True, upload_to='provider_profiles/'),
        ),
    ]
