import { ipcRenderer } from 'electron';
import paper from 'paper';
import tablet_pressure from 'tablet_pressure';

/*
try {
    import aks from 'asynckeystate';
}
catch(err) {
    var aks = {
        getAsyncKeyState: function(code) {

        }
    };
}
*/

//window.paper = paper;
var previousDrawnPaths = [];
var currentDrawingPaths = [];

var colorDrawer = null;
var color = 'black';
var lastPoint = [];
var path = null;
var minPressure = 3.0;
var offPressure = 3.0;
var lastPressure = minPressure;
var canvas;

function parseColor() {
    color = this.style.backgroundColor;
}

function init() {
    colorDrawer = document.getElementsByClassName('colors')[0];
    canvas = document.getElementById("mycanvas");
    paper.setup(canvas);

    var tool = new paper.Tool();
    tool.minDistance = 10;

    tool.onMouseDown = function(event) {
        currentDrawingPaths = []

        path = new paper.Path();
        path.strokeColor = color;
        path.fullySelected = true;
        path.strokeJoin = 'round';
        path.add(event.point);
    };

    tool.onMouseDrag = function(event) {
        var pressure = minPressure + offPressure * Math.max(0, ipcRenderer.sendSync('get-pressure') / 2048.0);

        if (lastPressure != pressure && path.segments.length > 5) {
            pressure = lastPressure + Math.sign(pressure - lastPressure) * 0.5;

            var newPath = new paper.Path();
            newPath.strokeColor = color;
            newPath.strokeWidth = pressure;
            newPath.fullySelected = true;
            newPath.strokeJoin = 'round';

            for (var i = 0; i < lastPoint.length; ++i) {
                newPath.add(lastPoint[i]);
            }

            path.selected = false;
            path.smooth({ type: 'catmull-rom', factor: 0.5 });
            currentDrawingPaths.push(path);

            path = newPath;
            lastPressure = pressure;
        }
        else {
            path.strokeWidth = lastPressure;
        }

        path.add(event.point);

        if (lastPoint.length == 2)
        {
            lastPoint.splice(0);
        }
        lastPoint.push(event.point);
    };

    tool.onMouseUp = function(event) {
        path.selected = false;
        path.smooth({ type: 'catmull-rom', factor: 0.5 });
        currentDrawingPaths.push(path);
        path = null;

        previousDrawnPaths.push(currentDrawingPaths);
    };

    let checkKeys = setInterval(function() {
        if (tablet_pressure.keyState(0x11, 0x8000) && tablet_pressure.keyState(0x5A, 0x8000)) {
            var last = previousDrawnPaths.length - 1;
            if (last >= 0) {
                for (var i = 0; i < previousDrawnPaths[last].length; ++i)
                {
                    previousDrawnPaths[last][i].remove();
                }

                previousDrawnPaths.splice(last);
            }
        }
    }, 100);

    var colors = document.getElementsByClassName('color');
    for (var i = 0; i < colors.length; ++i) {
        colors[i].onmousedown = parseColor;
    }

    document.getElementsByClassName('pen')[0].onmousedown = function(e) {
        colorDrawer.style.display = 'block';
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    }

    document.addEventListener('mousedown', function() {
        colorDrawer.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', init);
