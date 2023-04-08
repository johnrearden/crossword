import { Grid, Clue, Cell } from './crossword_grid.js';
import { OPEN, CLOSED } from './crossword_grid.js';
import { getCellIndex } from './crossword_grid.js';

let grid;

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

    document.getElementById('layout-editor-checkbox').addEventListener('change', (event) => {
        unSelectCurrentClue(event);
    });

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
            const clickedCellIndex = event.target.id.split('-')[1];
            const clickedCell = cells[clickedCellIndex];
            if (isEditingLayout()) {
                event.target.classList.toggle('open');
                event.target.classList.toggle('blank');
                const cellIndex = event.target.id.split('-')[1];
                cells[cellIndex].value = cells[cellIndex].value === OPEN ? CLOSED : OPEN;
                grid.reindex();
            } else if (clickedCell.value !== CLOSED) {
                // Remove highlighting from previous cell and clue.
                if (grid.currentHighlightedClue) {
                    const cells = getClueCells(grid.currentHighlightedClue, grid);
                    for (let cell of cells) {
                        const index = getCellIndex(cell, grid);
                        const cellDiv = document.getElementById(`cellDiv-${index}`);
                        cellDiv.classList.remove('highlighted-cell', 'highlighted-clue');
                    }
                }

                // Highlight the current cell and clue. Toggle the down and across clues if both
                // exist.
                let currentClue = null;
                if (grid.currentHighlightedCell == clickedCell && grid.currentHighlightedClue) {
                    if (grid.currentHighlightedClue.orientation === 'AC' && clickedCell.clueDown) {
                        currentClue = clickedCell.clueDown;
                    } else if (grid.currentHighlightedClue.orientation === 'DN' && clickedCell.clueAcross) {
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
                grid.currentHighlightedClue = currentClue;
                grid.currentHighlightedCell = clickedCell;

                // Render the current highlighted clue in the clue query box.
                const clueDiv = document.getElementById('current-clue-div');
                const newSpans = [];
                for (let cell of cellsToHighlight) {
                    const span = document.createElement('span');
                    span.id = `cluespan-${cell.index}`;
                    span.classList.add('highlighted-clue', 'clue-character');
                    if (cell == grid.currentHighlightedCell) {
                        span.classList.add('highlighted-cell');
                    }
                    span.innerText = cell.value === OPEN ? '_' : cell.value;
                    newSpans.push(span);
                }

                clueDiv.replaceChildren(...newSpans);
            }
        });
        gridDiv.appendChild(cellDiv);
    }
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

// Remove selection highlighting from the current clue
const unSelectCurrentClue = (event) => {
    for (let cell of grid.currentHighlightedClue.cellList) {
        let cellDiv = document.getElementById(`cellDiv-${cell.index}`);
        let clueSpan = document.getElementById(`cluespan-${cell.index}`);
        cellDiv.classList.remove('highlighted-cell', 'highlighted-clue');
        clueSpan.classList.remove('highlighted-cell', 'highlighted-clue');
    }
}







