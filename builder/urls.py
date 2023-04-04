from . import views
from django.urls import path

urlpatterns = [
    path('query/', views.GetMatchingWord.as_view(), name='query_word'),
    path('query_definition/', views.GetDefinition.as_view(),
         name='query_definition'),
    path('grid_editor/', views.GridEditor.as_view(), name='grid_editor'),
    path('get_grid/', views.GetGrid.as_view(), name='get_grid'),
]
