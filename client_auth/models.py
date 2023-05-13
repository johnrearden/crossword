from django.db import models
from django.contrib.auth.models import User


class UserSocialLogin(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    email = models.EmailField()
    social_signin = models.BooleanField(default=False)
    provider = models.CharField(max_length=64, null=True, blank=True)
    provider_user_id = models.CharField(max_length=128, null=True, blank=True)

    def __str__(self):
        return f'{self.user} (social_signin:{self.social_signin})'
