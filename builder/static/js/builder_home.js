import { OPEN, CLOSED } from './crossword_grid.js';
import { getCookie } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const url = 'get_recent_puzzles/20/';
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
    const url = "create_new_puzzle/";
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
            window.location = `puzzle_editor/${json.new_puzzle_id}`;
        });
});


const renderThumbnails = (json) => {
    const puzzleList = json.puzzles;
    const thumbnailHolder = document.getElementById('thumbnail-holder');
    for (let item of puzzleList) {

        console.log(item);

        // Create a title each for the created and last_edited fields
        const lastEditedTitle = document.createElement('h6');
        lastEditedTitle.classList.add('text-center');
        const lastEditDate = new Date(item.puzzle.last_edited);
        const dayName = new Intl.DateTimeFormat("en-UK", { weekday: "short" }).format(lastEditDate);
        const lastEditDateString = dayName + " " + lastEditDate.toLocaleString();
        lastEditedTitle.innerText = `#${item.puzzle.id} : Last edited on ${lastEditDateString}`;

        // Create a span for the cell_concentration
        const cellConcSpan = document.createElement('span');
        cellConcSpan.textContent = `Cells : ${item.cell_concentration}%`;

        // Create a span for the clues present value
        const cluesPresentSpan = document.createElement('span');
        cluesPresentSpan.textContent = `Clues : ${item.clues_present}/${item.total_clues}`;

        // Create a span for the solutions present value
        const solutionsPresentSpan = document.createElement('span');
        solutionsPresentSpan.textContent = `Solutions : ${item.solutions_present}/${item.total_clues}`;
        solutionsPresentSpan.classList.add('mx-3');

        // Create a button to delete the puzzle
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        deleteButton.classList.add('btn', 'btn-danger', 'm-2');
        deleteButton.addEventListener('click', () => {
            if (confirm('Sure you want to delete it?')) {
                deletePuzzle(item.puzzle.id);
            };
        })

        // Create a button to mark the puzzle reviewed
        const reviewedButton = document.createElement('button');
        reviewedButton.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Reviewed';
        reviewedButton.classList.add('btn', 'btn-secondary', 'm-2');
        reviewedButton.addEventListener('click', () => {
            markPuzzleReviewed(item.puzzle.id);
        });

        // Create a button to mark the puzzle released
        const releasedButton = document.createElement('button');
        releasedButton.innerHTML = '<i class="fa-solid fa-thumbs-up"></i> Released';
        releasedButton.classList.add('btn', 'btn-success', 'm-2');
        releasedButton.addEventListener('click', () => {
            markPuzzleReleased(item.puzzle.id);
        });

        // Create a span to show complete status
        const completedSpan = document.createElement('span');
        completedSpan.innerText = item.puzzle.complete ? 'Completed' : 'Incomplete';
        completedSpan.style.color = item.puzzle.complete ? 'green' : 'red';
        completedSpan.classList.add('mx-2');

        // Create a span to show reviewed status
        const reviewedSpan = document.createElement('span');
        reviewedSpan.innerText = item.puzzle.reviewed ? 'Reviewed' : 'Unreviewed';
        reviewedSpan.style.color = item.puzzle.reviewed ? 'green' : 'red';
        reviewedSpan.classList.add('mx-2');

        // Create a span to show released status
        const releasedSpan = document.createElement('span');
        releasedSpan.innerText = item.puzzle.released ? 'Released' : 'Not released';
        releasedSpan.style.color = item.puzzle.released ? 'green' : 'red';
        releasedSpan.classList.add('mx-2');

        // Create a bootstrap column to hold all the puzzle details
        const col = document.createElement('div');
        col.classList.add('col-12', 'col-md-4', 'text-center');
        col.appendChild(lastEditedTitle);
        col.appendChild(cluesPresentSpan);
        col.appendChild(solutionsPresentSpan);
        col.appendChild(cellConcSpan);

        const readout = document.createElement('div');
        readout.classList.add('col-12', 'col-md-4', 'text-center');
        readout.appendChild(completedSpan);
        readout.appendChild(reviewedSpan);
        readout.appendChild(releasedSpan);

        col.appendChild(readout);

        // Create the grid thumbnail
        const container = createThumbnail(item.puzzle, item.clues);
        container.classList.add('mt-2');
        container.addEventListener('click', (e) => {
            redirectToPuzzleEditor(item.puzzle.id);
        });
        col.appendChild(container);
        col.appendChild(deleteButton);
        col.appendChild(reviewedButton);
        col.appendChild(releasedButton);
        col.appendChild(document.createElement('hr'));

        thumbnailHolder.appendChild(col);
        
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
    fetch(url, payload)
        .then(response => response.json())
        .then(json => console.log(json));
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
    fetch(url, payload)
        .then(response => response.json())
        .then(json => console.log(json));
}
