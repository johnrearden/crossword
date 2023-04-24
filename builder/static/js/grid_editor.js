import { Grid } from './crossword_grid.js';
import { OPEN, START, MIDDLE, END, NONE } from './crossword_grid.js';
import { getCellIndex } from './crossword_grid.js';


// Global state
let grid;
let puzzleID;
let throttled = false;


// Create the grid object and render it on page load.
document.addEventListener('DOMContentLoaded', () => {
    const data = JSON.parse(document.getElementById('data').textContent);
    grid = new Grid(data.puzzle.grid, data.clues);
    puzzleID = data.puzzle.id;
    drawGrid(grid);
    renderSolutions(data.clues);
    renderClues(grid.clues);
    populateVirtualKeyboard();
});

/**
 * Renders the list of solutions from the backend onto the puzzle, and places the letter 
 * values in the appropriate cells. The clue attribute is not set here - it is set in 
 * the Grid object constructor.
 * 
 * @param {Array:Clue} clues 
 */
const renderSolutions = (clues) => {
    for (let clue of clues) {
        for (let i = 0; i < clue.solution.length; i++) {
            const xCoor = clue.orientation === 'AC' ? clue.start_col + i : clue.start_col;
            const yCoor = clue.orientation === 'AC' ? clue.start_row : clue.start_row + i;
            const index = xCoor + yCoor * grid.width;
            const span = document.getElementById(`cellvaluespan-${index}`);
            const character = clue.solution[i];
            span.innerText = character === OPEN ? '' : character;
            grid.cells[index].value = character === OPEN ? OPEN : character;
        }
    }
}

/**
 * Renders the clue strings on the page, below the main crossword puzzle display.
 * 
 * @param {Array:Clue} clues 
 */
const renderClues = (clues) => {
    const acrossDiv = document.getElementById('clues-across-list');
    const downDiv = document.getElementById('clues-down-list');
    acrossDiv.innerText = '';
    downDiv.innerText = '';

    for (let item of clues) {
        // Create a string representing the solution
        const array = []
        for (let cell of item.cellList) {
            array.push(cell.value);
        }
        const solutionString = array.join('');
        const para = document.createElement('p');
        const text = item.clue ? `${solutionString.toUpperCase()} - ${item.clue}` : '...';
        para.innerText = `${item.number}: ${text}`;
        para.id = `cluepara-${item.number}-${item.orientation}`;
        if (!item.clue) {
            para.classList.add('text-muted');
        }
        if (item.orientation === 'AC') {
            acrossDiv.appendChild(para);
        } else {
            downDiv.appendChild(para);
        }
    }
}

/**
 * This function performs a number of tasks.
 *      - It sets the row and column attributes of the css grid layout for the puzzle grid.
 *      - It calls the addEventListeners function, keeping the HTML free of event handling.
 *      - It creates the cell divs which display each cell of the puzzle, and adds 
 *        a click listener to each, which selects the cell and the clue of which it is a part.
 * 
 * @param {Grid} grid 
 */
