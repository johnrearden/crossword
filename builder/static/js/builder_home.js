import { OPEN, CLOSED } from './crossword_grid.js';

document.addEventListener('DOMContentLoaded', () => {
    const url = '/builder/get_recent_puzzles/10/';
    fetch(url).then(response => response.json())
        .then(json => renderThumbnails(json))
});

document.getElementById('new-puzzle-form').addEventListener('submit', (event) => {

    // Handle submission in this function
    event.preventDefault();


    // Create a generic cellString with a uniform crosshatched pattern
    const rows = document.getElementById('row-count').value;
    const cols = document.getElementById('col-count').value;
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
    const url = "/builder/create_new_puzzle/";
    const payload = JSON.stringify({
        'width': cols,
        'height': rows,
        'cells': cellString,
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
            window.location = `/builder/puzzle_editor/${json.new_puzzle_id}`;
        });
});


const renderThumbnails = (json) => {
    const puzzleList = json.puzzles;
    const thumbnailHolder = document.getElementById('thumbnail-holder');
    const hr = document.createElement('hr');
    for (let item of puzzleList) {
        const title = document.createElement('h6');
        const lastEditedTitle = document.createElement('h6');
        const createdDate = new Date(item.puzzle.created_on);
        let dayName = new Intl.DateTimeFormat("en-UK", { weekday: "short" }).format(createdDate);
        const createdDateString = dayName + " " + createdDate.toLocaleString();
        const lastEditDate = new Date(item.puzzle.last_edited);
        dayName = new Intl.DateTimeFormat("en-UK", { weekday: "short" }).format(lastEditDate);
        const lastEditDateString = dayName + " " + lastEditDate.toLocaleString();
        title.innerText = `Created by ${item.puzzle.creator} on ${createdDateString}`;
        lastEditedTitle.innerText = `Last edited on ${lastEditDateString}`;
        thumbnailHolder.appendChild(title);
        thumbnailHolder.appendChild(lastEditedTitle);
        const container = createThumbnail(item.puzzle, item.clues);
        container.addEventListener('click', (e) => {
            redirectToPuzzleEditor(item.puzzle.id);
        });
        
        thumbnailHolder.appendChild(container);
    }
}

const redirectToPuzzleEditor = (puzzleId) => {
    window.location = `/builder/puzzle_editor/${puzzleId}`;
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