from . import views
from django.urls import path

urlpatterns = [
    path('get_example/', views.GetExample.as_view(),
         name='builder_home'),
    path('get_example_crannagram/',
         views.GetExampleCrannagram.as_view(),
         name='get_example_crannagram')
]
