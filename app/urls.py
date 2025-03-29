from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('convocatorias/crear/', views.crear_convocatoria_view, name='convocatoria_crear'),
    path('convocatorias/', views.convocatorias_view, name='convocatorias'),
]
