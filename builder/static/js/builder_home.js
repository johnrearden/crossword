import { OPEN, CLOSED } from './crossword_grid.js';
import { getCookie } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {

    const puzzles = document.getElementById('id_puzzle').text;
    const list = JSON.parse(puzzles);
    renderThumbnails(list);
});

document.getElementById('new-puzzle-form').addEventListener('submit', (event) => {

    // Handle submission in this function
    event.preventDefault();


    // Create a generic cellString with a uniform crosshatched pattern
    const rows = document.getElementById('row-count').value;
    const cols = document.getElementById('col-count').value;
    const type = document.getElementById('puzzle-type').value;
    const array = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (r % 2 === 0) {
                array.push('#');
            } else {
                const symbol = c % 2 === 0 ? '#' : '-';
                array.push(symbol);
            }
        }
    }
    const cellString = array.join('');

    // Post the new puzzle data to the backend, and then redirect the user
    // to the puzzle editor using the new puzzle id returned in the response.
    const url = "create_new_puzzle/";
    const payload = JSON.stringify({
        'width': cols,
        'height': rows,
        'cells': cellString,
        'puzzle_type': type,
    });
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
            window.location = `puzzle_editor/${json.new_puzzle_id}`;
        });
});


const renderThumbnails = (list) => {
    const puzzleList = list;
    for (let item of puzzleList) {

        // Create the grid thumbnail
        const container = createThumbnail(item.json_puzzle, item.json_clues);
        container.classList.add('mt-2');
        container.addEventListener('click', (e) => {
            redirectToPuzzleEditor(item.json_puzzle.id);
        });
        const thumbnailHolder = document.getElementById(`thumbnail_${item.json_puzzle.id}`)
        thumbnailHolder.appendChild(container);

        // Add button event listeners
        const id = item.json_puzzle.id;
        document.getElementById(`delete-button-${id}`).addEventListener('click', (e) => {
            deletePuzzle(id);
        });
        document.getElementById(`reviewed-button-${id}`).addEventListener('click', (e) => {
            markPuzzleReviewed(id);
        });
        document.getElementById(`released-button-${id}`).addEventListener('click', (e) => {
            markPuzzleReleased(id);
        });
    }
}

const redirectToPuzzleEditor = (puzzleId) => {
    window.location = `puzzle_editor/${puzzleId}`;
}

const createThumbnail = (puzzle, clues) => {

    const grid = puzzle.grid;

    // Create the container for the thumbnail
    const container = document.createElement('div');
    container.classList.add('puzzle-grid-thumbnail');
    container.style.setProperty('--char-size', '16px');
    container.style.setProperty("grid-template-rows", `repeat(${grid.height}, var(--char-size))`);
    container.style.setProperty("grid-template-columns", `repeat(${grid.width}, var(--char-size))`);

    for (let i = 0; i < grid.cells.length; i++) {
        const cellDiv = document.createElement('div');
        const cellValueSpan = document.createElement('span');
        cellValueSpan.id = `cellvaluespan-${i}`;
        cellDiv.classList.add('cell-div');
        cellDiv.classList.add(grid.cells[i] === OPEN ? 'open' : 'blank');
        cellValueSpan.classList.add('cell-value-span');
        cellDiv.appendChild(cellValueSpan);
        container.appendChild(cellDiv);
    }

    for (let clue of clues) {
        const startRow = parseInt(clue.start_row);
        const startCol = parseInt(clue.start_col);
        const width = parseInt(grid.width);
        const startIndex = startCol + startRow * width;
        for (let i = 0; i < clue.solution.length; i++) {
            let letterIndex;
            if (clue.orientation === "AC") {
                letterIndex = startIndex + i;
            } else {
                letterIndex = startIndex + i * grid.width;
            }
            const cell = container.children[letterIndex].children[0];
            cell.innerText = clue.solution[i] === OPEN ? ' ' : clue.solution[i];
        }
    }

    return container;
}

const deletePuzzle = (id) => {
    if (!window.confirm(`Are you sure you want to delete #${id}`)) {
        return;
    }
    const payload = JSON.stringify({
        'puzzle_id': id,
    });
    const url = '/api_backend/builder/delete_puzzle/';
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
            console.log(json);
            location.reload();
            return false;
        });
}

const markPuzzleReleased = (id) => {
    const url = '/api_backend/builder/mark_puzzle_released/';
    const data = JSON.stringify({ 'id': id });
    const payload = {
        method: 'POST',
        body: data,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        }
    }
    try {
        fetch(url, payload)
            .then(response => {
                if (!response.ok) {
                    window.alert('Can\'t mark as release, the puzzle is not reviewed!');
                } else {
                    location.reload();
                }
            });
    } catch (err) {
        window.alert('Network error - please retry');
    }
}

const markPuzzleReviewed = (id) => {
    const url = '/api_backend/builder/mark_puzzle_reviewed/';
    const data = JSON.stringify({ 'id': id });
    const payload = {
        method: 'POST',
        body: data,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        }
    }
    try {
        fetch(url, payload)
            .then(response => {
                if (!response.ok) {
                    window.alert('Can\'t mark as reviewed, the puzzle is not complete!');
                } else {
                    location.reload();
                }
            });
    } catch (err) {
        window.alert('Network error - please retry');
    }
    
}
