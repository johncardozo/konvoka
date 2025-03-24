from django.contrib import admin
from .models import CustomUser, Administrador, Postulante, Evaluador, Convocatoria, Postulacion, Rubro, Pregunta, Evaluacion

admin.site.register(CustomUser)
admin.site.register(Administrador)
admin.site.register(Postulante)
admin.site.register(Evaluador)
admin.site.register(Convocatoria)
admin.site.register(Postulacion)
admin.site.register(Rubro)
admin.site.register(Pregunta)
admin.site.register(Evaluacion)