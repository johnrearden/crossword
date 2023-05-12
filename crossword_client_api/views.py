from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from builder.models import CrosswordPuzzle, CrosswordClue
from builder.serializers import CrosswordPuzzleSerializer,\
      CrosswordClueSerializer


class GetExample(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        crossword = CrosswordPuzzle.objects.order_by('-last_edited')[0]
        clues = CrosswordClue.objects.filter(puzzle=crossword)
        puzzle_serializer = CrosswordPuzzleSerializer(crossword)
        clue_serializer = CrosswordClueSerializer(clues, many=True)
        data = {
            'puzzle': puzzle_serializer.data,
            'clues': clue_serializer.data,
        }

        return Response({'data': data})
