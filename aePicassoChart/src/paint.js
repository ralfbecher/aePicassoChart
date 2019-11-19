import picasso from 'picasso.js';
// import pq from 'picasso-plugin-q';
import bp from './buildpicasso.js';

var qlik = window.require('qlik');

var createPicassoWithStyle = function(self, layout, qTheme) {
  //Default Theme
  var style = {
    '$font-family': '"QlikView Sans", sans-serif',
  };

  //Font
  try {
    if (!layout.picassoprops.theme.fontauto) {
      style['$font-family'] = layout.picassoprops.theme.fontfamily;
    }
  } catch (err) {

  }

  //Font Size
  try {
    if (!layout.picassoprops.theme.fontsizeauto) {
      if (typeof layout.picassoprops.theme.fontsize == 'undefined') {
        //Set Nothing
      } else {
        style['$font-size'] = layout.picassoprops.theme.fontsize + "px";
      }
    } else {
      if (qTheme != null) style['$font-size'] = qTheme.getStyle('fontSize', '', '');
    }
  } catch (err) {
    if (qTheme != null) style['$font-size'] = qTheme.getStyle('fontSize', '', '');
  }

  //Font Size Large
  try {
    if (!layout.picassoprops.theme.fontsizeauto) {
      if (typeof layout.picassoprops.theme.fontsizelarge == 'undefined') {
        //Set Nothing
      } else {
        style['$font-size--l'] = layout.picassoprops.theme.fontsizelarge + "px";
      }
    } else {
      if (qTheme != null) style['$font-size--l'] = qTheme.getStyle('object', 'legend.title', 'fontSize');
    }
  } catch (err) {
    if (qTheme != null) style['$font-size--l'] = qTheme.getStyle('object', 'legend.title', 'fontSize');
  }

  //Font Color
  try {
    if (!layout.picassoprops.theme.fontcolorauto) {
      if (typeof layout.picassoprops.theme.fontcolor == 'undefined') {
        //Set Nothing
      } else {
        style['$font-color'] = layout.picassoprops.theme.fontcolor.color;
      }
    } else {
      if (qTheme != null) style['$font-color'] = qTheme.getStyle('object', 'label.name', 'color');
    }
  } catch (err) {
    if (qTheme != null) style['$font-color'] = qTheme.getStyle('object', 'label.name', 'color');
  }


  if (qTheme != null) {
    //style['$font-color'] = qTheme.getStyle('object','label.name','color');

    style['$guide-color'] = qTheme.getStyle('object', 'grid.line.major', 'color');
    style['$shape'] = {
      fill: qTheme.getStyle('dataColors', '', 'primaryColor'),
      strokeWidth: 0,
      stroke: qTheme.getStyle('dataColors', '', 'primaryColor')
    };
  }
  //console.log(style);
  self.pic = picasso({
    renderer: {
      prio: ['canvas']
    },
    style: style
  });
};


var redrawChart = function($element, layout, self, first) {

  if (qlik.navigation.getMode() == 'edit' || first) {

    var collectionsDef = bp.createCollections(layout.qHyperCube);
    var scalesDef = bp.createScales(layout.picassoprops.scalesDef);
    var componentsDef = bp.createComponents(layout.picassoprops, layout.qHyperCube); //We need more than just the componentsdef so send whole picassoprops
    var interactionsDef = bp.interactionsSetup({}, layout.picassoprops, self);


    var settings = {
      collections: collectionsDef,
      scales: scalesDef,
      components: componentsDef,
      interactions: interactionsDef
    };
    //console.log(JSON.stringify(settings));

    /*****************************************************************************************************
    /*** Having to recreate the chart as when updating the settings the line layer does not refresh (might be bug in picasso)
    /*****************************************************************************************************/

    if (!self.hasOwnProperty('chart')) {
      self.chart = self.pic.chart({
        element: $element.find('.lrp')[0],
        settings: settings
      });
    } else {
      self.chart.update({
        settings: settings
      });  
    }

    self.chartBrush = bp.enableSelectionOnFirstDimension(self, self.chart, 'highlight', 'lasso', layout);
  }
};

