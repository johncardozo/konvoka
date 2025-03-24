from django.urls import path
from . import views

urlpatterns = [
    path('', views.convocatorias_list, name='convocatorias_list'),
]
