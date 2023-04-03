from . import views
from django.urls import path

urlpatterns = [
    path('', views.WelcomeView.as_view(), name='welcome'),
]