var getDataPages = function(qlik, layout, enigmaModel, maxPages) {
  var pageWidth = Math.max(1, layout.qHyperCube.qSize.qcx),
    pageHeight = Math.floor(10000 / pageWidth),
    cubeSize = layout.qHyperCube.qSize.qcy,
    remainingPages = Math.min((cubeSize / pageHeight), maxPages),
    cubeData = [];

    var dataPages = [];
    for (var i = 0; i < remainingPages; i++) {
      dataPages.push({
        qTop: pageHeight * i,
        qLeft: 0,
        qWidth: pageWidth,
        qHeight: pageHeight
      });
    }

    var objectId = layout.qExtendsId ? layout.qExtendsId : 
      (layout.sourceObjectId ? layout.sourceObjectId : layout.qInfo.qId);
    
    return enigmaModel.app.getObject(objectId).then(function (obj) {
      var promises = dataPages.map(function (page) {
        return obj.getHyperCubeData('/qHyperCubeDef', [page]);
      });
      return qlik.Promise.all(promises).then(function (pages) {
        pages.forEach(function (page) {
          cubeData = cubeData.concat(page[0].qMatrix);
        });
        return cubeData;
      });
    });
}

var updateData = function(qlik, self, layout, enigma, maxPages) {
  if (!maxPages || maxPages <= 0) maxPages = 1;
  getDataPages(qlik, layout, enigma, maxPages)
  .then(data => {
    layout.qHyperCube.qDataPages[0].qMatrix = data;
    if (data.length > 0) {
      layout.qHyperCube.qDataPages[0].qArea.qWidth = data[0].length;
    } else {
      layout.qHyperCube.qDataPages[0].qArea.qWidth = 0;
    }
    layout.qHyperCube.qDataPages[0].qArea.qHeight = data.length;

    self.chart.update({
      data: [{
        type: 'q',
        key: 'qHyperCube',
        data: layout.qHyperCube
      }]
    });

    if (layout.showDataPointHint) {
      var footnote = "";
      if (layout.qHyperCube.qSize.qcy > data.length) {
        footnote = layout.footnote = data.length + ' of ' + layout.qHyperCube.qSize.qcy;
      } else {
        footnote = layout.qHyperCube.qSize.qcy;
      }
      layout.footnote = footnote + ' data points shown..';
    }
  
  });
};

export default function($element, layout) {
  var self = this;
  self.enigma = $element.scope().model.enigmaModel;
  // self.objId = layout.qInfo.qId;
  bp.setProps(layout);
  //Theme Processing
  var app = qlik.currApp(this);
  //console.log(app.theme);
  try{
    var theme = app.theme.getApplied().then(function(qtheme) {
      if (typeof layout.theme == 'undefined') layout.theme = qtheme;
      if (layout.theme.id != qtheme.id || bp.props == null) {
        layout.theme = qtheme;
        bp.setProps(layout);
        //console.log(qtheme.getStyle('object', 'label.name', 'color'));
        //console.log(qtheme);
        createPicassoWithStyle(self, layout, qtheme);
        redrawChart($element, layout, self, true);
      }

    });
  }catch(e){
    console.log("Could not load theme");
  }

  /*this.backendApi.setCacheOptions({
    enabled: false
  });*/

  layout.picassoprops.fieldOptions = bp.optionsListForFields(layout.qHyperCube);
  //console.log(layout);

  var first = false;
  if (typeof this.chart == 'undefined') {

    //if()

    //$element.empty();
    //$element.html('<div class="lrp" style="height:100%;position:relative;"></div>');

    var style = {
      '$font-family': '"QlikView Sans", sans-serif',
      '$font-color': "#ff0000"
    };

    self.pic = picasso({
      style: style
    });


    /*self.chart = self.pic.chart({
      element: $element.find('.lrp')[0]
    });*/
    first = true;


  }
  createPicassoWithStyle(self, layout, null);
  redrawChart($element, layout, self, first);
  updateData(qlik, self, layout, self.enigma, qlik.navigation.getMode() === 'edit'? 1 : layout.dataPages);
  
  return new qlik.Promise(function(resolve, reject) {
    if (self.chartBrush[0].isActive) self.chartBrush[0].end();
    if (self.chartBrush[1].isActive) self.chartBrush[1].end();
    setTimeout(function () {
      resolve();
    }, 400);
  });
}
