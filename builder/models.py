from django.db import models

from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class Orientation(models.TextChoices):
    ACROSS = 'AC', _('Across')
    DOWN = 'DN', _('Down')


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


class Puzzle(models.Model):
    """
    A puzzle consists of a grid, with related puzzle words.
    """
    grid = models.ForeignKey(Grid, on_delete=models.CASCADE,
                             related_name='puzzles')
    created_on = models.DateTimeField(auto_now_add=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE,
                                related_name='grid_creator')

    def __str__(self):
        return (f'Puzzle by {self.creator} ({self.created_on}'
                f') ({self.grid.width}x{self.grid.height})')


class DictionaryWord(models.Model):
    """ A single word from the dictionary, with a frequency field """
    string = models.CharField(max_length=100)
    length = models.IntegerField()
    frequency = models.IntegerField()

    def __str__(self):
        return (f'DictionaryEntry : {self.string}, len={self.length}'
                f', freq={self.frequency}')


class Clue(models.Model):
    """ A clue has a many-to-one relationship with a dictionary word """
    word = models.ForeignKey(DictionaryWord, on_delete=models.CASCADE,
                             related_name='clues')
    clue_string = models.CharField(max_length=200)

    def __str__(self):
        return f'Clue for "{self.word.string}" : {self.clue_string}'


class PuzzleWord(models.Model):
    """ An element of a puzzle, with an initially blank string """
    word = models.ForeignKey(DictionaryWord, on_delete=models.CASCADE,
                             related_name='puzzle_words')
    puzzle = models.ForeignKey(Puzzle, on_delete=models.CASCADE,
                               related_name='puzzle_words')
    string = models.CharField(max_length=50, null=False, blank=True,
                              default='')
    orientation = models.CharField(max_length=2, choices=Orientation.choices,
                                   default=Orientation.ACROSS)

    def __str__(self):
        return (f'Word from puzzle {self.puzzle} : {self.string}'
                f' ({self.orientation})')


class DictionaryDefinition(models.Model):
    definition = models.TextField(max_length=1024)
    word = models.ForeignKey(DictionaryWord, on_delete=models.CASCADE,
                             related_name='definitions')

    def __str__(self):
        return f'Definition of {self.word.string} : {self.definition}'
