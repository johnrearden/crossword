export const OPEN = '#';
export const CLOSED = '-';

export class Clue {
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

export class Cell {
    constructor(row, col, value, index) {
        this.row = row;
        this.col = col;
        this.value = value;
        this.index = index;
        this.clueAcross = null;
        this.clueDown = null;
    }
}

export class Grid {
    constructor(gridAsJSON) {
        this.width = gridAsJSON.width;
        this.height = gridAsJSON.height;
        this.cells = []
        this.clues = []
        this.currentHighlightedCell = null;
        this.currentHighlightedClue = null;
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
        const cell = this.currentHighlightedCell;
        const clue = this.currentHighlightedClue;
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
                let cellDiv = document.getElementById(`cellDiv-${cell.index}`);
                let clueSpan = document.getElementById(`cluespan-${cell.index}`);
                cellDiv.classList.remove('highlighted-cell');
                clueSpan.classList.remove('highlighted-cell');
                this.currentHighlightedCell = clue.cellList[cellListIndex + 1];
                const i = this.currentHighlightedCell.index;
                cellDiv = document.getElementById(`cellDiv-${i}`);
                clueSpan = document.getElementById(`cluespan-${i}`);
                cellDiv.classList.add('highlighted-cell');
                clueSpan.classList.add('highlighted-cell');
            }
        }

        // Handle BACKSPACE being pressed
        if (event.keyCode === 8) {
            const hasValue = cell.value != '' && cell.value != OPEN;
            if (hasValue) {
                // The cell should be cleared, and the index moved back.
                const index = this.currentHighlightedCell.index;
                const cellDiv = document.getElementById(`cellDiv-${index}`);
                cellDiv.innerHTML = '';
                const clueSpan = document.getElementById(`cluespan-${index}`);
                clueSpan.innerText = '_';
                if (cellListIndex > 0) {
                    let cellDiv = document.getElementById(`cellDiv-${cell.index}`);
                    let clueSpan = document.getElementById(`cluespan-${cell.index}`);
                    cellDiv.classList.remove('highlighted-cell');
                    clueSpan.classList.remove('highlighted-cell');
                    this.currentHighlightedCell = clue.cellList[cellListIndex - 1];
                    const i = this.currentHighlightedCell.index;
                    cellDiv = document.getElementById(`cellDiv-${i}`);
                    clueSpan = document.getElementById(`cluespan-${i}`);
                    cellDiv.classList.add('highlighted-cell');
                    clueSpan.classList.add('highlighted-cell');
                }
            } else {
                // The index should be moved back, and then that cell cleared.
                if (cellListIndex > 0) {
                    let cellDiv = document.getElementById(`cellDiv-${cell.index}`);
                    let clueSpan = document.getElementById(`cluespan-${cell.index}`);
                    cellDiv.classList.remove('highlighted-cell');
                    clueSpan.classList.remove('highlighted-cell');
                    this.currentHighlightedCell = clue.cellList[cellListIndex - 1];
                    const i = this.currentHighlightedCell.index;
                    cellDiv = document.getElementById(`cellDiv-${i}`);
                    clueSpan = document.getElementById(`cluespan-${i}`);
                    cellDiv.classList.add('highlighted-cell');
                    clueSpan.classList.add('highlighted-cell');
                }
                const index = this.currentHighlightedCell.index;
                const cellDiv = document.getElementById(`cellDiv-${index}`);
                cellDiv.innerHTML = '';
                const clueSpan = document.getElementById(`cluespan-${index}`);
                clueSpan.innerText = '_';
                this.currentHighlightedCell.value = OPEN;
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

export const getCellIndex = (cell, grid) => {
    return cell.col + cell.row * grid.width;
}