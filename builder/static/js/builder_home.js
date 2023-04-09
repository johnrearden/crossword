document.addEventListener('DOMContentLoaded', () => {
    const url = '/builder/get_recent_puzzles/1/';
    fetch(url).then(response => response.json())
              .then(json => renderThumbnails(json))
});

const renderThumbnails = (json) => {
    const thumbnailHolder = document.getElementById('thumbnail-holder');
    const out = JSON.stringify(json, null, 2);
    thumbnailHolder.innerHTML = `<pre>${out}</pre`;
}