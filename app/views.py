from django.shortcuts import render

def convocatorias_list(request):
    return render(request, 'app/convocatorias_list.html')