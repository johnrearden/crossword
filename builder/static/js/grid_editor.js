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
        grid.currentHighlightedCell = null;
        grid.currentHighlightedClue = null;

        if (!event.target.checked) {
            clearExistingClueNumbers();
            grid.reindex();
            rerenderClueNumbers();
        }
    });

    document.getElementById('def-input').addEventListener('input', (event) => {
        grid.currentHighlightedClue.solution = event.target.value;
        const temp = JSON.stringify(grid.currentHighlightedClue);
        console.log(temp);
    });

    document.getElementById('matches-button').addEventListener('click', (event) => {

        // Clear the definition div first.
        const definitionDiv = document.getElementById('definition-div');
        definitionDiv.innerText = '';

        const clueDiv = document.getElementById('current-clue-div');
        const query = [];
        for (let child of clueDiv.children) {
            query.push(child.innerText);
        }
        const queryString = query.join('');
        const url = `/builder/query/${queryString}`;
        const matchesDiv = document.getElementById('matches-div');
        matchesDiv.textContent = '';
        fetch(url).then(response => response.json())
            .then(json => {
                const results = json.results;
                for (let item of results) {
                    const span = document.createElement('span');
                    span.classList.add('match-word');
                    span.innerText = item;
                    span.addEventListener('click', (event) => {
                        replaceCurrentClue(item);
                        getDefinition(item);
                    });
                    matchesDiv.appendChild(span);
                }
            });
    });

    // Iterate through the grid
    for (let i = 0; i < cells.length; i++) {
        const cellDiv = document.createElement('div');
        const cellValueSpan = document.createElement('span');
        cellDiv.id = `cellDiv-${i}`;
        cellDiv.classList.add('cell-div');
        cellValueSpan.id = `cellvaluespan-${i}`;
        cellDiv.classList.add(cells[i].value === OPEN ? 'open' : 'blank');
        cellValueSpan.classList.add('cell-value-span');
        cellDiv.appendChild(cellValueSpan);

        // Add a span to contain a clue number; most will be empty
        const span = document.createElement('span');
        span.classList.add('numbered');
        span.id = `numberspan-${i}`;
        cellDiv.appendChild(span);

        // Add a click listener to each cell
        cellDiv.addEventListener('click', (event) => {
            const clickedCellIndex = event.target.id.split('-')[1];
            const clickedCell = cells[clickedCellIndex];
            console.log(`clickedCell == ${clickedCell.index}`);

            if (isEditingLayout()) {
                event.target.classList.toggle('open');
                event.target.classList.toggle('blank');
                const cellIndex = event.target.id.split('-')[1];
                cells[cellIndex].value = cells[cellIndex].value === OPEN ? CLOSED : OPEN;

                // Reindex the grid, clearing the clue numbers beforehand, and rendering the new ones
                // afterwards
                clearExistingClueNumbers();
                grid.reindex();
                rerenderClueNumbers();

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

    rerenderClueNumbers();
}

const clearExistingClueNumbers = () => {
    // Iterate through the clues, and delete any numbers in their starting cells
    for (let clue of grid.clues) {
        const cell = clue.cellList[0];
        const numberSpan = document.getElementById(`numberspan-${cell.index}`);
        numberSpan.innerText = '';
    }
}


const rerenderClueNumbers = () => {
    // Iterate through the clues, and render their number in their
    // starting cells.
    for (let clue of grid.clues) {
        const cell = clue.cellList[0];
        const numberSpan = document.getElementById(`numberspan-${cell.index}`);
        numberSpan.innerText = clue.number;
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
    if (!grid.currentHighlightedClue) {
        return;
    }
    for (let cell of grid.currentHighlightedClue.cellList) {
        let cellDiv = document.getElementById(`cellDiv-${cell.index}`);
        let clueSpan = document.getElementById(`cluespan-${cell.index}`);
        cellDiv.classList.remove('highlighted-cell', 'highlighted-clue');
        clueSpan.classList.remove('highlighted-cell', 'highlighted-clue');
    }
}

// Replace the contents of the current clue in 3 places - the clue itself,
// the grid and the currently selected clue.
const replaceCurrentClue = (str) => {

    if (!grid.currentHighlightedClue) {
        return;
    }

    for (let i in grid.currentHighlightedClue.cellList) {

        // Change the cells value
        const cell = grid.currentHighlightedClue.cellList[i];
        cell.value = str[i];

        // Change the grid
        const cellValueSpan = document.getElementById(`cellvaluespan-${cell.index}`);
        cellValueSpan.innerText = str[i];

        // Change the currently selected clue div
        const clueSpan = document.getElementById(`cluespan-${cell.index}`);
        clueSpan.innerText = str[i];
    }
}


// Fetch the definition for the clicked word and display it.
const getDefinition = (word) => {
    const url = `/builder/get_definition/${word}/`;
    fetch(url).then(res => res.json())
        .then(json => {
            const results = json.results;
            const definitionDiv = document.getElementById('definition-div');
            definitionDiv.innerText = '';
            for (let item of results) {
                const p = document.createElement('p');
                p.innerText = item;
                definitionDiv.appendChild(p);
            }
        });
}




