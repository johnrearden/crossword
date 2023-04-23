from . import views
from django.urls import path

urlpatterns = [
    path('get_example/', views.GetExample.as_view(),
         name='builder_home'),
]
