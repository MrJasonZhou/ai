let pdfDoc = null,
    pageNum = 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1.5,
    canvas = $('#pdf-canvas')[0],
    ctx = canvas.getContext('2d'),
    fabricCanvas = new fabric.Canvas('text-canvas', {
        backgroundColor: 'rgba(0,0,0,0)',
        selection: false
    });

// Get page info from document, resize canvas accordingly, and render page
function renderPage(num) {
    pageRendering = true;

    // Using promise to fetch the page
    pdfDoc.getPage(num).then(function(page) {
        let viewport = page.getViewport({scale: scale});
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        fabricCanvas.setHeight(viewport.height);
        fabricCanvas.setWidth(viewport.width);

        // Render PDF page into canvas context
        let renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        let renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    document.getElementById('page-num-label').textContent = `Page: ${num}`;  // Display the current page number
}

// If another page rendering in progress, waits until the rendering is
// finished. Otherwise, executes rendering immediately.
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

$('#prev-page').click(function() {
    if (pageNum <= 1) {
        return;
    }
    clearCanvas();
    pageNum--;
    loadObjectsForPage();
    renderPage(pageNum);
});

$('#next-page').click(function() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    clearCanvas();
    pageNum++;
    loadObjectsForPage();
    renderPage(pageNum);
});

$('#file-input').change(function(e) {
    let file = e.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error(file.name, 'is not a .pdf file.');
        return;
    }
    let fileReader = new FileReader();
    fileReader.onload = function() {
        let typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            pageNum = 1;
            textCounter = 1;
            pageTexts = {};
            renderPage(pageNum);
        });
    };
    fileReader.readAsArrayBuffer(file);
});

$('#create-json').click(function() {
    let jsonData = [];
    Object.keys(pageObjects).forEach(function(pageNum) {
        let pageData = {
            pageNo: parseInt(pageNum),
            fields: []
        };
        pageObjects[pageNum].forEach(function(object) {
            if (object.customType === 'text') {
                let textHeight = getTextHeight(object);  // Use the new function to get text height
                pageData.fields.push({
                    type: 'text',
                    variableName: object.variableName,
                    pdfFont: object.pdfFont,
                    fontSize: Math.round(object.pdfFontSize),
                    x: Math.round(object.left / scale),
                    y: Math.round((fabricCanvas.getHeight() - object.top - textHeight) / scale),
                    fontColor: object.fill,
                    content: object.text
                });
            } else if (object.customType === 'pic') {
                pageData.fields.push({
                    type: 'pic',
                    variableName: object.variableName,
                    x: Math.round(object.left / scale),
                    y: Math.round((fabricCanvas.getHeight() - object.top - object.height * object.scaleY) / scale)
                });
            }
        });
        jsonData.push(pageData);
    });
    $('#json-display-area').html(JSON.stringify(jsonData));
});




