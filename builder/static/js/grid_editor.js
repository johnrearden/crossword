let grid;
let currentHighlightedCell;
let currentHighlightedClue;
const OPEN = '#';
const CLOSED = '-';

document.addEventListener('DOMContentLoaded', () => {
    const url = '/builder/get_grid/';
    fetch(url).then(response => response.json())
        .then(json => {
            grid = new Grid(json);
            drawGrid(grid);
        });
});


const drawGrid = (grid) => {
    const width = grid.width;
    const height = grid.height;
    const cells = grid.cells;

    const gridDiv = document.getElementById('grid-editor-div');
    gridDiv.style.setProperty('--grid-rows', height);
    gridDiv.style.setProperty('--grid-cols', width);

    document.addEventListener('keyup', (event) => {
        grid.onKeyup(event);
    })

    for (let i = 0; i < cells.length; i++) {
        const cellDiv = document.createElement('div');
        cellDiv.id = `cellDiv-${i}`;
        cellDiv.classList.add(cells[i].value === OPEN ? 'open' : 'blank');
        if (cells[i].value === OPEN) {
            const span = document.createElement('span');
            span.classList.add('numbered');
            span.innerText = `${Math.floor(i / width)},${i % width}`;

            cellDiv.appendChild(span);
        }
        cellDiv.addEventListener('click', (event) => {
            if (!isEditingLayout()) {
                const clickedCellIndex = event.target.id.split('-')[1];
                const clickedCell = cells[clickedCellIndex];

                // Remove highlighting from previous cell and clue.
                if (currentHighlightedClue) {
                    const cells = getClueCells(currentHighlightedClue, grid);
                    for (let cell of cells) {
                        const index = getCellIndex(cell, grid);
                        const cellDiv = document.getElementById(`cellDiv-${index}`);
                        cellDiv.classList.remove('highlighted-cell', 'highlighted-clue');
                    }
                }

                // Highlight the current cell and clue. Toggle the down and across clues if both
                // exist.
                let currentClue = null;
                if (currentHighlightedCell == clickedCell) {
                    if (currentHighlightedClue.orientation === 'AC' && clickedCell.clueDown) {
                        currentClue = clickedCell.clueDown;
                    } else if (currentHighlightedClue.orientation === 'DN' && clickedCell.clueAcross) {
                        currentClue = clickedCell.clueAcross;
                    }
                } else {
                    currentClue = clickedCell.clueAcross || clickedCell.clueDown;
                }

                const cellsToHighlight = getClueCells(currentClue, grid);
                for (let cell of cellsToHighlight) {
                    const index = getCellIndex(cell, grid);
                    const cellDiv = document.getElementById(`cellDiv-${index}`);
                    cellDiv.classList.add('highlighted-clue');
                }
                const cellDiv = document.getElementById(`cellDiv-${clickedCellIndex}`);
                cellDiv.classList.add('highlighted-cell');
                currentHighlightedClue = currentClue;
                currentHighlightedCell = clickedCell;

                // Render the current highlighted clue in the clue query box.
                const clueDiv = document.getElementById('current-clue-div');
                const newSpans = [];
                for (let cell of cellsToHighlight) {
                    const span = document.createElement('span');
                    span.id = `cluespan-${cell.index}`;
                    span.classList.add('highlighted-clue', 'clue-character');
                    if (cell == currentHighlightedCell) {
                        span.classList.add('highlighted-cell');
                    }
                    span.innerText = cell.value === OPEN ? '_' : cell.value;
                    newSpans.push(span);
                }

                clueDiv.replaceChildren(...newSpans);


            } else {
                event.target.classList.toggle('open');
                event.target.classList.toggle('blank');
                const cellIndex = event.target.id.split('-')[1];
                cells[cellIndex].value = cells[cellIndex].value === OPEN ? CLOSED : OPEN;
                grid.reindex();
            }
        });
        gridDiv.appendChild(cellDiv);
    }
}

const renderCurrentClue = (currentClue, currentCell) => {

}

class Clue {
    constructor(startRow, startCol, orientation) {
        this.clue = '';
        this.solution = [];
        this.cellList = [];
        this.word_lengths = '';
        this.orientation = orientation;
        this.startRow = startRow;
        this.startCol = startCol;
        this.number = 0;
        this.len = 1;
    }
}

class Cell {
    constructor(row, col, value, index) {
        this.row = row;
        this.col = col;
        this.value = value;
        this.index = index;
        this.clueAcross = null;
        this.clueDown = null;
    }
}

class Grid {
    constructor(gridAsJSON) {
        this.width = gridAsJSON.width;
        this.height = gridAsJSON.height;
        this.cells = []
        this.clues = []
        for (let i = 0; i < gridAsJSON.cells.length; i++) {
            const cell = new Cell(
                Math.floor(i / this.width),
                i % this.width,
                gridAsJSON.cells[i],
                i);
            this.cells.push(cell);
        }
        this.reindex();
    }

