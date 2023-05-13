from django.contrib import admin
from .models import UserSocialLogin


class UserSocialLoginAdmin(admin.ModelAdmin):
    list_display = ('pk', 'user', 'email', 'social_signin', 'provider',
                    'provider_user_id')


admin.site.register(UserSocialLogin, UserSocialLoginAdmin)
