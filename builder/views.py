from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from django.views import View
from .models import DictionaryWord, DictionaryDefinition, Grid
from .serializers import GridSerializer


class GetMatchingWord(View):
    def get(self, request):
        if 'q' in request.GET:
            string = request.GET['q']
            known_chars = []
            for i, char in enumerate(string):
                if char != '_':
                    known_chars.append((i, char))

            length = len(string)
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

            context = {
                'results': words,
            }
        else:
            context = {}
        return render(request, 'builder/temp.html', context)


class GetDefinition(View):
    def get(self, request):
        context = {}
        query = request.GET['def']
        if 'def' in request.GET:
            words = DictionaryWord.objects.filter(string=query)
            def_list = []
            for word in words:
                definitions = DictionaryDefinition.objects.filter(word=word)
                for defn in definitions:
                    def_list.append(defn.definition)

            context['def_results'] = def_list or ['Sorry, no definitions found']
        return render(request, 'builder/temp.html', context)


class GridEditor(View):
    def get(self, request):
        return render(request, 'builder/grid_editor.html')


class GetGrid(APIView):
    def get(self, request):
        grid = Grid.objects.all()[0]
        serializer = GridSerializer(instance=grid)
        print(serializer.data)

        return Response(serializer.data)
