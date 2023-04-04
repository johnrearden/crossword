document.addEventListener('DOMContentLoaded', () => {
    const url = '/builder/get_grid/';
    fetch(url).then(response => response.json())
              .then(json => drawGrid(json));
});


const drawGrid = (gridAsJSON) => {
    const width = gridAsJSON.width;
    const height = gridAsJSON.height;
    const cells = gridAsJSON.cells;

    const gridDiv = document.getElementById('grid-editor-div');
    gridDiv.style.setProperty('--grid-rows', height);
    gridDiv.style.setProperty('--grid-cols', width);

    for (let i = 0; i < cells.length; i++) {
        const cell = document.createElement('div');
        cell.classList.add(cells[i] === '#' ? 'open' : 'blank');
        if (cells[i] === '#') {
            const span = document.createElement('span');
            span.classList.add('numbered');
            span.innerText = i;
            
            cell.appendChild(span);
        }
        cell.addEventListener('click', () => {
            cell.classList.toggle('open');
            cell.classList.toggle('blank');
        });
        gridDiv.appendChild(cell);
    }
}