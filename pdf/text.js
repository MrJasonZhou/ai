let objectCounter = 1;
let pageObjects = {};

function getTextHeight(obj) {
    return obj.height * obj.scaleY;
}

$('#add-text').click(function() {
    let text = new fabric.IText(`text_${objectCounter}`, {
        left: 10,
        top: 10,
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#333',
        lineHeight: 1.1,
        editable: true,
        backgroundColor: 'lightblue',
        id: `page${pageNum}_var${objectCounter}`,
        variableName: 'var' + objectCounter++,
        pdfFont: 'Arial',
        pdfFontSize: 16,
        customType: 'text'
    });
    fabricCanvas.add(text);
    updateObjectProperties(text);
    addObjectToPage(text);
});

$('#add-pic').click(function() {
    let pic = new fabric.Rect({
        left: 10,
        top: 10,
        fill: 'transparent',
        stroke: 'lightcoral',
        strokeWidth: 2,
        width: 100,
        height: 100,
        id: `page${pageNum}_var${objectCounter}`,
        variableName: 'var' + objectCounter++,
        customType: 'pic'
    });
    fabricCanvas.add(pic);
    updateObjectProperties(pic);
    addObjectToPage(pic);
});

$('#delete-object').click(function() {
    let activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.customType === 'text' || activeObject.customType === 'pic')) {
        fabricCanvas.remove(activeObject);
        removeObjectFromPage(activeObject);
    }
});

fabricCanvas.on('object:selected', function(e) {
    let activeObject = e.target;
    if (activeObject.customType === 'text' || activeObject.customType === 'pic') {
        updateObjectProperties(activeObject);
    }
});

fabricCanvas.on('mouse:down', function(e) {
    let activeObject = e.target;
    if (activeObject && (activeObject.customType === 'text' || activeObject.customType === 'pic')) {
        updateObjectProperties(activeObject);
    }
});

fabricCanvas.on('object:modified', function(e) {
    let activeObject = e.target;
    if (activeObject.customType === 'text') {
        activeObject.pdfFontSize = Math.round(activeObject.fontSize * activeObject.scaleY);
        updateObjectProperties(activeObject);
    }
});

$('#variable-name').change(function() {
    let activeObject = fabricCanvas.getActiveObject();
    if (activeObject && (activeObject.customType === 'text' || activeObject.customType === 'pic')) {
        activeObject.variableName = this.value;
        updateObjectProperties(activeObject);
    }
});

$('#font-name').change(function() {
    let activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.customType === 'text') {
        activeObject.pdfFont = this.value;
        updateObjectProperties(activeObject);
    }
});

$('#text-color').change(function() {
    let activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.customType === 'text') {
        activeObject.set({fill: this.value});
        fabricCanvas.renderAll();
        updateObjectProperties(activeObject);
    }
});

function updateObjectProperties(obj) {
    $('#variable-name').val(obj.variableName);
    $('#x-coord').text(Math.round(obj.left / scale));
    $('#y-coord').text(Math.round((canvas.height - obj.top - getTextHeight(obj)) / scale));
    if (obj.customType === 'text') {
        $('#font-name').val(obj.pdfFont);
        $('#font-size').text(Math.round(obj.pdfFontSize));
    }
    updateSavedObject(obj);
}

function updateSavedObject(obj) {
    let savedObjects = pageObjects[pageNum];
    if (savedObjects) {
        for (let i = 0; i < savedObjects.length; i++) {
            if (savedObjects[i].id === obj.id) {
                savedObjects[i] = createObject(obj);
                break;
            }
        }
    }
}

function createObject(obj) {
    let newObj = {
        id: obj.id,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        variableName: obj.variableName,
        customType: obj.customType,
    };
    if (obj.customType === 'text') {
        newObj.text = obj.text;
        newObj.fontFamily = obj.fontFamily;
        newObj.fontSize = obj.fontSize;
        newObj.pdfFont = obj.pdfFont;
        newObj.pdfFontSize = obj.pdfFontSize;
        newObj.fill = obj.fill;
    }
    return newObj;
}

// Populate the font name dropdown
fontNames.forEach(function(fontName) {
    $('#font-name').append(new Option(fontName, fontName));
});

function addObjectToPage(obj) {
    if (!pageObjects[pageNum]) {
        pageObjects[pageNum] = [];
    }
    pageObjects[pageNum].push(createObject(obj));
}

function removeObjectFromPage(obj) {
    let savedObjects = pageObjects[pageNum];
    if (savedObjects) {
        for (let i = 0; i < savedObjects.length; i++) {
            if (savedObjects[i].id === obj.id) {
                savedObjects.splice(i, 1);
                break;
            }
        }
    }
}

function loadObjectsForPage() {
    let savedObjects = pageObjects[pageNum];
    if (savedObjects) {
        for (let i = 0; i < savedObjects.length; i++) {
            let savedObj = savedObjects[i];
            if (savedObj.customType === 'text') {
                let text = new fabric.IText(savedObj.text, {
                    left: savedObj.left,
                    top: savedObj.top,
                    fontFamily: savedObj.fontFamily,
                    fontSize: savedObj.fontSize,
                    fill: savedObj.fill,
                    lineHeight: 1.1,
                    editable: true,
                    backgroundColor: 'lightblue',
                    id: savedObj.id,
                    variableName: savedObj.variableName,
                    pdfFont: savedObj.pdfFont,
                    scaleX: savedObj.scaleX,
                    scaleY: savedObj.scaleY,
                    width: savedObj.width,
                    height: savedObj.height,
                    customType: 'text'
                });
                fabricCanvas.add(text);
            } else if (savedObj.customType === 'pic') {
                let pic = new fabric.Rect({
                    left: savedObj.left,
                    top: savedObj.top,
                    fill: 'transparent',
                    stroke: 'lightcoral',
                    strokeWidth: 2,
                    width: savedObj.width,
                    height: savedObj.height,
                    id: savedObj.id,
                    variableName: savedObj.variableName,
                    scaleX: savedObj.scaleX,
                    scaleY: savedObj.scaleY,
                    customType: 'pic'
                });
                fabricCanvas.add(pic);
            }
        }
    }
}

function clearCanvas() {
    fabricCanvas.getObjects().forEach(function(object) {
        if (object.customType === 'text' || object.customType === 'pic') {
            fabricCanvas.remove(object);
        }
    });
}

$('#save').click(function() {
    let output = JSON.stringify(pageObjects);
    console.log(output);
});
