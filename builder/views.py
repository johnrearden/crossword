from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.views import View
from django.contrib.auth.mixins import UserPassesTestMixin
from .models import DictionaryWord, DictionaryDefinition, Grid
from .models import CrosswordPuzzle, CrosswordClue
from .serializers import GridSerializer, CrosswordPuzzleSerializer, \
                         CrosswordClueSerializer
from .utils import get_cell_concentration


class BuilderHome(UserPassesTestMixin, View):
    def get(self, request):
        puzzles = CrosswordPuzzle.objects \
                                 .order_by('-last_edited')[:10]
        puzzle_list = []
        json_list = []
        for puzzle in puzzles:
            puzzle_serializer = CrosswordPuzzleSerializer(puzzle)
            cell_concentration = get_cell_concentration(puzzle)

            # Retrieve the clues for this crossword, and count the
            # number of them that have a non-empty clue string. Also count the
            # number of them that have a complete solution
            clues = CrosswordClue.objects.filter(puzzle=puzzle)
            clues_serializer = CrosswordClueSerializer(clues, many=True)
            if not clues:
                clue_count = 0
                solution_count = 0
            else:
                clue_count = 0
                solution_count = 0
                for clue in clues:
                    if len(clue.clue) > 0:
                        clue_count += 1
                    if '#' not in clue.solution:
                        solution_count += 1
            data = {
                'puzzle': puzzle,
                'clues': clues,
                'cell_concentration': cell_concentration,
                'clues_present': clue_count,
                'solutions_present': solution_count,
                'total_clues': len(clues),
            }
            json_data = {
                'json_puzzle': puzzle_serializer.data,
                'json_clues': clues_serializer.data,
            }
            puzzle_list.append(data)
            json_list.append(json_data)
        return render(
            request,
            'builder/builder_home.html',
            {'puzzles': puzzle_list, 'json_list': json_list})

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
        words = DictionaryWord.objects.filter(string=query.lower())
        def_list = []
        for word in words:
            definitions = DictionaryDefinition.objects.filter(word=word)
            for defn in definitions:
                def_list.append(defn.definition)
        return JsonResponse({'results': def_list})


class PuzzleEditor(UserPassesTestMixin, View):
    def get(self, request, puzzle_id):
        puzzle = get_object_or_404(CrosswordPuzzle, pk=puzzle_id)
        clues = CrosswordClue.objects.filter(puzzle=puzzle)
        puzzle_serializer = CrosswordPuzzleSerializer(puzzle)
        clue_serialzer = CrosswordClueSerializer(clues, many=True)
        data = {
            'puzzle': puzzle_serializer.data,
            'clues': clue_serialzer.data,
        }
        return render(request, 'builder/grid_editor.html', {'data': data})

    def test_func(self):
        return self.request.user.is_staff


class GetGrid(APIView):
    def get(self, request):
        grid = Grid.objects.all()[0]
        serializer = GridSerializer(instance=grid)

        return Response(serializer.data)


class DeletePuzzle(UserPassesTestMixin, APIView):
    def post(self, request):
        id = request.data['puzzle_id']
        CrosswordPuzzle.objects.get(pk=id).delete()
        return JsonResponse({'message': 'fine'})

    def test_func(self):
        return self.request.user.is_staff


class SavePuzzle(UserPassesTestMixin, APIView):
    def post(self, request, *args, **kwargs):
        clues_data = request.data['clues']

        if request.data['puzzle_id']:

            # Update the puzzle grid's cells field
            id = int(request.data['puzzle_id'])
            puzzle = get_object_or_404(CrosswordPuzzle, pk=id)
            grid_data = request.data['grid']
            puzzle.grid.cells = grid_data['grid_string']
            puzzle.grid.save()

            # Remove any clues previously associated with this puzzle.
            CrosswordClue.objects.filter(puzzle=puzzle).delete()

        else:
            grid_data = request.data['grid']

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
                commit=False,
            )

        # In both cases, we need to create new clues from the api call data
        puzzle_complete = True
        for item in clues_data:
            new_clue = CrosswordClue.objects.create(
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
            if len(new_clue.clue) == 0 or '#' in new_clue.solution:
                puzzle_complete = False

        # Save the crossword puzzle
        puzzle.complete = puzzle_complete
        puzzle.save()

        return JsonResponse({'puzzle_id': puzzle.id})

    def test_func(self):
        return self.request.user.is_staff


class GetRecentPuzzles(UserPassesTestMixin, APIView):
    def get(self, request, puzzle_count):
        puzzles = CrosswordPuzzle.objects \
                                 .order_by('-last_edited')[:puzzle_count]
        puzzle_list = []
        for puzzle in puzzles:
            cell_concentration = get_cell_concentration(puzzle)

            # Retrieve the clues for this crossword, and count the
            # number of them that have a non-empty clue string. Also count the
            # number of them that have a complete solution
            clues = CrosswordClue.objects.filter(puzzle=puzzle)
            if not clues:
                clue_count = 0
                solution_count = 0
            else:
                clue_count = 0
                solution_count = 0
                for clue in clues:
                    if len(clue.clue) > 0:
                        clue_count += 1
                    if '#' not in clue.solution:
                        solution_count += 1
            puzzle_serializer = CrosswordPuzzleSerializer(puzzle)
            clue_serialzer = CrosswordClueSerializer(clues, many=True)
            data = {
                'puzzle': puzzle_serializer.data,
                'clues': clue_serialzer.data,
                'cell_concentration': cell_concentration,
                'clues_present': clue_count,
                'solutions_present': solution_count,
                'total_clues': len(clues)
            }
            puzzle_list.append(data)

        return Response({'puzzles': puzzle_list})

    def test_func(self):
        return self.request.user.is_staff


class CreateNewPuzzle(UserPassesTestMixin, APIView):
    def post(self, request):
        grid = Grid.objects.create(
            creator=request.user,
            width=request.data['width'],
            height=request.data['height'],
            cells=request.data['cells'],
        )
        puzzle = CrosswordPuzzle.objects.create(
            creator=request.user,
            grid=grid,
        )

        return JsonResponse({'new_puzzle_id': puzzle.id})

    def test_func(self):
        return self.request.user.is_staff


class MarkPuzzleReviewed(UserPassesTestMixin, APIView):
    def post(self, request):
        id = request.data['id']
        print(request.data)
        puzzle = CrosswordPuzzle.objects.get(pk=id)
        if puzzle.complete:
            puzzle.reviewed = True
            puzzle.save()
            print('puzzle marked as reviewed')
            return Response(
                {'message': 'Puzzle marked as reviewed'},
                status=status.HTTP_200_OK)
        else:
            return Response(
                {'message': 'Can\'t mark reviewed - puzzle is incomplete'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def test_func(self):
        return self.request.user.is_staff


class MarkPuzzleReleased(UserPassesTestMixin, APIView):
    def post(self, request):
        id = request.data['id']
        puzzle = CrosswordPuzzle.objects.get(pk=id)
        if not puzzle.complete:
            return Response(
                status.HTTP_400_BAD_REQUEST,
                {'message': 'Can\'t mark released - puzzle is incomplete'}
            )
        elif not puzzle.reviewed:
            return Response(
                status.HTTP_400_BAD_REQUEST,
                {'message': 'Can\'t mark released - not reviewed yet'}
            )
        else:
            puzzle.released = True
            puzzle.save()
            return Response(
                {'message': 'Puzzle marked as released'},
                status=status.HTTP_200_OK)

    def test_func(self):
        return self.request.user.is_staff
