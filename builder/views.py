from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import JsonResponse
from django.views import View
from .models import DictionaryWord, DictionaryDefinition, Grid
from .serializers import GridSerializer


class GetMatchingWord(APIView):
    def get(self, request, query):
        query = query.lower()
        known_chars = []
        for i, char in enumerate(query):
            if char != '_':
                known_chars.append((i, char))

        length = len(query)
        result_list = []
        full_list = DictionaryWord.objects.filter(length=length) \
            .order_by('frequency')
        for candidate in full_list:
            match = True
            for tup in known_chars:
                index = tup[0]
                char = tup[1]
                if candidate.string[index] != char:
                    match = False
                    break
            if match:
                result_list.append(candidate)
        result_list.sort(key=DictionaryWord.get_frequency, reverse=True)
        words = [d_word.string for d_word in result_list]

        return JsonResponse({'results': words})


class GetDefinition(APIView):
    def get(self, request, query):
        words = DictionaryWord.objects.filter(string=query)
        def_list = []
        for word in words:
            definitions = DictionaryDefinition.objects.filter(word=word)
            for defn in definitions:
                def_list.append(defn.definition)
        return JsonResponse({'results': def_list})


class GridEditor(View):
    def get(self, request):
        return render(request, 'builder/grid_editor.html')


class GetGrid(APIView):
    def get(self, request):
        grid = Grid.objects.all()[0]
        serializer = GridSerializer(instance=grid)

        return Response(serializer.data)
