from . import views
from django.urls import path

urlpatterns = [
    path('query/', views.GetMatchingWord.as_view(), name='query_word')
]
