from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required

@login_required(login_url='/login/')
def index(request):
    return render(request, 'app/index.html')


def login_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']

        user = authenticate(username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('index')
        else:
            return render(request, 'app/login.html', {'error': 'Usuario o contraseña incorrectos'})
    else:
        return render(request, 'app/login.html')


def logout_view(request):
    logout(request)
    return redirect('index')


def crear_convocatoria_view(request):  
    if request.method == 'POST':
        # Aquí puedes manejar la lógica para crear una nueva convocatoria
        # Por ejemplo, guardar los datos en la base de datos
        return redirect('convocatorias')
    else:
        return render(request, 'app/crear_convocatoria.html')


def convocatorias_view(request):
    return render(request, 'app/convocatorias.html')
