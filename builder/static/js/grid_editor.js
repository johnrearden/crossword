let grid;
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
            event.target.classList.toggle('open');
            event.target.classList.toggle('blank');
            const cellIndex = event.target.id.split('-')[1];
            cells[cellIndex].value = cells[cellIndex].value === OPEN ? CLOSED : OPEN;
            grid.reindex();
        });
        gridDiv.appendChild(cellDiv);
    }
}

class Clue {
    constructor(startRow, startCol, orientation) {
        this.clue = '';
        this.solution = '';
        this.word_lengths = '';
        this.orientation = orientation;
        this.startRow = startRow;
        this.startCol = startCol;
        this.number = 0;
        this.len = 1;
    }
}

class Cell {
    constructor(row, col, value) {
        this.row = row;
        this.col = col;
        this.value = value;
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
                gridAsJSON.cells[i]);
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

            /* console.log(
                `cell(${i}) : left(${hasLeft}),top(${hasTop}),right(${hasRight}),bottom(${hasBottom})`
            ); */

            // If cell has no left neighbour, but has a right neighbour, 
            // it starts an AC clue. Create an AC clue, and place a reference
            // to it in this cell.
            if (!hasLeft && hasRight) {
                const clue = new Clue(
                    Math.floor(i / this.width),
                    i % this.width,
                    'AC'
                );
                this.clues.push(clue);
                this.cells[i].clueAcross = clue;
            }

            // If cell has a left neighbour, it shares the same clue reference.
            // Increment this clue's length value, len.
            if (hasLeft) {
                const sharedClue = this.cells[i - 1].clueAcross;
                sharedClue.len += 1;
                this.cells[i].clueAcross = sharedClue;
                
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
                this.clues.push(clue);
                this.cells[i].clueDown = clue;
            }

            // if cell has a top neighbour, it shares the same clue reference
            // Increment this clue's length value, len.
            if (hasTop) {
                const sharedClue = this.cells[i - this.width].clueDown;
                sharedClue.len += 1;
                this.cells[i].clueDown = sharedClue;
            }
        }
        console.log('---- Clues ----');
        console.log();
        for (let clue of this.clues) {
            console.log(clue);
        }
        /* console.log();
        console.log('---- Cells ----');
        console.log();
        for (let cell of this.cells) {
            console.log(cell);
        } */
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