    reindex = () => {

        // Clear the grid's clue list.
        this.clues = [];

        // Clear each cells clue attributes
        for (let cell of this.cells) {
            cell.clueAcross = null;
            cell.clueDown = null;
        }

        // Iterate through the cells, assigning each one's clueAcross and
        // clueDown attribute a clue, that clue being shared with it's 
        // open neighbours.
        for (let i = 0; i < this.cells.length; i++) {

            // If cell is closed, skip it - it's not part of a clue
            if (this.cells[i].value === CLOSED) {
                continue;
            }

            // Check cell neighbours
            const hasLeft = hasLeftNeighbour(this.cells[i], this);
            const hasRight = hasRightNeighbour(this.cells[i], this);
            const hasTop = hasTopNeighbour(this.cells[i], this);
            const hasBottom = hasBottomNeighbour(this.cells[i], this);

            // If cell has no left neighbour, but has a right neighbour, 
            // it starts an AC clue. Create an AC clue, and place a reference
            // to it in this cell.
            if (!hasLeft && hasRight) {
                const clue = new Clue(
                    Math.floor(i / this.width),
                    i % this.width,
                    'AC'
                );
                clue.cellList.push(this.cells[i]);
                this.clues.push(clue);
                this.cells[i].clueAcross = clue;
                clue.solution[0] = this.cells[i].value;
            }

            // If cell has a left neighbour, it shares the same clue reference.
            // Increment this clue's length value, len.
            if (hasLeft) {
                const sharedClue = this.cells[i - 1].clueAcross;
                sharedClue.len += 1;
                sharedClue.cellList.push(this.cells[i]);
                this.cells[i].clueAcross = sharedClue;
                sharedClue.solution[sharedClue.len - 1] = this.cells[i].value;
            }

            // If cell has no top neighbour, but has a bottom neighbour, 
            // it starts a DN clue. Create a DN clue, and place a reference
            // to it in this cell.
            if (!hasTop && hasBottom) {
                const clue = new Clue(
                    Math.floor(i / this.width),
                    i % this.width,
                    'DN'
                );
                clue.cellList.push(this.cells[i]);
                this.clues.push(clue);
                this.cells[i].clueDown = clue;
                clue.solution[0] = this.cells[i].value;
            }

            // if cell has a top neighbour, it shares the same clue reference
            // Increment this clue's length value, len.
            if (hasTop) {
                const sharedClue = this.cells[i - this.width].clueDown;
                sharedClue.len += 1;
                sharedClue.cellList.push(this.cells[i]);
                this.cells[i].clueDown = sharedClue;
                sharedClue.solution[sharedClue.len - 1] = this.cells[i].value;
            }
        }
    }

    // Handle a keyup event on the document
    onKeyup = (event) => {
        const cell = currentHighlightedCell;
        const clue = currentHighlightedClue;
        const cellListIndex = clue.cellList.indexOf(cell);

        // Handle a letter key being released.
        if (event.keyCode >= 65 && event.keyCode <= 90) {
            const character = String.fromCharCode(event.keyCode);
            cell.value = character;
            const index = cell.index;
            const cellDiv = document.getElementById(`cellDiv-${index}`);
            cellDiv.innerHTML = character;
            const clueSpan = document.getElementById(`cluespan-${index}`);
            clueSpan.innerText = character;

            // If not at end of clue, advance the currentHighlightedClue
            // to the next clue on the cellList.
            if (cellListIndex < clue.len - 1) {
                currentHighlightedCell = clue.cellList[cellListIndex + 1];
            }
        }

        // Handle BACKSPACE being pressed
        const hasValue = cell.value != '' && cell.value != OPEN;

        if (event.keyCode === 8) {
            if (hasValue) {
                // The cell should be cleared, and the index moved back.
                const index = currentHighlightedCell.index;
                const cellDiv = document.getElementById(`cellDiv-${index}`);
                cellDiv.innerHTML = '';
                const clueSpan = document.getElementById(`cluespan-${index}`);
                clueSpan.innerText = '_';
                if (cellListIndex > 0) {
                    currentHighlightedCell = clue.cellList[cellListIndex - 1];
                }
            } else {
                // The index should be moved back, and then that cell cleared.
                if (cellListIndex > 0) {
                    currentHighlightedCell = clue.cellList[cellListIndex - 1];
                }
                const index = currentHighlightedCell.index;
                const cellDiv = document.getElementById(`cellDiv-${index}`);
                cellDiv.innerHTML = '';
                const clueSpan = document.getElementById(`cluespan-${index}`);
                clueSpan.innerText = '_';
            }
        }
    }
}

const hasLeftNeighbour = (cell, grid) => {
    if (cell.col % grid.width === 0) {
        return false;
    }
    const index = getCellIndex(cell, grid);
    return grid.cells[index - 1].value !== CLOSED;
}

const hasRightNeighbour = (cell, grid) => {
    if (cell.col === grid.width - 1) {
        return false;
    }
    const index = getCellIndex(cell, grid);
    return grid.cells[index + 1].value !== CLOSED;
}

const hasTopNeighbour = (cell, grid) => {
    if (cell.row % grid.height === 0) {
        return false;
    }
    const index = getCellIndex(cell, grid);
    return grid.cells[index - grid.width].value !== CLOSED;
}

const hasBottomNeighbour = (cell, grid) => {
    if (cell.row === grid.height - 1) {
        return false;
    }
    const index = getCellIndex(cell, grid);
    return grid.cells[index + grid.width].value !== CLOSED;
}

const getCellIndex = (cell, grid) => {
    return cell.col + cell.row * grid.width;
}

const getClueCells = (clue, grid) => {

    if (!clue) {
        return [];
    }

    // Calculate the clue indices.
    const clueCellIndices = [];
    if (clue.orientation === 'AC') {
        const row = clue.startRow;
        for (let i = clue.startCol; i < clue.startCol + clue.len; i++) {
            clueCellIndices.push(row * grid.width + i);
        }
    } else if (clue.orientation === 'DN') {
        const col = clue.startCol;
        for (let i = clue.startRow; i < clue.startRow + clue.len; i++) {
            clueCellIndices.push(col + i * grid.width);
        }
    }

    // Return the cells corresponding to these indices
    const cells = []
    for (let i of clueCellIndices) {
        cells.push(grid.cells[i]);
    }
    return cells;
}

// Check if the user has selected the layout editor checkbox on the page
const isEditingLayout = () => {
    const checkbox = document.getElementById('layout-editor-checkbox');
    return checkbox.checked;
}







