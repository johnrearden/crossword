import math


def get_cell_concentration(puzzle):
    """
    Method calculates the percentage of cells in a puzzle that are open - i.e.
    that can contain a letter.
    """
    cells = puzzle.grid.cells
    open_cell_count = 0
    for cell in cells:
        if cell == '#':
            open_cell_count += 1
    return math.floor(open_cell_count / len(cells) * 100)
