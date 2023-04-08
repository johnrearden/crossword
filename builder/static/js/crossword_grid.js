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

        // Calculate numbers for each clue, considering AC and DN separately.
        // However, an AC and a DN clue can start in the same cell, and should
        // then use the same number. Numbers cannot be duplicated in either the
        // set of AC clues or the set of DN clues.

        class Loc {
            constructor(row, col) {
                this.row = row;
                this.col = col;
            }
        }

        // Create a map, to hold the clues, keyed by a Loc object representing
        // their starting cells.
        const clueMap = new Map();

        for (let clue of this.clues) {
            const loc = new Loc(clue.startRow, clue.startCol);
            if (clueMap.has(loc)) {
                clueMap.get(loc).push(clue);
            } else {
                clueMap.set(loc, []);
                clueMap.get(loc).push(clue);
            }
        }
        const sortedClueMap = new Map([...clueMap].sort((a, b) => {
            return a.col - b.col || a.row - b.row;
        }));

        // Keep a counter for the next indices of AC and DN clues respectively
        let acrossCounter = 1;
        let downCounter = 1;

        // Keep track of the DN indices already used, so that they are not duplicated
        const unusableDownIndices = [];

        // Iterate through the sorted map.
        for (let loc of sortedClueMap.keys()) {
            const clueList = sortedClueMap.get(loc);
            if (clueList.length > 1) {
                // An AC and a DN clue share a starting cell - they get the same number
                for (let clue of clueList) {
                    if (clue.orientation === 'AC') {
                        clue.number = acrossCounter;
                    } else {
                        clue.number = acrossCounter;
                        unusableDownIndices.push(acrossCounter);
                    }
                }
                acrossCounter++;
            } else {
                // This clue has a unique starting cell
                const clue = clueList[0];
                if (clue.orientation === 'AC') {
                    // AC clues cannot have duplicate numbers
                    clue.number = acrossCounter;
                    acrossCounter++;
                } else {
                    // Ensure a DN clue does not reuse a number
                    while (unusableDownIndices.includes(downCounter)) {
                        downCounter++;
                    }
                    clue.number = downCounter;
                    unusableDownIndices.push(downCounter);
                    downCounter++;
                }
            }
        }

        /* for (let clue of this.clues) {
            console.log(`Clue (${clue.startCol},${clue.startRow}) : number == ${clue.number}`);
        } */
    }

    // Handle a keyup event on the document
    onKeyup = (event) => {

        if (document.activeElement === document.getElementById('def-input')) {
            return;
        }
        const cell = this.currentHighlightedCell;
        const clue = this.currentHighlightedClue;
        const cellListIndex = clue.cellList.indexOf(cell);

        // Handle a letter key being released.
        const keyIsLetter = event.keyCode >= 65 && event.keyCode <= 90;
        const keyIsSpace = event.keyCode === 32;
        if (keyIsLetter || keyIsSpace) {
            const character = String.fromCharCode(event.keyCode);
            cell.value = keyIsLetter ? character : OPEN;
            const index = cell.index;
            const cellValueSpan = document.getElementById(`cellvaluespan-${index}`);
            cellValueSpan.innerText = character;
            const clueSpan = document.getElementById(`cluespan-${index}`);
            clueSpan.innerText = keyIsLetter? character : '_';

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
                const cellValueSpan = document.getElementById(`cellvaluespan-${index}`);
                cellValueSpan.innerText = '';
                const clueSpan = document.getElementById(`cluespan-${index}`);
                clueSpan.innerText = '_';
                this.currentHighlightedCell.value = OPEN;
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
                const cellValueSpan = document.getElementById(`cellvaluespan-${index}`);
                cellValueSpan.innerText = '';
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