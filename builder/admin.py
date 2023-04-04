from django.contrib import admin
from .models import Grid, CrosswordClue, CrosswordPuzzle


class GridAdmin(admin.ModelAdmin):
    list_display = ('pk', 'width', 'height', 'cells', 'created_on', 'creator',)
    list_editable = ('width', 'height', 'cells',)


class CrosswordPuzzleAdmin(admin.ModelAdmin):
    list_display = ('pk', 'grid', 'created_on', 'creator')


class CrosswordClueAdmin(admin.ModelAdmin):
    list_display = ('pk', 'clue', 'solutions', 'word_lengths', 'orientation',
                    'start_col', 'start_row', 'created_on', 'creator',
                    'puzzle',)
    list_editable = ('clue', 'solution', 'word_lengths', 'orientation',
                     'start_col', 'start_row',)


admin.register(Grid, GridAdmin)
admin.register(CrosswordPuzzle, CrosswordPuzzleAdmin)
admin.register(CrosswordClue, CrosswordClueAdmin)