const drawGrid = (grid) => {
    const width = grid.width;
    const height = grid.height;
    const cells = grid.cells;

    const gridDiv = document.getElementById('grid-editor-div');
    gridDiv.style.setProperty('--grid-rows', height);
    gridDiv.style.setProperty('--grid-cols', width);

    setCrosswordCellWidth(grid);
    addEventListeners();

    // Iterate through the grid, and create a div and 2 spans for each cell, with
    // the appropriate css classes. The first span holds any letter entered in the cell, and
    // the second holds any potential clue number, in superscript.
    for (let i = 0; i < cells.length; i++) {
        const cellDiv = document.createElement('div');
        const cellValueSpan = document.createElement('span');
        cellDiv.id = `cellDiv-${i}`;
        cellDiv.classList.add('cell-div');
        cellValueSpan.id = `cellvaluespan-${i}`;
        cellDiv.classList.add(cells[i].isOpen ? 'open' : 'blank');
        cellValueSpan.classList.add('cell-value-span');
        cellDiv.appendChild(cellValueSpan);

        // Add a span to contain a clue number; most will be empty
        const span = document.createElement('span');
        span.classList.add('numbered');
        span.id = `numberspan-${i}`;
        cellDiv.appendChild(span);

        // Add a click listener to each cell to handle cell and clue selection
        cellDiv.addEventListener('click', (event) => {

            // Show the keyboard, in case it has been hidden.
            showKeyboard();

            const clickedCellIndex = event.target.id.split('-')[1];
            const clickedCell = cells[clickedCellIndex];

            if (isEditingLayout()) {
                // The user is editing the layout - toggling cells open and closed.
                const cellIndex = event.target.id.split('-')[1];
                const cell = cells[cellIndex];

                if (cell.isOpen) {
                    // Close the cell, delete its contents
                    const div = document.getElementById(`cellDiv-${cellIndex}`);
                    div.classList.remove('open');
                    div.classList.add('blank');
                    cell.value = '';
                    const span = document.getElementById(`cellvaluespan-${cellIndex}`);
                    span.innerText = '';
                    cell.isOpen = false;
                } else {
                    // Open the cell
                    const div = document.getElementById(`cellDiv-${cellIndex}`);
                    div.classList.remove('blank');
                    div.classList.add('open');
                    cell.isOpen = true;
                }

                // Reindex the grid, clearing the clue numbers beforehand, and rendering the new ones
                // afterwards ... at least one of the clues has changed. Also rerender the clues in 
                // the clue list.
                clearExistingClueNumbers();
                grid.reindex();
                rerenderClueNumbers();
                renderClues(grid.clues);

            } else if (clickedCell.isOpen) {
                // The user is editing the content of the cell. Remove highlighting from previous 
                // cell and clue. Clear the definition and word length inputs
                document.getElementById('def-input').value = '';
                document.getElementById('word-lengths-input').value = '';

                if (grid.currentHighlightedClue) {
                    // If there is a clue currently highlighted, remove the highlighting from it.
                    const cells = getClueCells(grid.currentHighlightedClue, grid);
                    for (let cell of cells) {
                        const index = getCellIndex(cell, grid);
                        const cellDiv = document.getElementById(`cellDiv-${index}`);
                        cellDiv.classList.remove('highlighted-cell', 'highlighted-clue');
                    }
                }

                // Highlight the new cell and clue.
                let currentClue = null;
                if (grid.currentHighlightedCell == clickedCell && grid.currentHighlightedClue) {

                    // Switch to opposite orientation if both exist.
                    if (grid.currentHighlightedClue.orientation === 'AC' && clickedCell.clueDown) {
                        currentClue = clickedCell.clueDown;
                    } else if (grid.currentHighlightedClue.orientation === 'DN' && clickedCell.clueAcross) {
                        currentClue = clickedCell.clueAcross;
                    } else {
                        // Otherwise, choose whichever clue exists.
                        currentClue = clickedCell.clueAcross || clickedCell.clueDown;
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

                // Give the particular cell clicked a lighter emphasized highlighting.
                const cellDiv = document.getElementById(`cellDiv-${clickedCellIndex}`);
                cellDiv.classList.add('highlighted-cell');
                grid.currentHighlightedClue = currentClue;
                grid.currentHighlightedCell = clickedCell;

                // Replace the contents of the definition and word lengths inputs, and display the current clue
                document.getElementById('def-input').value = grid.currentHighlightedClue.clue;
                document.getElementById('word-lengths-input').value = grid.currentHighlightedClue.word_lengths;
                displayClue(grid.currentHighlightedClue.clue);
            }
        });

        // Finally, add this cell div to the gridDiv.
        gridDiv.appendChild(cellDiv);
    }

    rerenderClueNumbers();
}

/**
 * Removes the cell numbers from each cell.
 */
const clearExistingClueNumbers = () => {
    // Iterate through the clues, and delete any numbers in their starting cells
    for (let clue of grid.clues) {
        const cell = clue.cellList[0];
        const numberSpan = document.getElementById(`numberspan-${cell.index}`);
        numberSpan.innerText = '';
    }
}

/**
 * Renders the clue numbers in the appropriate cell (inside a numberspan element)
 */
const rerenderClueNumbers = () => {
    // Iterate through the clues, and render their number in their
    // starting cells.
    for (let clue of grid.clues) {
        const cell = clue.cellList[0];
        const numberSpan = document.getElementById(`numberspan-${cell.index}`);
        numberSpan.innerText = clue.number;
    }
}

/**
 * Takes a clue and a grid as parameters, and calculates the indices of the cells
 * that belong to the clue, depending on whether the clue orientation is across or
 * down. It then collects these cells and returns them in a list.
 * 
 * @param {Clue} clue 
 * @param {Grid} grid 
 * @returns a list of the cells that belong to the clue supplied
 */
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

/**
 * Check if the user has selected the layout editor checkbox on the page
 * 
 * @returns a boolean representing the checked state of the checkbox element
*/
const isEditingLayout = () => {
    const checkbox = document.getElementById('layout-editor-checkbox');
    return checkbox.checked;
}

/**
 * Remove selection highlighting from the current clue
 * 
 * @param {Event} event not used
 */
const unSelectCurrentClue = (event) => {
    if (!grid.currentHighlightedClue) {
        return;
    }
    for (let cell of grid.currentHighlightedClue.cellList) {
        let cellDiv = document.getElementById(`cellDiv-${cell.index}`);
        cellDiv.classList.remove('highlighted-cell', 'highlighted-clue');
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

const displayClueInClueList = (item) => {
    const para = document.getElementById(`cluepara-${item.number}-${item.orientation}`);
    const text = item.clue ? item.clue : 'No clue yet.';
    para.innerText = `${item.number}: ${text}`;
}

/**
 * Builds a string from the contents of the current clue (property of the grid object).
 * 
 * @returns A string representation of the letters currently in the current-clue-div
 */
const getWordFromCurrentClue = () => {
    const clue = grid.currentHighlightedClue;
    const query = [];
    for (let c of clue.cellList) {
        const char = c.value === '' || c.value === OPEN ? '_' : c.value;
        query.push(char);
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
    const topRow = document.getElementById('vk-top-row');
    const middleRow = document.getElementById('vk-middle-row');
    const bottomRow = document.getElementById('vk-bottom-row');

    for (let char of ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']) {
        const span = document.createElement('span');
        span.innerText = char;
        span.classList.add('virtual-key');
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

const addEventListeners = () => {
    document.addEventListener('keyup', (event) => {
        if (document.activeElement === document.getElementById('def-input')) {
            if (event.key === 'Enter') {
                const modalDiv = document.getElementById('clue-editor-modal');
                const modal = bootstrap.Modal.getInstance(modalDiv);
                modal.hide();
            }
            return;
        }
        grid.onKeyup(event.keyCode);
    });

    document.getElementById('clear-clue-button').addEventListener('click', (e) => {

        const thisClue = grid.currentHighlightedClue;
        if (!thisClue) {
            return;
        }

        // Remove all characters from the current selected clue, except those in
        // use by intersecting clues.
        for (let cell of thisClue.cellList) {

            // Check if cell is in use by an intersecting (and complete) solution. If so, 
            // don't erase it.
            if (cell.clueAcross && cell.clueDown) {
                const intersector = thisClue.orientation === "AC" ? cell.clueDown : cell.clueAcross;
                let allCellsFilled = true;

                for (let c of intersector.cellList) {
                    if (c.value === '' || c.value === OPEN) {
                        allCellsFilled = false;
                    }
                }
                if (allCellsFilled) {
                    continue;
                }
            }

            // Remove each cell's value
            cell.value = '';

            // Clear the main crossword cell span
            const cellValueSpan = document.getElementById(`cellvaluespan-${cell.index}`);
            cellValueSpan.innerText = '';
        }
    });

    document.getElementById('matches-button').addEventListener('click', (event) => {

        // Show the word matches modal
        const queryString = getWordFromCurrentClue();
        const url = `/builder/query/${queryString}`;
        const matchesDiv = document.getElementById('matches-div');
        matchesDiv.textContent = '';
        fetch(url).then(response => response.json())
            .then(json => {
                const results = json.results.slice(0, 100);
                const count = results.length;
                document.getElementById('matches-modal-title').innerText = `Matches (${count})`;
                const clue = grid.currentHighlightedClue;
                for (let item of results) {
                    const array = []
                    const span = document.createElement('span');
                    for (let i = 0; i < item.length; i++) {
                        const char = item[i];
                        if (clue.orthogs[i] === START) {
                            array.push(`<span class="text-start match-letter">${char}</span>`);
                        } else if (clue.orthogs[i] === MIDDLE) {
                            array.push(`<span class="text-middle match-letter">${char}</span>`);
                        } else if (clue.orthogs[i] === END) {
                            array.push(`<span class="text-end match-letter">${char}</span>`);
                        } else {
                            array.push(char);
                        }
                    }
                    span.classList.add('match-word');
                    span.innerHTML = array.join('');
                    
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

    document.getElementById('save-button').addEventListener('click', (event) => {
        const list = [];
        for (let clue of grid.clues) {
            list.push(clue.convertToObject());
        }
        const gridString = grid.getGridObject();
        const payload = JSON.stringify({
            'puzzle_id': puzzleID,
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
        fetch(url, options)
            .then(response => response.json())
            .then(json => {
                alert('Crossword saved successfully');
                puzzleID = json.puzzle_id;
            });
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
        hideKeyboard();
        const word = getWordFromCurrentClue();
        getDefinition(word);
    });

    document.getElementById('def-input').addEventListener('input', (event) => {
        if (grid.currentHighlightedClue) {
            grid.currentHighlightedClue.clue = event.target.value;
            displayClue(grid.currentHighlightedClue.clue);
            displayClueInClueList(grid.currentHighlightedClue);
        }

    });

    document.getElementById('word-lengths-input').addEventListener('input', (e) => {
        if (grid.currentHighlightedClue) {
            grid.currentHighlightedClue.word_lengths = e.target.value;
        }
    });

    document.getElementById('keyboard-closer').addEventListener('click', (e) => {
        hideKeyboard();
    })
}

const hideKeyboard = () => {
    const keyboard = document.getElementById('virtual-keyboard');
    keyboard.classList.add('d-none');
}

const showKeyboard = () => {
    const keyboard = document.getElementById('virtual-keyboard');
    keyboard.classList.remove('d-none');
}



