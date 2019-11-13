import pq from 'picasso-plugin-q';

var interactionsSetup = function(intDef, picassoprops, that) {
  "use strict";
  let rangeRef = '';
  var interactions = [{
    type: 'native',
    events: {
      mousedown: function(e) {
        that.lassoMouseUp = 0;
        // Use Alt-key + click to reset the brush
        /*  if (e.altKey) {
            this.chart.brush('highlight').end();
            this.chart.component('rangeY').emit('rangeClear');
            this.chart.component('rangeX').emit('rangeClear');
          }*/

        const overComp = this.chart.componentsFromPoint({
          x: e.clientX,
          y: e.clientY
        })[0];

        if (overComp.hasOwnProperty('dock')) {
          rangeRef = overComp && ~["left", "right"].indexOf(overComp.dock) ? 'rangeY' : 'rangeX';

          // Fetch the range component instance and trigger the start event
          //console.log(this.chart.component(rangeRef));
          if (typeof this.chart.component(rangeRef) != 'undefined') {
            this.chart.component(rangeRef).emit('rangeStart', mouseEventToRangeEvent(e));
          }
        } else {
          this.chart.component('lasso').emit('lassoStart', { center: { x: e.clientX, y: e.clientY } });
        }
      },
      mousemove: function(e) {
        if (typeof this.chart.component(rangeRef) != 'undefined') {
          this.chart.component(rangeRef).emit('rangeMove', mouseEventToRangeEvent(e));
        } else {
          this.chart.component('lasso').emit('lassoMove', { center: { x: e.clientX, y: e.clientY } });
        }
      },
      mouseup: function(e) {
        if (typeof this.chart.component(rangeRef) != 'undefined') {
          this.chart.component(rangeRef).emit('rangeEnd', mouseEventToRangeEvent(e));
          if (this.chart.hasOwnProperty('selectRangeValues') && this.chart.selectRangeValues.length > 0) {
            that.backendApi.selectRange(this.chart.selectRangeValues, true);
            this.chart.selectRangeValues = [];
          }
          rangeRef = '';
        } else {
          that.lassoMouseUp ++;
          this.chart.component('lasso').emit('lassoEnd', { center: { x: e.clientX, y: e.clientY } });
        }
      }
    }
  }];

  try { //Old charts dont have this property to switch on tooltip.
    if (picassoprops.tooltip.show) {
      interactions.push({
        type: 'native',
        events: {
          mousemove(e) {
            const tooltip = this.chart.component('tooltip-key');
            tooltip.emit('show', e);
          },
          mouseleave(e) {
            const tooltip = this.chart.component('tooltip-key');
            tooltip.emit('hide');
          }
        }
      });
    }
  }catch(e){

  }

  return interactions;
};

var mouseEventToRangeEvent = function(e) {
  return {
    center: {
      x: e.clientX,
      y: e.clientY
    },
    deltaX: e.movementX,
    deltaY: e.movementY
  };
}




var enableSelectionOnFirstDimension = function(that, chart, rangeBrush, lassoBrush, layout) {
  var chartRangeBrush = chart.brush(rangeBrush);
  var chartLassoBrush = chart.brush(lassoBrush);
  chartRangeBrush.on('start', () => {
    chartLassoBrush.end();
  });
  chartRangeBrush.on('update', (added, removed) => {
    var selection = pq.selections(chartRangeBrush)[0];
    if (selection.method === 'resetMadeSelections') {
      chartRangeBrush.end();
      that.backendApi.clearSelections();
    } else
    if (selection.method === 'selectHyperCubeValues') {
      if (selection.params[2].indexOf(-2) > -1) {
        selection.params[2] = selection.params[2].filter(function(e){e>=0});
      }
      if (selection.params[2].length > 0) {
        that.selectValues(selection.params[1], selection.params[2], false);
      }
    } else
    if (selection.method === 'rangeSelectHyperCubeValues') {
      if (chartRangeBrush.isActive) {
        chart.selectRangeValues = selection.params[1];
      }
    }
  });
  chartLassoBrush.on('start', () => {
    chartRangeBrush.end();
  }); 
  chartLassoBrush.on('update', (added, removed) => {
    var selection = pq.selections(chartLassoBrush)[0];
    if (selection.method === 'resetMadeSelections') {
      chartLassoBrush.end();
      that.backendApi.clearSelections();
    } else if (selection.method === 'selectHyperCubeValues') {
      if (selection.params[2].indexOf(-2) > -1) {
        selection.params[2] = selection.params[2].filter(function(e){e>=0});
      }
      if (selection.params[2].length > 0) {
        if (that.hasOwnProperty('lassoMouseUp') && that.lassoMouseUp >= 2) {
          that.selectValues(selection.params[1], selection.params[2], false);
        }
      }
    } 
  });
  return [chartRangeBrush, chartLassoBrush];
};

export {
  interactionsSetup,
  mouseEventToRangeEvent,
  enableSelectionOnFirstDimension
}
