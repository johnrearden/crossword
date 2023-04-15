import { OPEN, CLOSED } from './crossword_grid.js';

document.addEventListener('DOMContentLoaded', () => {
    const url = '/builder/get_recent_puzzles/10/';
    fetch(url).then(response => response.json())
        .then(json => renderThumbnails(json))
});


const renderThumbnails = (json) => {
    const puzzleList = json.puzzles;
    const thumbnailHolder = document.getElementById('thumbnail-holder');
    for (let item of puzzleList) {
        const title = document.createElement('h6');
        const lastEditedTitle = document.createElement('h6');
        const createdDate = new Date(item.puzzle.created_on);
        let dayName = new Intl.DateTimeFormat("en-UK", { weekday: "short" }).format(createdDate);
        const createdDateString = dayName + " " + createdDate.toLocaleString();
        const lastEditDate = new Date(item.puzzle.created_on);
        dayName = new Intl.DateTimeFormat("en-UK", { weekday: "short" }).format(createdDate);
        const lastEditDateString = dayName + " " + createdDate.toLocaleString();
        title.innerText = `Created by ${item.puzzle.creator} on ${lastEditDateString}`;
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