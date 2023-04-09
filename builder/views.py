from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import UserPassesTestMixin
from .models import DictionaryWord, DictionaryDefinition, Grid
from .models import CrosswordPuzzle, CrosswordClue
from .serializers import GridSerializer, CrosswordPuzzleSerializer, CrosswordClueSerializer


class BuilderHome(UserPassesTestMixin, View):
    def get(self, request):
        return render(request, 'builder/builder_home.html')

    def test_func(self):
        return self.request.user.is_staff


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


class GridEditor(UserPassesTestMixin, View):
    def get(self, request):
        return render(request, 'builder/grid_editor.html')

    def test_func(self):
        return self.request.user.is_staff


class GetGrid(APIView):
    def get(self, request):
        grid = Grid.objects.all()[0]
        serializer = GridSerializer(instance=grid)

        return Response(serializer.data)


class SavePuzzle(APIView):
    def post(self, request, *args, **kwargs):
        if request.data['puzzle_id']:
            print('puzzle has id')
        else:
            grid_data = request.data['grid']
            clues_data = request.data['clues']

            # Create a grid
            grid = Grid.objects.create(
                creator=request.user,
                width=grid_data['width'],
                height=grid_data['height'],
                cells=grid_data['grid_string'],
            )

            # Create a puzzle
            puzzle = CrosswordPuzzle.objects.create(
                grid=grid,
                creator=request.user,
            )

            # Create the clues
            for item in clues_data:
                CrosswordClue.objects.create(
                    puzzle=puzzle,
                    creator=request.user,
                    clue=item['clue'],
                    clue_number=item['clue_number'],
                    solution=item['solution'],
                    word_lengths=item['word_lengths'],
                    orientation=item['orientation'],
                    start_row=item['start_row'],
                    start_col=item['start_col'],
                )

        return Response('You betcha')


class GetRecentPuzzles(UserPassesTestMixin, APIView):
    def get(self, request, puzzle_count):
        puzzle = CrosswordPuzzle.objects \
                                 .order_by('-created_on')[0]
        clues = CrosswordClue.objects.filter(puzzle=puzzle)
        puzzle_serializer = CrosswordPuzzleSerializer(puzzle)
        print(puzzle_serializer.data)
        clue_serialzer = CrosswordClueSerializer(clues, many=True)
        data = {
            'puzzle': puzzle_serializer.data,
            'clues': clue_serialzer.data,
        }

        return Response(data)

    def test_func(self):
        return self.request.user.is_staff
