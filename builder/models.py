from django.db import models

from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class Orientation(models.TextChoices):
    ACROSS = 'AC', _('Across')
    DOWN = 'DN', _('Down')


class PuzzleType(models.TextChoices):
    CROSSWORD = 'CSWD', _('Crossword')
    CRANAGRAM = 'CRGM', _('Crannagram')


class Grid(models.Model):
    """
    A framework for a puzzle, with variable width and height. A null square is
    represented by a '#', and a blank square by a '_'.
    """
    created_on = models.DateTimeField(auto_now_add=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE,
                                related_name='grids')
    width = models.IntegerField(default=12)
    height = models.IntegerField(default=12)
    cells = models.TextField(max_length=625)

    def __str__(self):
        return (f'Grid ({self.width}x{self.height}), created on '
                f'{self.created_on} by {self.creator}.')


class CrosswordPuzzle(models.Model):
    """
    A puzzle consists of a grid, with related puzzle words.
    """
    grid = models.OneToOneField(Grid, on_delete=models.CASCADE,
                                related_name='puzzles')
    created_on = models.DateTimeField(auto_now_add=True)
    last_edited = models.DateTimeField(auto_now=True)
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                related_name='grid_creator')
    puzzle_type = models.CharField(max_length=4, choices=PuzzleType.choices,
                                   default=PuzzleType.CROSSWORD)
    complete = models.BooleanField(default=False)
    reviewed = models.BooleanField(default=False)
    released = models.BooleanField(default=False)

    def __str__(self):
        return (f'Puzzle ({self.id}) by {self.creator} ({self.created_on}'
                f') ({self.grid.width}x{self.grid.height})')


class DictionaryWord(models.Model):
    """ A single word from the dictionary, with a frequency field """
    string = models.CharField(max_length=100)
    length = models.IntegerField()
    frequency = models.IntegerField()

    def get_frequency(self):
        return self.frequency

    def __str__(self):
        return (f'DictionaryEntry : {self.string}, len={self.length}'
                f', freq={self.frequency}')


class DictionaryDefinition(models.Model):
    definition = models.TextField(max_length=1024)
    word = models.ForeignKey(DictionaryWord, on_delete=models.CASCADE,
                             related_name='definitions')

    def __str__(self):
        return f'Definition of {self.word.string} : {self.definition}'


class CrosswordClue(models.Model):
    """ A clue comprises a clue string, a solution string, a format string,
        a containing puzzle, a start location within that puzzle, and an
        orientation."""
    puzzle = models.ForeignKey(CrosswordPuzzle, on_delete=models.CASCADE,
                               related_name='clues', null=True)
    clue = models.CharField(max_length=1024, null=True, blank=True)
    clue_number = models.IntegerField(default=0)
    solution = models.CharField(max_length=127)
    word_lengths = models.CharField(max_length=64, null=True, blank=True)
    orientation = models.CharField(max_length=2, choices=Orientation.choices,
                                   default=Orientation.ACROSS)
    start_row = models.IntegerField(null=True, blank=True)
    start_col = models.IntegerField(null=True, blank=True)
    created_on = models.DateTimeField(auto_now_add=True)
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                related_name="created_clues")

    def __str__(self):
        return f'{self.solution}" : {self.clue} ({self.word_lengths})'
