# Generated by Django 3.2.16 on 2023-04-09 17:22

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('builder', '0008_crosswordpuzzle_last_editied'),
    ]

    operations = [
        migrations.RenameField(
            model_name='crosswordpuzzle',
            old_name='last_editied',
            new_name='last_edited',
        ),
    ]