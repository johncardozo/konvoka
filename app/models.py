from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth.models import AbstractUser, Group, Permission

class CustomUser(AbstractUser):
    ROLES = [
        ('administrador', 'Administrador'),
        ('postulante', 'Postulante'),
        ('evaluador', 'Evaluador')
    ]
    role = models.CharField(max_length=20, choices=ROLES)

    groups = models.ManyToManyField(Group, related_name="custom_users", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="custom_users_permissions", blank=True)

    def is_administrador(self):
        return self.role == 'administrador'
    
    def is_postulante(self):
        return self.role == 'postulante'
    
    def is_evaluador(self):
        return self.role == 'evaluador'

class Administrador(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='administrador')

    def clean(self):
        if self.user.role != 'administrador':
            raise ValidationError("El usuario debe tener el rol de Administrador.")

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}" 

class Postulante(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='postulante')

    def clean(self):
        if self.user.role != 'postulante':
            raise ValidationError("El usuario debe tener el rol de Postulante.")

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}" 

class Evaluador(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='evaluador')

    def clean(self):
        if self.user.role != 'evaluador':
            raise ValidationError("El usuario debe tener el rol de Evaluador.")

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}" 

class Convocatoria(models.Model):
    ESTADO_CHOICES = [
        ('abierta', 'Abierta'),
        ('cerrada', 'Cerrada'),
        ('adjudicada', 'Adjudicada'),
        ('en_evaluacion', 'En Evaluación')
    ]

    fecha_creacion = models.DateField(auto_now_add=True)
    titulo = models.CharField(max_length=255)
    responsable = models.ForeignKey(Administrador, on_delete=models.SET_NULL, null=True)
    presupuesto = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='abierta')

    def __str__(self):
        return self.titulo

    def clean(self):
        if self.presupuesto < 0:
            raise ValidationError("El presupuesto no puede ser negativo.")

class Postulacion(models.Model):
    postulante = models.ForeignKey(Postulante, on_delete=models.CASCADE, related_name='postulaciones')
    convocatoria = models.ForeignKey(Convocatoria, on_delete=models.CASCADE, related_name='postulaciones')
    fecha_postulacion = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.postulante} - {self.convocatoria}"

class Rubro(models.Model):
    postulacion = models.ForeignKey(Postulacion, on_delete=models.CASCADE, related_name='rubros')
    nombre = models.CharField(max_length=255)
    monto_propuesto = models.DecimalField(max_digits=10, decimal_places=2)
    monto_aprobado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return self.nombre

    def clean(self):
        if self.monto_propuesto < 0:
            raise ValidationError("El monto propuesto no puede ser negativo.")
        if self.monto_aprobado is not None and self.monto_aprobado < 0:
            raise ValidationError("El monto aprobado no puede ser negativo.")

class Pregunta(models.Model):
    convocatoria = models.ForeignKey(Convocatoria, on_delete=models.CASCADE, related_name='preguntas')
    texto = models.TextField()
    peso = models.IntegerField()

    def __str__(self):
        return self.texto

    def clean(self):
        if self.peso < 0:
            raise ValidationError("El peso de la pregunta no puede ser negativo.")

class Evaluacion(models.Model):
    evaluador = models.ForeignKey(Evaluador, on_delete=models.CASCADE, related_name='evaluaciones')
    postulacion = models.ForeignKey(Postulacion, on_delete=models.CASCADE, related_name='evaluaciones')
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE, related_name='evaluaciones')
    fecha_evaluacion = models.DateField(auto_now_add=True)
    puntaje = models.IntegerField()

    def __str__(self):
        return f"Evaluación de {self.postulacion} por {self.evaluador}"

    def clean(self):
        if self.puntaje < 0 or self.puntaje > 100:
            raise ValidationError("El puntaje debe estar entre 0 y 100.")
