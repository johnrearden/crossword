from . import views
from django.urls import path

urlpatterns = [
    path('confirm_credentials/', views.ConfirmCredentialsView.as_view(),
         name='confirm_credentials'),
    path('create_user/', views.CreateUserView.as_view(),
         name='confirm_credentials'),
]