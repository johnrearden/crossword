from . import views
from django.urls import path

urlpatterns = [
    path('confirm_credentials/', views.ConfirmCredentialsView.as_view(),
         name='confirm_credentials'),
    path('create_user/', views.CreateUserView.as_view(),
         name='confirm_credentials'),
    path('on_social_login/', views.OnSocialLoginView.as_view(),
         name='on_social_login'),
]
