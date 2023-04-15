from . import views
from django.urls import path

urlpatterns = [
    path('query/<str:query>/', views.GetMatchingWord.as_view()),
    path('get_definition/<str:query>/', views.GetDefinition.as_view()),
    path('grid_editor/', views.GridEditor.as_view(), name='grid_editor'),
    path('get_grid/', views.GetGrid.as_view(), name='get_grid'),
    path('save_puzzle/', views.SavePuzzle.as_view(), name='save_puzzle'),
    path('get_recent_puzzles/<int:puzzle_count>/',
         views.GetRecentPuzzles.as_view(),
         name='get_recent_puzzles'),
    path('', views.BuilderHome.as_view(),
         name='builder_home'),
    path('puzzle_editor/<int:puzzle_id>/', views.PuzzleEditor.as_view()),
]
