from django.contrib import admin
from .models import Grid, CrosswordClue, CrosswordPuzzle


class GridAdmin(admin.ModelAdmin):
    list_display = ('pk', 'width', 'height', 'cells', 'created_on', 'creator',)
    list_editable = ('width', 'height', 'cells',)


class CrosswordPuzzleAdmin(admin.ModelAdmin):
    list_display = ('pk', 'grid', 'created_on', 'creator', 'last_edited',
                    'complete', 'reviewed', 'released', 'puzzle_type',)
    list_editable = ('grid', 'creator',
                     'complete', 'reviewed', 'released')


class CrosswordClueAdmin(admin.ModelAdmin):
    list_display = ('pk', 'clue', 'solution', 'puzzle', 'word_lengths',
                    'orientation', 'start_col', 'start_row', 'created_on',
                    'creator',)
    list_editable = ('clue', 'solution', 'word_lengths', 'orientation',
                     'start_col', 'start_row', 'puzzle')


admin.site.register(Grid, GridAdmin)
admin.site.register(CrosswordPuzzle, CrosswordPuzzleAdmin)
admin.site.register(CrosswordClue, CrosswordClueAdmin)
