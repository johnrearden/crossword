from rest_framework import serializers
from .models import CrosswordClue, CrosswordPuzzle, Grid


class GridSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grid
        fields = ['width', 'height', 'cells', ]


class CrosswordClueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CrosswordClue
        fields = ['clue', 'solution', 'word_lengths', 'orientation',
                  'start_col', 'start_row', 'orientation', ]


class PuzzleSerializer(serializers.ModelSerializer):
    clues = CrosswordClueSerializer(many=True, read_only=True)

    class Meta:
        model = CrosswordPuzzle
        fields = ['grid', 'created_on', 'creator', ]
