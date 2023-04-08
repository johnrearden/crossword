from . import views
from django.urls import path

urlpatterns = [
    path('query/<str:query>/', views.GetMatchingWord.as_view()),
    path('get_definition/<str:query>/', views.GetDefinition.as_view()),
    path('grid_editor/', views.GridEditor.as_view(), name='grid_editor'),
    path('get_grid/', views.GetGrid.as_view(), name='get_grid'),
]
