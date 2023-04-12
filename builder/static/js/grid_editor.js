import { Grid } from './crossword_grid.js';
import { OPEN, CLOSED } from './crossword_grid.js';
import { getCellIndex } from './crossword_grid.js';

let grid;
let throttled = false;
let keyboardDisplayed = false;

document.addEventListener('DOMContentLoaded', () => {
    fetch('/builder/get_recent_puzzles/').then((res => console.log(res)));
    const url = '/builder/get_grid/';
    fetch(url).then(response => response.json())
        .then(json => {
            grid = new Grid(json);
            drawGrid(grid);
            populateVirtualKeyboard();
        });
});

const drawGrid = (grid) => {
    const width = grid.width;
    const height = grid.height;
    const cells = grid.cells;

    const gridDiv = document.getElementById('grid-editor-div');
    gridDiv.style.setProperty('--grid-rows', height);
    gridDiv.style.setProperty('--grid-cols', width);

    setCrosswordCellWidth(grid);

    document.addEventListener('keyup', (event) => {
        console.log(`keyEvent : key == ${event.key}`);
        if (document.activeElement === document.getElementById('def-input')) {
            if (event.key === 'Enter') {
                console.log('submit called on clue-form');
                const modalDiv = document.getElementById('clue-editor-modal');
                const modal = bootstrap.Modal.getInstance(modalDiv);
                modal.hide();
            }
            return;
        }
        grid.onKeyup(event.keyCode);
    })

    document.getElementById('save-button').addEventListener('click', (event) => {
        const list = [];
        for (let clue of grid.clues) {
            list.push(clue.convertToObject());
        }
        const gridString = grid.getGridObject();
        const payload = JSON.stringify({
            'puzzle_id': null,
            'clues': list,
            'grid': gridString,
        });
        const url = '/builder/save_puzzle/';
        const options = {
            method: 'POST',
            body: payload,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            }
        }
        fetch(url, options).then(response => console.log(response));
    });

    document.getElementById('layout-editor-checkbox').addEventListener('change', (event) => {
        unSelectCurrentClue(event);
        grid.currentHighlightedCell = null;
        grid.currentHighlightedClue = null;

        const currentItemHolder = document.getElementById("current-item-holder");

        if (!event.target.checked) {
            clearExistingClueNumbers();
            grid.reindex();
            rerenderClueNumbers();
            currentItemHolder.classList.remove('d-none');
        } else {
            currentItemHolder.classList.add('d-none');
        }
    });

    const clueEditorButton = document.getElementById('clue-editor-button');
    clueEditorButton.addEventListener('click', (event) => {
        const word = getWordFromClueDiv();
        getDefinition(word);
    });

    document.getElementById('def-input').addEventListener('input', (event) => {
        if (grid.currentHighlightedClue) {
            grid.currentHighlightedClue.clue = event.target.value;
            displayClue(grid.currentHighlightedClue.clue);
        }

    });

    document.getElementById('word-lengths-input').addEventListener('input', (e) => {
        if (grid.currentHighlightedClue) {
            grid.currentHighlightedClue.word_lengths = e.target.value;
        }
    });

    document.getElementById('matches-button').addEventListener('click', (event) => {

        // Show the word matches modal
        const queryString = getWordFromClueDiv();
        const url = `/builder/query/${queryString}`;
        const matchesDiv = document.getElementById('matches-div');
        matchesDiv.textContent = '';
        fetch(url).then(response => response.json())
            .then(json => {
                const results = json.results;
                const count = results.length;
                document.getElementById('matches-modal-title').innerText = `Matches (${count})`;
                for (let item of results) {
                    const span = document.createElement('span');
                    span.classList.add('match-word');
                    span.innerText = item;
                    span.addEventListener('click', (event) => {
                        replaceCurrentClue(item);
                        const modalDiv = document.getElementById('matches-modal');
                        const modal = bootstrap.Modal.getInstance(modalDiv);
                        modal.hide();
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

            if (isEditingLayout()) {
                event.target.classList.toggle('open');
                event.target.classList.toggle('blank');
                const cellIndex = event.target.id.split('-')[1];
                cells[cellIndex].value = cells[cellIndex].value === CLOSED ? OPEN : CLOSED;

                console.log(`cell at ${cellIndex} is now ${cells[cellIndex].value}`);

                // Reindex the grid, clearing the clue numbers beforehand, and rendering the new ones
                // afterwards
                clearExistingClueNumbers();
                grid.reindex();
                rerenderClueNumbers();

            } else if (clickedCell.value !== CLOSED) {
                // Remove highlighting from previous cell and clue. Clear the definition and 
                // word length inputs
                document.getElementById('def-input').value = '';
                document.getElementById('word-lengths-input').value = '';
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

                // Replace the contents of the definition and word lengths inputs, and display the current clue
                document.getElementById('def-input').value = grid.currentHighlightedClue.clue;
                document.getElementById('word-lengths-input').value = grid.currentHighlightedClue.word_lengths;
                displayClue(grid.currentHighlightedClue.clue);
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
            if (results.length === 0) {
                const p = document.createElement('p');
                p.innerText = `Sorry, no definitions found for ${word}`;
                definitionDiv.appendChild(p);
            } else {
                for (let item of results) {
                    const p = document.createElement('p');
                    p.innerText = item;
                    definitionDiv.appendChild(p);
                }
            }
        });
}

const displayClue = (clue) => {
    const clueDisplay = document.getElementById('clue-display');
    clueDisplay.innerText = clue;
}

/**
 * Builds a string from the contents of the current clue div.
 * 
 * @returns A string representation of the letters currently in the current-clue-div
 */
const getWordFromClueDiv = () => {
    const clueDiv = document.getElementById('current-clue-div');
    const query = [];
    for (let child of clueDiv.children) {
        query.push(child.innerText);
    }
    const result = query.join('');
    return result || '';
}


/**
 * Retrieves the document crsf cookie and returns it.
 * @param {String} name 
 * @returns the cookie value.
 */
const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
};

// Recalculate the cell size if the window is resized. Throttle to prevent
// janky over-adjusting.
window.addEventListener('resize', (event) => {
    if (!throttled) {
        setCrosswordCellWidth(grid);
        throttled = true;
        setTimeout(() => {
            throttled = false;
        }, 100);
    }

});

const setCrosswordCellWidth = (grid) => {
    // Calculate size of a cell based on window width and grid width in cells
    const windowWidth = document.documentElement.clientWidth;
    let cellWidth;
    if (grid.width <= 9) {
        cellWidth = Math.floor(Math.min(windowWidth / 10, 40));
    } else {
        cellWidth = Math.floor(Math.min(windowWidth / (grid.width + 1), 40));
    }
    const gridDiv = document.getElementById('grid-editor-div');
    gridDiv.style.setProperty('--char-size', `${cellWidth}px`);
}

const populateVirtualKeyboard = () => {
    const keyboardDiv = document.getElementById('virtual-keyboard');
    const topRow = document.getElementById('vk-top-row');
    const middleRow = document.getElementById('vk-middle-row');
    const bottomRow = document.getElementById('vk-bottom-row');

    for (let char of ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']) {
        const span = document.createElement('span');
        span.innerText = char;
        span.classList.add('virtual-key', 'text-center');
        const charCode = char === '\u21B5' ? 8 : char.charCodeAt(0);
        span.addEventListener('click', () => grid.onKeyup(charCode));
        topRow.appendChild(span);
    }
    for (let char of ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']) {
        const span = document.createElement('span');
        span.innerText = char;
        span.classList.add('virtual-key', 'text-center');
        const charCode = char === '\u21B5' ? 8 : char.charCodeAt(0);
        span.addEventListener('click', () => grid.onKeyup(charCode));
        middleRow.appendChild(span);
    }
    for (let char of ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '\u21B5']) {
        const span = document.createElement('span');
        span.innerText = char;
        span.classList.add('virtual-key', 'text-center');
        const charCode = char === '\u21B5' ? 8 : char.charCodeAt(0);
        span.addEventListener('click', () => grid.onKeyup(charCode));
        bottomRow.appendChild(span);
    }
}



